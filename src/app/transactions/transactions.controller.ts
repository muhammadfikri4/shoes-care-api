import * as userRepository from "../users/users.repository";
import { NextFunction, Request, Response } from "express";
import { RequestWithAccessToken } from "../../interface/Request";
import { MESSAGE_CODE } from "../../utils/error-code";
import { HandleResponse } from "../../utils/HandleResponse";
import * as transactionService from "./transactions.service";
import {
  getTransactionByInvoiceRepo,
  updateTransactionStatusByInvoiceRepo,
} from "./transactions.repository";
import { TransactionStatus } from "@prisma/client";
import { CreateTransactionDTO } from "./transactions.dto";
import { ErrorApp } from "../../utils/http-error";
import { createTransactionSchema } from "./transactions.request";
import { completeSchema, readyToPickupSchema } from "./transactions.request";
import { SendPaymentSuccessEmail } from "../../utils/MailerConfig";
import { config } from "../../libs";

export const createTransactionController = async (
  req: RequestWithAccessToken,
  res: Response,
  next: NextFunction
) => {
  const payload: CreateTransactionDTO = req.body;
  let files: Express.Multer.File[] = [];
  const rawFiles = req.files;

  if (Array.isArray(rawFiles)) {
    files = rawFiles;
  } else if (rawFiles && typeof rawFiles === "object") {
    if (Array.isArray(rawFiles.photos)) {
      files = rawFiles.photos as Express.Multer.File[];
    } else {
      files = Object.values(rawFiles).flat() as Express.Multer.File[];
    }
  }

  const combine: CreateTransactionDTO = {
    ...payload,
    items: (payload?.items || [])?.map((it, idx) => ({
      ...it,
      file: files[idx],
    })),
  };
  console.log({ combine });
  const validate = createTransactionSchema.validate(combine);
  if (validate.error) {
    next(
      new ErrorApp(
        validate.error.message.replace(/"/g, ""),
        400,
        MESSAGE_CODE.BAD_REQUEST
      )
    );
    return;
  }
  console.log({ combine });
  const result = await transactionService.createTransaction(
    combine,
    req.userId
  );

  if (result instanceof ErrorApp) {
    next(result);
    return;
  }

  return HandleResponse(
    res,
    201,
    MESSAGE_CODE.SUCCESS,
    "Transaksi berhasil dibuat",
    result
  );
};

export const listAllTransactionsController = async (
  req: RequestWithAccessToken,
  res: Response,
  next: NextFunction
) => {
  const result = await transactionService.listTransactions(req.query);
  if (result instanceof ErrorApp) {
    next(result);
    return;
  }
  HandleResponse(
    res,
    200,
    MESSAGE_CODE.SUCCESS,
    "Berhasil mendapatkan list transaksi",
    result?.data,
    result?.meta
  );
};

export const listMyTransactionsController = async (
  req: RequestWithAccessToken,
  res: Response,
  next: NextFunction
) => {
  const result = await transactionService.listTransactionsByUser(
    req.userId ?? "",
    req.query
  );
  if (result instanceof ErrorApp) {
    next(result);
    return;
  }
  HandleResponse(
    res,
    200,
    MESSAGE_CODE.SUCCESS,
    "Berhasil mendapatkan history transaksi",
    result?.data,
    result?.meta
  );
};

export const scanPickupController = async (
  req: RequestWithAccessToken,
  res: Response,
  next: NextFunction
) => {
  const result = await transactionService.scanPickup(req.body);
  if (result instanceof Error) return next(result);
  HandleResponse(
    res,
    200,
    MESSAGE_CODE.SUCCESS,
    "Berhasil melakukan scan transaksi",
    result
  );
};

export const lookupTransactionController = async (
  req: RequestWithAccessToken,
  res: Response,
  next: NextFunction
) => {
  const result = await transactionService.lookupTransaction(req.query);
  if (result instanceof Error) return next(result);
  HandleResponse(
    res,
    200,
    MESSAGE_CODE.SUCCESS,
    "Berhasil melakukan scan transaksi",
    result
  );
};
export const getDetailTransaction = async (
  req: RequestWithAccessToken,
  res: Response,
  next: NextFunction
) => {
  const { transactionId } = req.params;
  const result = await transactionService.getDetailTransaction(transactionId);
  if (result instanceof Error) return next(result);
  HandleResponse(
    res,
    200,
    MESSAGE_CODE.SUCCESS,
    "Berhasil mendapatkan detail transaksi",
    result
  );
};

export const verifyPromoController = async (
  req: RequestWithAccessToken,
  res: Response,
  next: NextFunction
) => {
  const result = await transactionService.verifyPromo(req.body);
  if (result instanceof Error) return next(result);
  HandleResponse(res, 200, MESSAGE_CODE.SUCCESS, "Promo verified", result);
};

export const midtransNotifyController = async (req: Request, res: Response) => {
  try {
    const { order_id, transaction_status } = req.body || {};
    if (!order_id) {
      return HandleResponse(res, 200, MESSAGE_CODE.SUCCESS, "OK");
    }

    let status: TransactionStatus = TransactionStatus.CREATED;
    let paidAt: Date | undefined;

    if (
      transaction_status === "capture" ||
      transaction_status === "settlement"
    ) {
      status = TransactionStatus.IN_PROGRESS;
      paidAt = new Date();
    } else if (
      transaction_status === "deny" ||
      transaction_status === "expire" ||
      transaction_status === "cancel"
    ) {
      status = TransactionStatus.CANCELLED;
    }

    await updateTransactionStatusByInvoiceRepo(order_id, status, paidAt);

    if (status === TransactionStatus.IN_PROGRESS) {
      const trx = await getTransactionByInvoiceRepo(order_id);
      if (trx) {
        // Increment promo eligibility counter for QRIS/TRANSFER payment - only when no promo is used
        if (trx.customerUserId && !trx.promoApplied) {
          try {

            const customer = await userRepository.getUserById(
              trx.customerUserId
            );
            if (customer) {
              const newCount = (customer.promoEligibilityCount || 0) + 1;
              await userRepository.updateUserPromoTracking(trx.customerUserId, {
                promoEligibilityCount: newCount,
              });
            }
          } catch (e) {
            console.warn("Failed to increment promo eligibility:", e);
          }
        }

        // Send payment success email
        if (trx.customerEmail) {
          const trackingBase = config.CLIENT_URL;
          const trackingUrl = trackingBase
            ? `${trackingBase}/transaction/portal/${trx.id}`
            : undefined;
          await SendPaymentSuccessEmail({
            to: trx.customerEmail,
            name: trx.customerName || undefined,
            code: trx.code,
            qrData: trx.qrCodeData,
            qrCodeUrl: trx.qrCodeUrl || undefined,
            trackingUrl,
            amount: Number(trx.finalPrice ?? trx.price),
          });
        }
      }
    }
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false });
  }
};

export const readyToPickupController = async (
  req: RequestWithAccessToken,
  res: Response,
  next: NextFunction
) => {
  const validate = readyToPickupSchema.validate(req.body);
  if (validate.error) {
    return next(
      new ErrorApp(
        validate.error.message.replace(/"/g, ""),
        400,
        MESSAGE_CODE.BAD_REQUEST
      )
    );
  }
  const result = await transactionService.markReadyToPickup(req.body);
  if (result instanceof ErrorApp) return next(result);
  HandleResponse(res, 200, MESSAGE_CODE.SUCCESS, "Status updated", result);
};

export const completeController = async (
  req: RequestWithAccessToken,
  res: Response,
  next: NextFunction
) => {
  const validate = completeSchema.validate(req.body);
  if (validate.error) {
    return next(
      new ErrorApp(
        validate.error.message.replace(/"/g, ""),
        400,
        MESSAGE_CODE.BAD_REQUEST
      )
    );
  }
  const result = await transactionService.markCompleted(req.body);
  if (result instanceof ErrorApp) return next(result);
  HandleResponse(res, 200, MESSAGE_CODE.SUCCESS, "Status updated", result);
};
