import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { authController } from "./auth.controller";
import { loginSchema, otpVerifySchema, registerSchema } from "./auth.request";

const router = Router();

router
.post("/register", validateRequest(registerSchema), authController.register)
.post("/login", validateRequest(loginSchema), authController.login)
.post("/customer-otp/verify", validateRequest(otpVerifySchema), authController.verifyCustomerOtp);

export default router;
