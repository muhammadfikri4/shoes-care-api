import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { authController } from "./auth.controller";
import { customerRegisterSchema, customerRegisterVerifySchema, loginSchema, registerSchema } from "./auth.request";

const router = Router();

router
.post("/register", validateRequest(registerSchema), authController.register)
.post("/login", validateRequest(loginSchema), authController.login)
.post("/register/customer", validateRequest(customerRegisterSchema), authController.customerRegisterStart)
.post("/customer/register/verify", validateRequest(customerRegisterVerifySchema), authController.customerRegisterVerify);

export default router;
