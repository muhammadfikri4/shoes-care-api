import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { config } from "../../libs";
import { MESSAGE_CODE } from "../../utils/error-code";
import { generateRandom } from "../../utils/generate-random";
import { ErrorApp } from "../../utils/http-error";
import * as userRepository from "../users/users.repository";
import { CustomerRegisterDTO, CustomerRegisterVerifyDTO, CustomerOtpVerifyDTO, LoginDTO, RegisterDTO } from "./auth.dto";
import * as customersRepository from "../customers/customers.repository";
import { countTransactionsByCustomerEmailRepo } from "../transactions/transactions.repository";
import { SendEmail } from "../../utils/MailerConfig";
import { Role } from "@prisma/client";
import { createOtpRepo, getOtpByIdRepo, markOtpUsedRepo } from "../otp/otp.repository";
import { random } from "../../utils/GeneratedRandomOTP";

export const authService = {
  register: async (data: RegisterDTO) => {
    const hash = await bcrypt.hash(data.password, 10);
    const code = generateRandom(6)
    return userRepository.createUser({ ...data, password: hash, code});
  },

  login: async (data: LoginDTO) => {
    const user = await userRepository.getUserByEmailAndRole(data.email, data.role);
    if (!user || !user.password) {
      return new ErrorApp("Invalid credentials", 400, MESSAGE_CODE.BAD_REQUEST);
    }
    const ok = await bcrypt.compare(data.password, user.password);
    if (!ok) {
      return new ErrorApp("Invalid credentials", 400, MESSAGE_CODE.BAD_REQUEST);
    }
    // If customer, ensure activated
    if (data.role?.toString() === "CUSTOMER") {
      const customer = await customersRepository.getCustomerByUserIdRepo(user.id);
      if (!customer?.activatedAt) {
        return new ErrorApp("Akun belum diaktifkan", 403, MESSAGE_CODE.FORBIDDEN);
      }
    }
    const token = jwt.sign({ userId: user.id }, config.JWT_SECRET, { expiresIn: "7d" });
    return { token, user };
  },
  verifyCustomerOtp: async (data: CustomerOtpVerifyDTO) => {
    const user = await userRepository.getUserByEmailAndRole(data.email, Role.CUSTOMER);
    if (!user) {
      return new ErrorApp("User not found", 404, MESSAGE_CODE.NOT_FOUND);
    }
    const token = jwt.sign({ userId: user.id }, config.JWT_SECRET, { expiresIn: "7d" });
    return { token, user };
  }
};

export const customerRegisterStart = async (data: CustomerRegisterDTO) => {
  const { email, password } = data;
  // must have past transaction
  const trxCount = await countTransactionsByCustomerEmailRepo(email);
  if (!trxCount) {
    return new ErrorApp(
      "Registrasi hanya untuk pelanggan yang sudah pernah transaksi",
      400,
      MESSAGE_CODE.BAD_REQUEST
    );
  }
  // ensure user (CUSTOMER) exists
  let user = await userRepository.getUserByEmailAndRole(email, Role.CUSTOMER);
  if (!user) {
    user = await userRepository.createUserRaw({ email, name: email, password: null });
  }
  // prepare OTP entry with hashed password in otp table
  const otpCode = random();
  const expiresAt = new Date(Date.now() + 3 * 60 * 1000);
  const hashedPassword = await bcrypt.hash(password, 10);
  const otp = await createOtpRepo({
    email,
    userId: user.id,
    purpose: "CUSTOMER_REGISTER",
    code: `${otpCode}`,
    hashedPassword,
    expiresAt,
  });
  await SendEmail(email, user.name || email, Number(otpCode));
  return { key: otp.id, expiredAt: expiresAt.toISOString() };
};

export const customerRegisterVerify = async (data: CustomerRegisterVerifyDTO) => {
  const { key, otp } = data;
  const record = await getOtpByIdRepo(key);
  if (!record) return new ErrorApp("OTP tidak ditemukan", 404, MESSAGE_CODE.NOT_FOUND);
  if (record.purpose !== "CUSTOMER_REGISTER")
    return new ErrorApp("OTP tidak valid", 400, MESSAGE_CODE.BAD_REQUEST);
  if (record.usedAt) return new ErrorApp("OTP sudah digunakan", 400, MESSAGE_CODE.BAD_REQUEST);
  if (new Date(record.expiresAt) < new Date())
    return new ErrorApp("OTP kedaluwarsa", 400, MESSAGE_CODE.BAD_REQUEST);
  if (record.code !== otp)
    return new ErrorApp("Kode OTP salah", 400, MESSAGE_CODE.BAD_REQUEST);

  // resolve user
  const user = record.userId
    ? await userRepository.getUserById(record.userId)
    : await userRepository.getUserByEmailAndRole(record.email, Role.CUSTOMER);
  if (!user) return new ErrorApp("User tidak ditemukan", 404, MESSAGE_CODE.NOT_FOUND);

  // update password from stored hash
  if (record.hashedPassword) {
    await userRepository.updateUser(user.id, { password: record.hashedPassword });
  }
  // ensure customer profile and activate
  const customer = await customersRepository.getCustomerByUserIdRepo(user.id);
  if (!customer) {
    await customersRepository.createCustomerRepo({ userId: user.id });
  }
  await customersRepository.updateCustomerByUserIdRepo(user.id, { activatedAt: new Date() });
  await markOtpUsedRepo(record.id);
  return { ok: true };
};
