import { NextFunction, Response } from "express";
import { RequestWithAccessToken } from "../../interface/Request";
import { MESSAGE_CODE } from "../../utils/error-code";
import { HandleResponse } from "../../utils/HandleResponse";
import { ErrorApp } from "../../utils/http-error";
import {
  checkPromoByCodeService,
  listPromosService,
  upsertPromoConfigurationService,
} from "./promos.service";

export const listPromosController = async (
  req: RequestWithAccessToken,
  res: Response,
  next: NextFunction
) => {
  const { userId, query } = req;
  const result = await listPromosService(userId ?? "", query);
  if (result instanceof ErrorApp) return next(result);
  HandleResponse(res, 200, MESSAGE_CODE.SUCCESS, "Daftar promo", result.data, result.meta);
};

export const checkPromoController = async (
  req: RequestWithAccessToken,
  res: Response,
  next: NextFunction
) => {
  const code = req.params.code;
  const result = await checkPromoByCodeService(req.userId ?? "", code);
  if (result instanceof ErrorApp) return next(result);
  HandleResponse(res, 200, MESSAGE_CODE.SUCCESS, "Promo valid", result);
};

export const upsertPromoConfigurationController = async (
  req: RequestWithAccessToken,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  const { requiredTransactions } = req.body ?? {};

  const result = await upsertPromoConfigurationService(id, {
    requiredTransactions,
  });
  if (result instanceof ErrorApp) return next(result);

  HandleResponse(
    res,
    200,
    MESSAGE_CODE.SUCCESS,
    "Promo configuration berhasil diupsert",
    result
  );
};
