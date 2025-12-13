import { NextFunction, Response } from "express";
import { RequestWithAccessToken } from "../../interface/Request";
import { MESSAGE_CODE } from "../../utils/error-code";
import { HandleResponse } from "../../utils/HandleResponse";
import { ErrorApp } from "../../utils/http-error";
import { userService } from "./users.service";

export const userController = {
  getProfile: async (
    req: RequestWithAccessToken,
    res: Response,
    next: NextFunction
  ) => {
    const user = await userService.getProfile(req.userId ?? "");
    if (user instanceof Error) {
      return next(user);
    }
    HandleResponse(
      res,
      200,
      MESSAGE_CODE.SUCCESS,
      "Profile retrieved successfully",
      user
    );
  },
  updateProfile: async (
    req: RequestWithAccessToken,
    res: Response,
    next: NextFunction
  ) => {
    const user = await userService.updateProfile(
      req.userId ?? "",
      req.body.name
    );
    if (user instanceof Error) {
      return next(user);
    }
    HandleResponse(
      res,
      200,
      MESSAGE_CODE.SUCCESS,
      "Profile retrieved successfully",
      user
    );
  },
  getCustomers: async (
    req: RequestWithAccessToken,
    res: Response,
    next: NextFunction
  ) => {
    const query = req.query;
    const result = await userService.getCustomers(query);
    if (result instanceof ErrorApp) return next(result);
    HandleResponse(
      res,
      200,
      MESSAGE_CODE.SUCCESS,
      "Customers retrieved successfully",
      result.data,
      result.meta
    );
  },
};
