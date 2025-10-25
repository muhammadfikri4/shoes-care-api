import { NextFunction, Request, Response } from "express";
import { RequestWithAccessToken } from "../../interface/Request";
import { MESSAGE_CODE } from "../../utils/error-code";
import { HandleResponse } from "../../utils/HandleResponse";
import * as transactionService from "./transactions.service";
import { updatePaymentStatusByInvoiceRepo } from "./transactions.repository";
import { PaymentStatus } from "@prisma/client";
import { CreateTransactionDTO } from "./transactions.dto";
import { ErrorApp } from "../../utils/http-error";
import { createTransactionSchema } from "./transactions.request";

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
  const result = await transactionService.createTransaction(combine);

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
    req.userId ?? ""
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
    result
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
  const transactionId = (req?.params as any)?.transactionId || req?.params?.id;
  const result = await transactionService.getDetailTransaction(transactionId);
  if (result instanceof Error) return next(result);
  HandleResponse(
    res,
    200,
    MESSAGE_CODE.SUCCESS,
    "Berhasil melakukan scan transaksi",
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
    if (!order_id)
      return res.status(400).json({ message: "order_id is required" });
    let status: PaymentStatus = PaymentStatus.PENDING;
    if (transaction_status === "capture" || transaction_status === "settlement")
      status = PaymentStatus.PAID;
    else if (
      transaction_status === "deny" ||
      transaction_status === "expire" ||
      transaction_status === "cancel"
    )
      status = PaymentStatus.FAILED;
    await updatePaymentStatusByInvoiceRepo(
      order_id,
      status,
      status === PaymentStatus.PAID ? new Date() : undefined
    );
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false });
  }
};
