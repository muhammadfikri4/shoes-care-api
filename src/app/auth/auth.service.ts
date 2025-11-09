import { Role } from "@prisma/client";
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { config } from "../../libs";
import { MESSAGE_CODE } from "../../utils/error-code";
import { generateRandom } from "../../utils/generate-random";
import { ErrorApp } from "../../utils/http-error";
import { SendResetPasswordEmail } from "../../utils/MailerConfig";
import { MESSAGES } from "../../utils/Messages";
import * as userRepository from "../users/users.repository";
import {
  CustomerOtpVerifyDTO,
  CustomerRegisterDTO,
  ForgotPasswordCustomerDTO,
  LoginDTO,
  RegisterDTO,
  ResetPasswordCustomerDTO,
} from "./auth.dto";

export const authService = {
  register: async (data: RegisterDTO) => {
    const hash = await bcrypt.hash(data.password, 10);
    const code = generateRandom(6);
    return userRepository.createUser({ ...data, password: hash, code });
  },

  login: async (data: LoginDTO) => {
    const user = await userRepository.getUserByEmailAndRole(
      data.email,
      data.role
    );
    if (!user || !user.password) {
      return new ErrorApp("Invalid credentials", 400, MESSAGE_CODE.BAD_REQUEST);
    }
    const ok = await bcrypt.compare(data.password, user.password);
    if (!ok) {
      return new ErrorApp("Invalid credentials", 400, MESSAGE_CODE.BAD_REQUEST);
    }
    // Customer sudah otomatis aktif setelah register
    const token = jwt.sign({ userId: user.id }, config.JWT_SECRET, {
      expiresIn: "7d",
    });
    return { token, user };
  },
  verifyCustomerOtp: async (data: CustomerOtpVerifyDTO) => {
    const user = await userRepository.getUserByEmailAndRole(
      data.email,
      Role.CUSTOMER
    );
    if (!user) {
      return new ErrorApp("User not found", 404, MESSAGE_CODE.NOT_FOUND);
    }
    const token = jwt.sign({ userId: user.id }, config.JWT_SECRET, {
      expiresIn: "7d",
    });
    return { token, user };
  },
};

export const regsiterCustomer = async (data: CustomerRegisterDTO) => {
  const user = await userRepository.getCustomerRegisterByEmail(data.email);
  if (user) {
    return new ErrorApp(
      MESSAGES.ERROR.ALREADY.GLOBAL.EMAIL,
      400,
      MESSAGE_CODE.BAD_REQUEST
    );
  }
  return userRepository.upsertCustomerByEmail(data.email);
};

export const customerRegisterStart = async (data: CustomerRegisterDTO) => {
  const { email, password, name } = data;
  let user = await userRepository.getUserByEmailAndRole(email, Role.CUSTOMER);
  if (!user) {
    const hash = await bcrypt.hash(password, 10);
    user = await userRepository.createUserRaw({
      email,
      name: name || email,
      password: hash,
    });
    return { ok: true };
  }
  if (user.password) {
    return new ErrorApp(
      "Akun sudah terdaftar. Silakan login.",
      400,
      MESSAGE_CODE.BAD_REQUEST
    );
  }
  const hash = await bcrypt.hash(password, 10);
  await userRepository.updateUser(user.id, {
    password: hash,
    ...(name ? { name } : {}),
  });
  return { ok: true };
};

export const forgotPasswordCustomer = async (
  data: ForgotPasswordCustomerDTO
) => {
  const { email } = data;
  console.log("email => ", email);
  // Check if user exists and is a customer
  const user = await userRepository.getUserByEmailAndRole(email, Role.CUSTOMER);
  if (!user) {
    return new ErrorApp(
      "Email tidak terdaftar sebagai customer",
      404,
      MESSAGE_CODE.NOT_FOUND
    );
  }
  console.log("user => ", JSON.stringify(user, null, 2));

  // Generate reset token (32 bytes = 64 hex characters)
  const resetToken = crypto.randomBytes(32).toString("hex");
  console.log("generate token => ", resetToken);
  // Set expiry to 1 hour from now
  const expiredAt = new Date();
  expiredAt.setHours(expiredAt.getHours() + 1);
  console.log("generate expired => ", expiredAt);

  // Save token to database
  await userRepository.updateUser(user.id, {
    resetPasswordToken: resetToken,
    resetPasswordTokenExpiredAt: expiredAt,
  });

  // Build reset URL with token as query param
  const resetUrl = `${config.CLIENT_URL}/reset-password?reset_token=${resetToken}`;

  // Send email
  try {
    const res = await SendResetPasswordEmail({
      to: email,
      name: user.name,
      resetUrl,
    });
    console.log("success send email => ", JSON.stringify(res, null, 2));
  } catch (error) {
    console.error("Failed to send reset password email:", error);
    return new ErrorApp(
      "Gagal mengirim email. Silakan coba lagi",
      500,
      MESSAGE_CODE.BAD_REQUEST
    );
  }

  return { ok: true, message: "Email reset password telah dikirim" };
};

export const resetPasswordCustomer = async (data: ResetPasswordCustomerDTO) => {
  const { resetPasswordToken, password } = data;

  // We need to query by reset token, so let's use a custom query
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  const userWithToken = await prisma.user.findFirst({
    where: {
      resetPasswordToken,
      role: Role.CUSTOMER,
    },
  });

  if (!userWithToken) {
    return new ErrorApp(
      "Token tidak valid atau sudah digunakan",
      400,
      MESSAGE_CODE.BAD_REQUEST
    );
  }

  // Check if token is expired
  if (
    !userWithToken.resetPasswordTokenExpiredAt ||
    new Date(userWithToken.resetPasswordTokenExpiredAt) < new Date()
  ) {
    return new ErrorApp(
      "Token sudah kadaluarsa. Silakan request ulang reset password",
      400,
      MESSAGE_CODE.BAD_REQUEST
    );
  }

  // Hash new password
  const hash = await bcrypt.hash(password, 10);

  // Update password and clear reset token
  await userRepository.updateUser(userWithToken.id, {
    password: hash,
    resetPasswordToken: null,
    resetPasswordTokenExpiredAt: null,
  });

  return { ok: true, message: "Password berhasil diubah" };
};
