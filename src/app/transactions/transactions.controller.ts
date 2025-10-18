import { NextFunction, Response } from "express";
import { RequestWithAccessToken } from "../../interface/Request";
import { MESSAGE_CODE } from "../../utils/ErrorCode";
import { HandleResponse } from "../../utils/HandleResponse";
import { transactionsService } from "./transactions.service";

export const transactionsController = {
  create: async (req: RequestWithAccessToken, res: Response, next: NextFunction) => {
    const result = await transactionsService.create(req.body);
    if (result instanceof Error) return next(result);
    HandleResponse(res, 201, MESSAGE_CODE.SUCCESS, "Transaction created", result);
  },
  listAll: async (_req: RequestWithAccessToken, res: Response) => {
    const result = await transactionsService.listAll();
    HandleResponse(res, 200, MESSAGE_CODE.SUCCESS, "Transactions", result);
  },
  listMine: async (req: RequestWithAccessToken, res: Response) => {
    const result = await transactionsService.listByUser(req.userId ?? '');
    HandleResponse(res, 200, MESSAGE_CODE.SUCCESS, "My Transactions", result);
  },
  scanPickup: async (req: RequestWithAccessToken, res: Response, next: NextFunction) => {
    const result = await transactionsService.scanPickup(req.body);
    if (result instanceof Error) return next(result);
    HandleResponse(res, 200, MESSAGE_CODE.SUCCESS, "Pickup confirmed", result);
  },
  lookup: async (req: RequestWithAccessToken, res: Response, next: NextFunction) => {
    const { qr, invoice } = req.query as { qr?: string; invoice?: string };
    const result = await transactionsService.lookup({ qr, invoice });
    if (result instanceof Error) return next(result);
    HandleResponse(res, 200, MESSAGE_CODE.SUCCESS, "Transaction lookup", result);
  },
};
