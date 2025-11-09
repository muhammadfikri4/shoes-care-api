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
  PaymentPayload,
  ProductItem,
  ScanQRDTO,
  TransactionListFilterDTO,
  VerifyPromoDTO,
} from "./transactions.dto";
import {
  completeTransactionAtomicRepo,
  countCompletedTransactionsByUserSinceRepo,
  countFilteredTransactionsRepo,
  createTransactionAtomicRepo,
  findTransactionDetailByInvoiceRepo,
  getTransactionById,
  getTransactionByInvoiceRepo,
  listFilteredTransactionsRepo,
  pickupTransactionAtomicRepo,
  readyToPickupAtomicRepo,
} from "./transactions.repository";

import { config } from "../../libs";
import {
  SendPromoCodeEmail,
  SendReadyToPickupEmail,
  SendTransactionNotificationEmail,
} from "../../utils/MailerConfig";
import { createMidtransTransaction } from "../../utils/midtrans";
import * as promoRepository from "../promos/promos.repository";
import * as userRepository from "../users/users.repository";
import { getDetailTransactionDTOMapper } from "./transaction.mapper";
import { TransactionIdDTO } from "./transactions.dto";
import { uploadItemFiles } from "./transactions.utils";

// No direct prisma usage in service; repository handles DB

interface EnsureTransactionDTO {
  status: PaymentStatus;
  token?: string | null;
  redirectUrl?: string | null;
}

const generateCode = () => `TRX-${+new Date()}`;

export const ensureCustomer = async (data: CreateTransactionDTO) => {
  const email = data.customerEmail?.trim();
  let customerUserId: string | undefined;
  const name = data.customerName?.trim();
  const phone = data.customerPhone?.trim();

  if (email) {
    // Cek apakah email sudah terdaftar sebagai user
    const existingUser = await userRepository.getUserByEmail(email);

    if (existingUser) {
      // Jika user adalah ADMIN atau SUPERADMIN, return error
      if (existingUser.role === 'ADMIN' || existingUser.role === 'SUPERADMIN') {
        throw new ErrorApp(
          "Email ini terdaftar sebagai admin. Gunakan email lain untuk customer.",
          400,
          MESSAGE_CODE.BAD_REQUEST
        );
      }
      // Jika user sudah ada sebagai CUSTOMER, gunakan ID-nya
      customerUserId = existingUser.id;
    } else {
      // Jika belum ada, buat user baru dengan role CUSTOMER
      const user = await userRepository.upsertCustomerByEmail(email, name);
      customerUserId = user.id;
    }
  }

  return { customerUserId, name, email, phone };
};

export const createTransaction = async (data: CreateTransactionDTO, createdByUserId?: string) => {
  const { customerUserId, email, name, phone } = await ensureCustomer(data);
  const code = generateCode();

  const rawItems: ProductItem[] = data?.items || [];
  let uploadedItems: ProductItem[] = [];
  if (rawItems.length) {
    const uploadResult = await uploadItemFiles(customerUserId, rawItems, code);
    if (uploadResult instanceof ErrorApp) return uploadResult;
    const itemsData: ProductItem[] = uploadResult.itemsData;
    uploadedItems = itemsData.map((it: ProductItem) => {
      return {
        name: it.name,
        price: Number(it.price || 0),
        estimateDay: Number(it.estimateDay || 0),
        file: it.file,
        note: it.note || undefined,
        rackId: it.rackId,
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
    if (!promo || (customerUserId && promo.userId !== customerUserId)) {
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
    if (isNaN(Number(data.cashPaid))) {
      return new ErrorApp(
        "Jumlah uang tunai belum diisi",
        400,
        MESSAGE_CODE.BAD_REQUEST
      );
    }
    if (Number(data.cashPaid) < finalPrice) {
      return new ErrorApp(
        "Uang tunai tidak cukup",
        400,
        MESSAGE_CODE.BAD_REQUEST
      );
    }
  }

  // 6) Prepare invoice (use code) + QR data (must match scanner parser: qr-{code})
  const qrData = `qr-${code}`;

  const ensureTransaction: EnsureTransactionDTO = {
    status: PaymentStatus.PENDING,
    token: null,
    redirectUrl: "",
  };
  const payment: PaymentPayload = {
    cashChange: 0,
    cashPaid: 0,
    paidAt: undefined,
  };
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
      order_id: code,
    },
    callbacks: {
      finish: `${config.CLIENT_URL}`,
      error: `${config.CLIENT_URL}`,
      pending: `${config.CLIENT_URL}`,
    },
  };

  if (data.paymentMethod === PaymentMethod.QRIS) {
    const snap = await createMidtransTransaction(midtransPayload);
    if (snap instanceof ErrorApp) return snap;
    if (snap?.data?.token) ensureTransaction.token = snap?.data?.token;
    if (snap?.data?.redirect_url)
      ensureTransaction.redirectUrl = snap?.data?.redirect_url;
  } else if (data.paymentMethod === PaymentMethod.CASH) {
    ensureTransaction.status = PaymentStatus.PAID;
    payment.paidAt = new Date();
    payment.cashPaid = data.cashPaid ?? 0;
    payment.cashChange = Math.max(0, (payment.cashPaid || 0) - finalPrice);
  }
  // 8) Persist transaction atomically
  const created = await createTransactionAtomicRepo({
    createdByUserId,
    customerUserId,
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
    paidAt: payment.paidAt,
    cashPaid: payment.cashPaid,
    cashChange: payment.cashChange,
    midtransToken: ensureTransaction.token || undefined,
    midtransRedirectUrl: ensureTransaction.redirectUrl || undefined,
  });

  // 9) Check eligibility for awarding a new promo (10x completed since last used or none)
  if (customerUserId) {
    const lastUsed = await promoRepository.getLastUsedPromoByUserRepo(customerUserId);
    const completedCount = await countCompletedTransactionsByUserSinceRepo(
      customerUserId,
      lastUsed?.usedAt ?? undefined
    );
    if (completedCount >= 1) {
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
          userId: customerUserId,
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
      const trackingBase = config.CLIENT_URL;
      const trackingUrl = trackingBase
        ? `${trackingBase}/my/transactions/${created.id}`
        : undefined;
      await SendTransactionNotificationEmail({
        to: email,
        name,
        code,
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

export const listTransactionsByUser = async (
  userId: string,
  query: TransactionListFilterDTO = {}
) => {
  // Langsung gunakan userId sebagai customerUserId
  const q: TransactionListFilterDTO = { ...query, customerUserId: userId };
  const { page = "1", perPage = "10" } = q;
  const [rows, total] = await Promise.all([
    listFilteredTransactionsRepo(q),
    countFilteredTransactionsRepo(q),
  ]);
  const meta = Meta(Number(page), Number(perPage), total);
  return { data: rows, meta };
};

export const scanPickup = async (data: ScanQRDTO) => {
  // qr expected format qr-{invoice}
  if (!data.qr.startsWith("qr-")) {
    return new ErrorApp("QR tidak valid", 400, MESSAGE_CODE.BAD_REQUEST);
  }
  const invoice = data.qr.substring(3); // Remove "qr-" prefix
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
    rackId: (trx.items || [])[0]?.rackId,
    previousStatus: trx.status,
  });
  return { ok: true };
};

export const lookupTransaction = async (params: {
  qr?: string;
  code?: string;
}) => {
  let code: string | undefined = params.code;
  console.log({ params });
  if (params.qr && !code) {
    if (params.qr.startsWith("qr-")) {
      code = params.qr.substring(3); // Remove "qr-" prefix
    } else {
      return new ErrorApp("QR tidak valid", 400, MESSAGE_CODE.BAD_REQUEST);
    }
  }
  if (!code) {
    return new ErrorApp(
      "Parameter invoice atau qr diperlukan",
      400,
      MESSAGE_CODE.BAD_REQUEST
    );
  }
  const trx = await findTransactionDetailByInvoiceRepo(code);
  if (!trx)
    return new ErrorApp(
      "Transaksi tidak ditemukan",
      404,
      MESSAGE_CODE.NOT_FOUND
    );
  const safeUserId = trx.customerUserId ?? "guest";
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
export const getDetailTransaction = async (transactionId: string) => {
  const trx = await getTransactionById(transactionId);
  if (!trx)
    return new ErrorApp(
      "Transaksi tidak ditemukan",
      404,
      MESSAGE_CODE.NOT_FOUND
    );
  const safeUserId = trx.customerUserId ?? "guest";
  return getDetailTransactionDTOMapper(safeUserId, trx);
};

export const verifyPromo = async (data: VerifyPromoDTO) =>
  verifyPromoService(data.email, data.code);

export const markReadyToPickup = async (data: TransactionIdDTO) => {
  const trx = await getTransactionById(data.id);
  if (!trx)
    return new ErrorApp(
      "Transaksi tidak ditemukan",
      404,
      MESSAGE_CODE.NOT_FOUND
    );
  if (trx.status !== TransactionStatus.IN_PROGRESS)
    return new ErrorApp(
      "Status tidak valid. Hanya IN_PROGRESS yang bisa diubah ke READY_FOR_PICKUP",
      400,
      MESSAGE_CODE.BAD_REQUEST
    );
  await readyToPickupAtomicRepo({ id: trx.id, previousStatus: trx.status });
  try {
    if (trx.customerEmail) {
      const trackingBase = config.CLIENT_URL;
      const trackingUrl = trackingBase
        ? `${trackingBase}?invoice=${encodeURIComponent(trx.code)}`
        : undefined;
      await SendReadyToPickupEmail({
        to: trx.customerEmail,
        name: trx.customerName || undefined,
        code: trx.code,
        qrData: trx.qrCodeData,
        trackingUrl,
      });
    }
  } catch (e) {
    console.warn("Failed to send ready-to-pickup email:", e);
  }
  return { ok: true };
};

export const markCompleted = async (data: TransactionIdDTO) => {
  const trx = await getTransactionById(data.id);
  if (!trx)
    return new ErrorApp(
      "Transaksi tidak ditemukan",
      404,
      MESSAGE_CODE.NOT_FOUND
    );
  if (trx.status !== TransactionStatus.READY_TO_PICKUP)
    return new ErrorApp(
      "Status tidak valid. Hanya READY_FOR_PICKUP yang bisa diubah ke COMPLETED",
      400,
      MESSAGE_CODE.BAD_REQUEST
    );
  const rackIds = (trx.items || [])
    .map((it) => it.rackId)
    .filter((v: string | null | undefined) => !!v) as string[];
  await completeTransactionAtomicRepo({
    id: trx.id,
    previousStatus: trx.status,
    rackIds,
  });
  return { ok: true };
};
