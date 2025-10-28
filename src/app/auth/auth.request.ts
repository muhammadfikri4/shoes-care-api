import { Role } from "@prisma/client";
import Joi from "joi";

export const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(100).required(),
});

export const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    role: Joi.string().valid(...Object.values(Role)).required(),
  });
  
export const otpRequestSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(2).max(100).optional(),
});

export const otpVerifySchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).required(),
});

export const customerRegisterSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(100).required(),
});

export const customerRegisterVerifySchema = Joi.object({
  key: Joi.string().uuid().required(),
  otp: Joi.string().length(6).required(),
});
  
