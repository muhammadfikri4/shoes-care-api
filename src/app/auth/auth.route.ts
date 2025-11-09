import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { authController } from "./auth.controller";
import {
  customerRegisterSchema,
  forgotPasswordCustomerSchema,
  loginSchema,
  registerSchema,
  resetPasswordCustomerSchema,
} from "./auth.request";

const router = Router();

router
  .post("/register", validateRequest(registerSchema), authController.register)
  .post("/login", validateRequest(loginSchema), authController.login)
  .post(
    "/register/customer",
    validateRequest(customerRegisterSchema),
    authController.customerRegisterStart
  )
  .post(
    "/forgot-password/customer",
    validateRequest(forgotPasswordCustomerSchema),
    authController.forgotPasswordCustomer
  )
  .post(
    "/reset-password/customer",
    validateRequest(resetPasswordCustomerSchema),
    authController.resetPasswordCustomer
  );

export default router;
