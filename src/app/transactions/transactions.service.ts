import {
  PaymentMethod,
  PaymentStatus,
  TransactionStatus,
} from "@prisma/client";
import { MESSAGE_CODE } from "../../utils/error-code";
import { ErrorApp } from "../../utils/http-error";
import { Meta } from "../../utils/Meta";
import { GetPublicURL } from "../../utils/upload-file-to-storage";
// repositories and helpers are used in utils
import { verifyPromoService } from "../promos/promos.service";
import {
  CreateTransactionDTO,
  MidtransCreationDTO,
  ProductItem,
  ScanQRDTO,
  TransactionListFilterDTO,
  VerifyPromoDTO,
} from "./transactions.dto";
import {
  countCompletedTransactionsByUserSinceRepo,
  countFilteredTransactionsRepo,
  createTransactionAtomicRepo,
  findTransactionDetailByInvoiceRepo,
  getTransactionByInvoiceRepo,
  listFilteredTransactionsRepo,
  listTransactionsByUserRepo,
  pickupTransactionAtomicRepo,
} from "./transactions.repository";

import { config } from "../../libs";
import {
  SendPromoCodeEmail,
  SendTransactionNotificationEmail,
} from "../../utils/MailerConfig";
import { createMidtransTransaction } from "../../utils/midtrans";
import * as customerRepository from "../customers/customers.repository";
import * as promoRepository from "../promos/promos.repository";
import * as userRepository from "../users/users.repository";
import { uploadItemFiles } from "./transactions.utils";

// No direct prisma usage in service; repository handles DB

interface EnsureTransactionDTO {
  status: PaymentStatus;
  token?: string | null;
  redirectUrl?: string | null;
}

const generateCode = () => `TRX-${+new Date()}`;

export const createTransaction = async (data: CreateTransactionDTO) => {
  // 1) Ensure customer (create if not exists) but do not error if exists
  let userId: string | undefined;
  let customerId: string | undefined;
  const email = data.customerEmail?.trim();
  const name = data.customerName?.trim();
  const phone = data.customerPhone?.trim();
  if (email) {
    const existingCustomer = await customerRepository.getCustomerByEmail(email);
    if (existingCustomer) {
      customerId = existingCustomer.id;
      userId = existingCustomer.userId;
    } else {
      const user = await userRepository.upsertCustomerByEmail(email, name);
      userId = user.id;
      const created = await customerRepository.createCustomerRepo({
        userId: user.id,
        name: user.name,
        phone,
      });
      customerId = created.id;
    }
  }

  // 2) Generate unique code (used as invoice and upload filename prefix)
  const code = generateCode();

  // 3) Build items payload and upload photos (if any)
  const rawItems: ProductItem[] = data?.items || [];
  let uploadedItems: ProductItem[] = [];
  if (rawItems.length) {
    const uploadResult = await uploadItemFiles(userId, rawItems, code);
    if (uploadResult instanceof ErrorApp) return uploadResult;
    const itemsData: ProductItem[] = uploadResult.itemsData;
    uploadedItems = itemsData.map((it: ProductItem) => {
      return {
        name: it.name,
        price: Number(it.price || 0),
        estimateDay: Number(it.estimateDay || 0),
        file: it.file,
        note: it.note || undefined,
      };
    });
  }

  // 4) Compute base and final price
  let finalPrice = uploadedItems.reduce(
    (acc, it) => acc + (Number(it.price) || 0),
    0
  );
  let promoApplied = false;
  let promoIdToUse: string | undefined;
  let discountPercent = 0;
  if (data.promoCode) {
    if (!email)
      return new ErrorApp(
        "Email diperlukan untuk menggunakan promo",
        400,
        MESSAGE_CODE.BAD_REQUEST
      );
    const validation = await verifyPromoService(email, data.promoCode);
    if (validation instanceof ErrorApp) return validation;
    const promo = await promoRepository.getPromoByCodeRepo(data.promoCode);
    if (!promo || (userId && promo.userId !== userId)) {
      return new ErrorApp(
        "Kode promo tidak valid",
        400,
        MESSAGE_CODE.BAD_REQUEST
      );
    }
    promoApplied = true;
    promoIdToUse = promo.id;
    discountPercent = promo.discountPercent ?? 100;
    finalPrice = Math.max(
      0,
      Math.floor((finalPrice * (100 - discountPercent)) / 100)
    );
  }

  // 5) Validate payment if CASH
  if (data.paymentMethod === PaymentMethod.CASH) {
    if (typeof data.cashPaid !== "number") {
      return new ErrorApp(
        "Jumlah uang tunai belum diisi",
        400,
        MESSAGE_CODE.BAD_REQUEST
      );
    }
    if (data.cashPaid < finalPrice) {
      return new ErrorApp(
        "Uang tunai tidak cukup",
        400,
        MESSAGE_CODE.BAD_REQUEST
      );
    }
  }

  // 6) Prepare invoice (use code) + QR data
  const invoice = code; // use simple code as invoice
  const qrData = `sc-pos:tx:${invoice}`;

  const ensureTransaction: EnsureTransactionDTO = {
    status: PaymentStatus.PENDING,
    token: null,
    redirectUrl: "",
  };
  let paidAt: Date | undefined;
  let cashPaid: number | undefined;
  let cashChange: number | undefined;
  const midtransPayload: MidtransCreationDTO = {
    customer_details: {
      email,
      name,
    },
    item_details: data.items?.map((item) => ({
      name: item.name,
      quantity: 1,
      price: Number(item.price),
    })),
    transaction_details: {
      gross_amount: finalPrice,
      order_id: generateCode(),
    },
  };
  console.log({ finalPrice });

  if (data.paymentMethod === PaymentMethod.QRIS) {
    const snap = await createMidtransTransaction(midtransPayload);
    if (snap instanceof ErrorApp) return snap;
    if (snap?.data?.token) ensureTransaction.token = snap?.data?.token;
    if (snap?.data?.redirect_url)
      ensureTransaction.redirectUrl = snap?.data?.redirect_url;
  } else if (data.paymentMethod === PaymentMethod.CASH) {
    ensureTransaction.status = PaymentStatus.PAID;
    paidAt = new Date();
    cashPaid = data.cashPaid ?? 0;
    cashChange = Math.max(0, (cashPaid || 0) - finalPrice);
  }
  // 8) Persist transaction atomically
  const created = await createTransactionAtomicRepo({
    userId,
    customerId,
    basePrice: finalPrice,
    finalPrice,
    promoApplied,
    code,
    qrCodeData: qrData,
    customerName: name,
    customerEmail: email,
    customerPhone: phone,
    paymentMethod: data.paymentMethod,
    items: uploadedItems,
    promoIdToUse,
    paymentStatus: ensureTransaction.status,
    paidAt,
    cashPaid,
    cashChange,
    midtransToken: ensureTransaction.token || undefined,
    midtransRedirectUrl: ensureTransaction.redirectUrl || undefined,
  });

  // 9) Check eligibility for awarding a new promo (10x completed since last used or none)
  if (userId) {
    const lastUsed = await promoRepository.getLastUsedPromoByUserRepo(userId);
    const completedCount = await countCompletedTransactionsByUserSinceRepo(
      userId,
      lastUsed?.usedAt ?? undefined
    );
    if (completedCount >= 10) {
      const genCode = () =>
        `PROMO-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      let c = genCode();
      for (let i = 0; i < 2; i++) {
        const exists = await promoRepository.getPromoByCodeRepo(c);
        if (!exists) break;
        c = genCode();
      }
      try {
        const newPromo = await promoRepository.createPromoRepo({
          userId,
          code: c,
          discountPercent: 100,
        });
        if (email)
          await SendPromoCodeEmail(
            email,
            name || "",
            newPromo.code,
            newPromo.discountPercent ?? 100
          );
      } catch (e) {
        console.warn("Failed to issue promo:", e);
      }
    }
  }

  // 10) Send transaction notification email with QR code and tracking button
  try {
    if (email) {
      const trackingBase = config.MIDTRANS.FINISH_URL;
      const trackingUrl = trackingBase
        ? `${trackingBase}?invoice=${encodeURIComponent(invoice)}`
        : undefined;
      await SendTransactionNotificationEmail({
        to: email,
        name,
        invoice,
        qrData,
        trackingUrl,
        amount: finalPrice,
        paymentMethod: data.paymentMethod,
        midtransUrl: ensureTransaction.redirectUrl || undefined,
      });
    }
  } catch (e) {
    console.warn("Failed to send notification email:", e);
  }

  return {
    id: created.id,
    code: created.code,
    price: created.price,
    finalPrice: created.finalPrice,
    promoApplied: created.promoApplied,
    paymentMethod: created.paymentMethod,
    paymentStatus: created.paymentStatus,
    midtransToken: created.midtransToken,
    midtransRedirectUrl: created.midtransRedirectUrl
      ? `${created.midtransRedirectUrl}#/gopay-qris`
      : undefined,
    qrCodeData: created.qrCodeData,
    createdAt: created.createdAt,
  };
};

export const listTransactions = async (
  query: TransactionListFilterDTO = {}
) => {
  const { page = "1", perPage = "10" } = query;
  const [rows, total] = await Promise.all([
    listFilteredTransactionsRepo(query),
    countFilteredTransactionsRepo(query),
  ]);
  const meta = Meta(Number(page), Number(perPage), total);

  return { data: rows, meta };
};

export const listTransactionsByUser = async (userId: string) =>
  listTransactionsByUserRepo(userId);

export const scanPickup = async (data: ScanQRDTO) => {
  // qr expected format sc-pos:tx:{invoice}
  const parts = data.qr.split(":");
  if (parts.length !== 3 || parts[0] !== "sc-pos" || parts[1] !== "tx") {
    return new ErrorApp("QR tidak valid", 400, MESSAGE_CODE.BAD_REQUEST);
  }
  const invoice = parts[2];
  const trx = await getTransactionByInvoiceRepo(invoice);
  if (!trx)
    return new ErrorApp(
      "Transaksi tidak ditemukan",
      404,
      MESSAGE_CODE.NOT_FOUND
    );
  if (trx.status === TransactionStatus.COMPLETED) {
    return new ErrorApp(
      "Transaksi sudah diambil",
      400,
      MESSAGE_CODE.BAD_REQUEST
    );
  }
  await pickupTransactionAtomicRepo({
    id: trx.id,
    rackId: trx.rackId,
    previousStatus: trx.status,
  });
  return { ok: true };
};

export const lookupTransaction = async (params: {
  qr?: string;
  invoice?: string;
}) => {
  let invoice: string | undefined = params.invoice;
  if (params.qr && !invoice) {
    const parts = params.qr.split(":");
    if (parts.length === 3 && parts[0] === "sc-pos" && parts[1] === "tx") {
      invoice = parts[2];
    } else {
      return new ErrorApp("QR tidak valid", 400, MESSAGE_CODE.BAD_REQUEST);
    }
  }
  if (!invoice) {
    return new ErrorApp(
      "Parameter invoice atau qr diperlukan",
      400,
      MESSAGE_CODE.BAD_REQUEST
    );
  }
  const trx = await findTransactionDetailByInvoiceRepo(invoice);
  if (!trx)
    return new ErrorApp(
      "Transaksi tidak ditemukan",
      404,
      MESSAGE_CODE.NOT_FOUND
    );
  const safeUserId = trx.userId ?? "guest";
  return {
    id: trx.id,
    invoice: trx.code,
    status: trx.status,
    price: trx.price,
    finalPrice: trx.finalPrice,
    promoApplied: trx.promoApplied,
    customerName: trx.customerName,
    customerEmail: trx.customerEmail,
    createdAt: trx.createdAt,
    updatedAt: trx.updatedAt,
    items:
      trx.items?.map((it) => ({
        id: it.id,
        name: it.name,
        price: it.price,
        photoUrl: it.file
          ? GetPublicURL(`transactions/shoes/${safeUserId}/${it.file}`)
          : undefined,
      })) ?? [],
    history:
      trx.TransactionHistory?.map((h) => ({
        id: h.id,
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        note: h.note,
        changedAt: h.changedAt,
      })) ?? [],
  };
};

export const verifyPromo = async (data: VerifyPromoDTO) =>
  verifyPromoService(data.email, data.code);
