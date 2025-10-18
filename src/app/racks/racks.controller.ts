import { NextFunction, Response } from "express";
import { RequestWithAccessToken } from "../../interface/Request";
import { MESSAGE_CODE } from "../../utils/ErrorCode";
import { HandleResponse } from "../../utils/HandleResponse";
import { racksService } from "./racks.service";

export const racksController = {
  create: async (req: RequestWithAccessToken, res: Response, next: NextFunction) => {
    const result = await racksService.create(req.body);
    if (result instanceof Error) return next(result);
    HandleResponse(res, 201, MESSAGE_CODE.SUCCESS, "Rack created", result);
  },
  list: async (_req: RequestWithAccessToken, res: Response) => {
    const result = await racksService.list();
    HandleResponse(res, 200, MESSAGE_CODE.SUCCESS, "Racks", result);
  },
  update: async (req: RequestWithAccessToken, res: Response, next: NextFunction) => {
    const result = await racksService.update(req.params.id, req.body);
    if (result instanceof Error) return next(result);
    HandleResponse(res, 200, MESSAGE_CODE.SUCCESS, "Rack updated", result);
  },
  remove: async (req: RequestWithAccessToken, res: Response, next: NextFunction) => {
    const result = await racksService.remove(req.params.id);
    if (result instanceof Error) return next(result);
    HandleResponse(res, 200, MESSAGE_CODE.SUCCESS, "Rack deleted", result);
  },
};

