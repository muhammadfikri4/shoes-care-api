import { NextFunction, Response } from "express";
import { RequestWithAccessToken } from "../../interface/Request";
import { MESSAGE_CODE } from "../../utils/error-code";
import { HandleResponse } from "../../utils/HandleResponse";
import { createRack, listRacks, removeRack, updateRack } from "./racks.service";

export const createRackController = async (
  req: RequestWithAccessToken,
  res: Response,
  next: NextFunction
) => {
  const result = await createRack(req.body);
  if (result instanceof Error) return next(result);
  HandleResponse(
    res,
    201,
    MESSAGE_CODE.SUCCESS,
    "Berhasil membuat rak",
    result
  );
};

export const listRacksController = async (
  req: RequestWithAccessToken,
  res: Response
) => {
  const result = await listRacks(req.query);
  HandleResponse(
    res,
    200,
    MESSAGE_CODE.SUCCESS,
    "Racks",
    result.data,
    result.meta
  );
};

export const updateRackController = async (
  req: RequestWithAccessToken,
  res: Response,
  next: NextFunction
) => {
  const result = await updateRack(req.params.id, req.body);
  if (result instanceof Error) return next(result);
  HandleResponse(
    res,
    200,
    MESSAGE_CODE.SUCCESS,
    "Berhasil mengubah rak",
    result
  );
};

export const removeRacController = async (
  req: RequestWithAccessToken,
  res: Response,
  next: NextFunction
) => {
  const result = await removeRack(req.params.id);
  if (result instanceof Error) return next(result);
  HandleResponse(
    res,
    200,
    MESSAGE_CODE.SUCCESS,
    "Berhasil menghapus rak",
    result
  );
};
