export interface RegisterDTO {
    name: string;
    email: string;
    password: string;
    code: string
  }
  
export interface LoginDTO {
    email: string;
    password: string;
  }
  
export interface CustomerOtpRequestDTO {
  email: string;
  name?: string;
}

export interface CustomerOtpVerifyDTO {
  email: string;
  otp: string;
}
  
