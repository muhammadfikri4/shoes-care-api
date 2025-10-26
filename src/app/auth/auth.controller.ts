import { NextFunction, Request, Response } from "express";
import { authService, customerRegisterStart, customerRegisterVerify } from "../auth/auth.service";
import { ErrorApp } from "../../utils/http-error";
import { HandleResponse } from "../../utils/HandleResponse";
import { MESSAGE_CODE } from "../../utils/error-code";

export const authController = {
  register: async (req: Request, res: Response, next: NextFunction) => {
    const { body } = req;
    const result = await authService.register(body);
    if(result instanceof ErrorApp) {
        next(result)
        return
      }
      HandleResponse(res, 201, MESSAGE_CODE.SUCCESS, "Register successfully", result);
  },

  login: async (req: Request, res: Response, next: NextFunction) => {
      const { body } = req;
      console.log({body})
      const result = await authService.login(body);
      if(result instanceof ErrorApp) {
        next(result)
        return
      }
      HandleResponse(res, 200, MESSAGE_CODE.SUCCESS, "Login successfully", result);
  },
  verifyCustomerOtp: async (req: Request, res: Response, next: NextFunction) => {
    const result = await authService.verifyCustomerOtp(req.body);
    if(result instanceof ErrorApp) {
      next(result)
      return
    }
    HandleResponse(res, 200, MESSAGE_CODE.SUCCESS, "Login successfully", result);
  },
  customerRegisterStart: async (req: Request, res: Response, next: NextFunction) => {
    const result = await customerRegisterStart(req.body);
    if(result instanceof ErrorApp) {
      next(result)
      return
    }
    HandleResponse(res, 200, MESSAGE_CODE.SUCCESS, "OTP terkirim ke email", result);
  },
  customerRegisterVerify: async (req: Request, res: Response, next: NextFunction) => {
    const result = await customerRegisterVerify(req.body);
    if(result instanceof ErrorApp) {
      next(result)
      return
    }
    HandleResponse(res, 200, MESSAGE_CODE.SUCCESS, "Akun berhasil diaktifkan", result);
  },
};
