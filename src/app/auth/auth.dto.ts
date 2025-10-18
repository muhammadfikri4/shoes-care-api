import { Role } from "@prisma/client";

export interface RegisterDTO {
    name: string;
    email: string;
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
  
