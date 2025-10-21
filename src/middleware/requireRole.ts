import { NextFunction, Request, Response } from "express";
import * as userRepository from "../app/users/users.repository";
import { MESSAGE_CODE } from "../utils/error-code";
import { HandleResponse } from "../utils/HandleResponse";
import { RequestWithAccessToken } from "../interface/Request";

export const requireRole = (...roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = req as RequestWithAccessToken;
    if (!userId) {
      return HandleResponse(res, 401, MESSAGE_CODE.UNAUTHORIZED, "Unauthorized");
    }
    const user = await userRepository.getUserById(userId);
    if (!user || !roles.includes(user.role as unknown as string)) {
      return HandleResponse(res, 403, MESSAGE_CODE.UNAUTHORIZED, "Forbidden");
    }
    next();
  };
};

