import { NextFunction, Response } from "express";
import { RequestWithAccessToken } from "../../interface/Request";
import { MESSAGE_CODE } from "../../utils/ErrorCode";
import { HandleResponse } from "../../utils/HandleResponse";
import { ErrorApp } from "../../utils/HttpError";
import { createTransaction, listTransactions, listTransactionsByUser, lookupTransaction, scanPickup, verifyPromo } from "./transactions.service";

export const createTransactionController = async (req: RequestWithAccessToken, res: Response, next: NextFunction) => {
  try {
    let payload: any = req.body;
    // Handle multipart: expect 'payload' as JSON string and files as 'photos'
    if (typeof req.body.payload === 'string') {
      payload = JSON.parse(req.body.payload);
    }
    // Attach uploaded files buffer to payload so service can map -> photoUrl
    const files = (req as any).files as Express.Multer.File[] | undefined;
    if (files && Array.isArray(files) && payload?.items) {
      payload.items = payload.items.map((it: any, idx: number) => ({ ...it, _fileIndex: files[idx] ? idx : undefined }));
      (payload as any)._uploadedFiles = files;
    }
    const result = await createTransaction(payload);
    if (result instanceof Error) return next(result);
    HandleResponse(res, 201, MESSAGE_CODE.SUCCESS, "Transaksi berhasil dibuat", result);
  } catch (e) {
    next(e);
  }
};


export const listAllTransactionsController = async (req: RequestWithAccessToken, res: Response, next: NextFunction) => {
  const result = await listTransactions(req.query);
  if(result instanceof ErrorApp) {
    next(result)
    return
  }
  HandleResponse(res, 200, MESSAGE_CODE.SUCCESS, "Berhasil mendapatkan list transaksi", result?.data, result?.meta);
};

export const listMyTransactionsController = async (req: RequestWithAccessToken, res: Response,next: NextFunction) => {
  const result = await listTransactionsByUser(req.userId ?? '');
  if(result instanceof ErrorApp) {
    next(result)
    return
  }
  HandleResponse(res, 200, MESSAGE_CODE.SUCCESS, "Berhasil mendapatkan history transaksi", result);
};

export const scanPickupController = async (req: RequestWithAccessToken, res: Response, next: NextFunction,) => {
  const result = await scanPickup(req.body);
  if (result instanceof Error) return next(result);
  HandleResponse(res, 200, MESSAGE_CODE.SUCCESS, "Berhasil melakukan scan transaksi", result);
};

export const lookupTransactionController = async (req: RequestWithAccessToken, res: Response, next: NextFunction) => {
  const result = await lookupTransaction(req.query);
  if (result instanceof Error) return next(result);
  HandleResponse(res, 200, MESSAGE_CODE.SUCCESS, "Berhasil melakukan scan transaksi", result);
};

export const verifyPromoController = async (req: RequestWithAccessToken, res: Response, next: NextFunction) => {
  const result = await verifyPromo(req.body);
  if (result instanceof Error) return next(result);
  HandleResponse(res, 200, MESSAGE_CODE.SUCCESS, "Promo verified", result);
};
