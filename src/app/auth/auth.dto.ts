import { Role } from "@prisma/client";

export interface RegisterDTO {
    name: string;
    email: string;
    resetPasswordToken?: string | null;
    resetPasswordTokenExpiredAt?: Date | null;
    password: string;
    code: string
  }
  
export interface LoginDTO {
    email: string;
    password: string;
    role: Role
  }
  
export interface CustomerOtpRequestDTO {
  email: string;
  name?: string;
}

export interface CustomerOtpVerifyDTO {
  email: string;
  otp: string;
}

export interface CustomerRegisterDTO {
  name?: string;
  email: string;
  password: string;
}

export interface CustomerRegisterVerifyDTO {
  key: string;
  otp: string;
}

export interface ForgotPasswordCustomerDTO {
  email: string;
}

export interface ResetPasswordCustomerDTO {
  resetPasswordToken: string;
  password: string;
}

