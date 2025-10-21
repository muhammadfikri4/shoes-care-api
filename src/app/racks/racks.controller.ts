import { NextFunction, Response } from "express";
import { RequestWithAccessToken } from "../../interface/Request";
import { MESSAGE_CODE } from "../../utils/error-code";
import { HandleResponse } from "../../utils/HandleResponse";
import { createRack, listRacks, removeRack, updateRack } from "./racks.service";

export const createRackController = async (req: RequestWithAccessToken, res: Response, next: NextFunction) => {
  const result = await createRack(req.body);
  if (result instanceof Error) return next(result);
  HandleResponse(res, 201, MESSAGE_CODE.SUCCESS, "Rack created", result);
};

export const listRacksController = async (_req: RequestWithAccessToken, res: Response) => {
  const result = await listRacks();
  HandleResponse(res, 200, MESSAGE_CODE.SUCCESS, "Racks", result);
};

export const updateRackController = async (req: RequestWithAccessToken, res: Response, next: NextFunction) => {
  const result = await updateRack(req.params.id, req.body);
  if (result instanceof Error) return next(result);
  HandleResponse(res, 200, MESSAGE_CODE.SUCCESS, "Rack updated", result);
};

export const removeRackController = async (req: RequestWithAccessToken, res: Response, next: NextFunction) => {
  const result = await removeRack(req.params.id);
  if (result instanceof Error) return next(result);
  HandleResponse(res, 200, MESSAGE_CODE.SUCCESS, "Rack deleted", result);
};
