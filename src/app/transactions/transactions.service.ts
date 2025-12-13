import {
  PaymentMethod,
  Role,
  TransactionItemStatus,
  TransactionStatus,
} from "@prisma/client";
import QRCode from "qrcode";
import { MESSAGE_CODE } from "../../utils/error-code";
import { ErrorApp } from "../../utils/http-error";
import { Meta } from "../../utils/Meta";
import {
  GetPublicURL,
  UploadFileToStorage,
} from "../../utils/upload-file-to-storage";
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
  countFilteredTransactionsRepo,
  createTransactionAtomicRepo,
  findTransactionDetailByInvoiceRepo,
  getTransactionByCodeRepo,
  getTransactionById,
  listFilteredTransactionsRepo,
  pickupTransactionAtomicRepo,
  readyToPickupAtomicRepo,
  updateAllTransactionItemsStatusRepo,
  updateTransactionItemStatusRepo,
} from "./transactions.repository";

import { config } from "../../libs";
import {
  SendCompletedEmail,
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

const generateCode = () => `TRX-${+new Date()}`;

export const checkAndIssuePromoIfEligible = async (
  customerUserId: string,
  email: string,
  name?: string
) => {
  try {
    const customer = await userRepository.getUserById(customerUserId);
    if (!customer) {
      console.log("[Promo] Customer not found:", customerUserId);
      return;
    }

    const threshold = await promoRepository.getPromoThresholdRepo();

    if (customer.promoEligibilityCount >= threshold) {
      console.log("[Promo] Customer is eligible! Issuing promo...");

      const genCode = () =>
        `PROMO-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      let c = genCode();
      for (let i = 0; i < 2; i++) {
        const exists = await promoRepository.getPromoByCodeRepo(c);
        if (!exists) break;
        c = genCode();
      }

      const newPromo = await promoRepository.createPromoRepo({
        userId: customerUserId,
        code: c,
        discountPercent: 100,
      });

      await userRepository.updateUserPromoTracking(customerUserId, {
        promoEligibilityCount: 0,
        totalPromosReceived: (customer.totalPromosReceived || 0) + 1,
      });

      if (email) {
        console.log("[Promo] Sending email to:", email);
        try {
          const actionUrl = config.CLIENT_URL || undefined;
          await SendPromoCodeEmail(
            email,
            name || "",
            newPromo.code,
            newPromo.discountPercent ?? 100,
            actionUrl
          );

          console.log("[Promo] Email sent successfully to:", email);
        } catch (emailError) {
          console.error("[Promo] Failed to send email:", emailError);
        }
      } else {
        console.warn("[Promo] No email provided, skipping email sending");
      }
    } else {
      console.log("[Promo] Not eligible yet");
    }
  } catch (e) {
    console.error("[Promo] Failed to check/issue promo:", e);
  }
};

export const ensureCustomer = async (data: CreateTransactionDTO) => {
  const email = data.customerEmail?.trim();
  let customerUserId: string | undefined;
  const name = data.customerName?.trim();
  const phone = data.customerPhone?.trim();

  if (email) {
    const existingUser = await userRepository.getUserByEmail(email);

    if (existingUser) {
      if (existingUser.role === "ADMIN" || existingUser.role === "SUPERADMIN") {
        throw new ErrorApp(
          "Email ini terdaftar sebagai admin. Gunakan email lain untuk customer.",
          400,
          MESSAGE_CODE.BAD_REQUEST
        );
      }
      customerUserId = existingUser.id;
    } else {
      const user = await userRepository.upsertCustomerByEmail(email, name);
      customerUserId = user.id;
    }
  }
  console.log("Ensure Customer Email =>", email);
  return { customerUserId, name, email, phone };
};

export const createTransaction = async (
  data: CreateTransactionDTO,
  createdByUserId?: string
) => {
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
    if (promo.isUsed) {
      return new ErrorApp(
        "Kode promo sudah pernah digunakan",
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

  const qrData = `qr-${code}`;

  let qrCodeUrl: string | undefined;
  try {
    const qrBuffer = await QRCode.toBuffer(qrData, {
      width: 300,
      margin: 2,
      errorCorrectionLevel: "H",
      type: "png",
    });

    const qrFileName = `${code}.png`;
    const qrPath = `transactions/qr-codes/${qrFileName}`;
    const qrKey = `${config.STORAGE.BUCKET_FOLDER}/${qrPath}`;

    await UploadFileToStorage({
      Bucket: config.STORAGE.BUCKET,
      Key: qrKey,
      Body: qrBuffer,
      ContentType: "image/png",
      ACL: "public-read",
    });

    qrCodeUrl = GetPublicURL(qrPath);
  } catch (error) {
    console.error("Failed to generate/upload QR code:", error);
  }

  let midtransToken: string | undefined;
  let midtransRedirectUrl: string | undefined;
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
    if (snap?.data?.token) midtransToken = snap?.data?.token;
    if (snap?.data?.redirect_url)
      midtransRedirectUrl = snap?.data?.redirect_url;
  } else if (data.paymentMethod === PaymentMethod.CASH) {
    payment.paidAt = new Date();
    payment.cashPaid = data.cashPaid ?? 0;
    payment.cashChange = Math.max(0, (payment.cashPaid || 0) - finalPrice);
  }
  const created = await createTransactionAtomicRepo({
    createdByUserId,
    customerUserId,
    basePrice:
      data.items?.reduce((acc, it) => acc + (Number(it.price) || 0), 0) || 0,
    finalPrice,
    promoApplied,
    code,
    qrCodeData: qrData,
    qrCodeUrl,
    customerName: name,
    customerEmail: email,
    customerPhone: phone,
    paymentMethod: data.paymentMethod,
    items: uploadedItems,
    promoIdToUse,
    paidAt: payment.paidAt,
    cashPaid: payment.cashPaid,
    cashChange: payment.cashChange,
    midtransToken,
    midtransRedirectUrl,
  });

  if (
    customerUserId &&
    data.paymentMethod === PaymentMethod.CASH &&
    created.status === TransactionStatus.IN_PROGRESS &&
    !promoApplied
  ) {
    try {
      const customer = await userRepository.getUserById(customerUserId);
      if (customer) {
        const newCount = (customer.promoEligibilityCount || 0) + 1;
        await userRepository.updateUserPromoTracking(customerUserId, {
          promoEligibilityCount: newCount,
        });

        await checkAndIssuePromoIfEligible(customerUserId, email, name);
      }
    } catch (e) {
      console.warn("Failed to increment promo eligibility:", e);
    }
  }

  try {
    if (email) {
      const trackingBase = config.CLIENT_URL;
      const trackingUrl = trackingBase
        ? `${trackingBase}/transaction/portal/${created.id}`
        : undefined;
      await SendTransactionNotificationEmail({
        to: email,
        name,
        code,
        qrData,
        qrCodeUrl,
        trackingUrl,
        amount: finalPrice,
        totalBeforeDiscount: promoApplied
          ? uploadedItems.reduce((acc, it) => acc + (Number(it.price) || 0), 0)
          : undefined,
        discount: promoApplied ? discountPercent : undefined,
        paymentMethod: data.paymentMethod,
        midtransUrl: midtransRedirectUrl || undefined,
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
    status: created.status,
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

export const scanPickup = async (data: ScanQRDTO, userId: string) => {
  if (!userId) {
    return new ErrorApp(
      "Silahkan login terlebih dahulu",
      401,
      MESSAGE_CODE.UNAUTHORIZED
    );
  }
  const user = await userRepository.getUserById(userId);
  if (!user) {
    return new ErrorApp("User tidak ditemukan", 404, MESSAGE_CODE.NOT_FOUND);
  }
  if (!data.qr.startsWith("qr-")) {
    return new ErrorApp("QR tidak valid", 400, MESSAGE_CODE.BAD_REQUEST);
  }
  const qr = data.qr.substring(3);
  const trx = await getTransactionByCodeRepo(qr);
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
    previousStatus: trx.status,
  });
  return { ok: true };
};

export const lookupTransaction = async (
  params: {
    qr?: string;
    code?: string;
  },
  userId: string
) => {
  if (!userId) {
    return new ErrorApp(
      "Silahkan login terlebih dahulu",
      401,
      MESSAGE_CODE.UNAUTHORIZED
    );
  }
  const user = await userRepository.getUserById(userId);
  if (!user) {
    return new ErrorApp("User tidak ditemukan", 404, MESSAGE_CODE.NOT_FOUND);
  }
  let code: string | undefined = params.code;
  if (params.qr && !code) {
    if (params.qr.startsWith("qr-")) {
      code = params.qr.substring(3);
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
  const trx = await findTransactionDetailByInvoiceRepo(
    code,
    user.role === Role.ADMIN || Role.SUPERADMIN ? undefined : userId
  );
  if (!trx)
    return new ErrorApp(
      "Transaksi tidak ditemukan",
      404,
      MESSAGE_CODE.NOT_FOUND
    );
  const safeUserId = trx.customerUserId ?? "guest";

  let qrCodeUrl: string | undefined;
  if (trx.qrCodeUrl) {
    qrCodeUrl = trx.qrCodeUrl;
  } else if (trx.qrCodeData) {
    try {
      qrCodeUrl = await QRCode.toDataURL(trx.qrCodeData, {
        width: 256,
        margin: 1,
        errorCorrectionLevel: "M",
        type: "image/png",
      });
    } catch (error) {
      console.error("Failed to generate fallback QR code:", error);
    }
  }

  return {
    id: trx.id,
    invoice: trx.code,
    status: trx.status,
    price: trx.price,
    finalPrice: trx.finalPrice,
    promoApplied: trx.promoApplied,
    customerName: trx.customerName,
    customerEmail: trx.customerEmail,
    qrCodeUrl,
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
  return await getDetailTransactionDTOMapper(safeUserId, trx);
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
        ? `${trackingBase}/transaction/portal/${trx.id}`
        : undefined;
      await SendReadyToPickupEmail({
        to: trx.customerEmail,
        name: trx.customerName || undefined,
        code: trx.code,
        qrData: trx.qrCodeData,
        qrCodeUrl: trx.qrCodeUrl || undefined,
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
  await completeTransactionAtomicRepo({
    id: trx.id,
    previousStatus: trx.status,
  });

  // Send completion email
  try {
    if (trx.customerEmail) {
      const trackingBase = config.CLIENT_URL;
      const trackingUrl = trackingBase
        ? `${trackingBase}/transaction/portal/${trx.id}`
        : undefined;
      await SendCompletedEmail({
        to: trx.customerEmail,
        name: trx.customerName || undefined,
        code: trx.code,
        qrData: trx.qrCodeData,
        qrCodeUrl: trx.qrCodeUrl || undefined,
        trackingUrl,
      });
    }
  } catch (e) {
    console.warn("Failed to send completion email:", e);
  }

  return { ok: true };
};

export const updateTransactionItemStatus = async (
  transactionItemId: string,
  status: TransactionItemStatus
) => {
  try {
    await updateTransactionItemStatusRepo(transactionItemId, status);
    return { ok: true };
  } catch (error) {
    return new ErrorApp(
      "Gagal mengubah status item transaksi",
      500,
      MESSAGE_CODE.INTERNAL_SERVER_ERROR
    );
  }
};

export const updateAllTransactionItemsStatus = async (
  transactionId: string,
  status: TransactionItemStatus
) => {
  try {
    await updateAllTransactionItemsStatusRepo(transactionId, status);
    return { ok: true };
  } catch (error) {
    return new ErrorApp(
      "Gagal mengubah status semua item transaksi",
      500,
      MESSAGE_CODE.INTERNAL_SERVER_ERROR
    );
  }
};
