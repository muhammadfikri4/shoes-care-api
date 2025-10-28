import { Role } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { config } from "../../libs";
import { MESSAGE_CODE } from "../../utils/error-code";
import { generateRandom } from "../../utils/generate-random";
import { ErrorApp } from "../../utils/http-error";
import { MESSAGES } from "../../utils/Messages";
import * as customersRepository from "../customers/customers.repository";
import { getOtpByIdRepo, markOtpUsedRepo } from "../otp/otp.repository";
import * as userRepository from "../users/users.repository";
import {
  CustomerOtpVerifyDTO,
  CustomerRegisterDTO,
  CustomerRegisterVerifyDTO,
  LoginDTO,
  RegisterDTO,
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
    // If customer, ensure activated
    if (data.role?.toString() === "CUSTOMER") {
      const customer = await customersRepository.getCustomerByUserIdRepo(
        user.id
      );
      if (!customer?.activatedAt) {
        return new ErrorApp(
          "Akun belum diaktifkan",
          403,
          MESSAGE_CODE.FORBIDDEN
        );
      }
    }
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
    await customersRepository.createCustomerRepo({ userId: user.id, name });
    await customersRepository.updateCustomerByUserIdRepo(user.id, {
      activatedAt: new Date(),
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
  const customer = await customersRepository.getCustomerByUserIdRepo(user.id);
  if (!customer)
    await customersRepository.createCustomerRepo({ userId: user.id, name });
  await customersRepository.updateCustomerByUserIdRepo(user.id, {
    activatedAt: new Date(),
  });
  return { ok: true };
};

export const customerRegisterVerify = async (
  data: CustomerRegisterVerifyDTO
) => {
  const { key, otp } = data;
  const record = await getOtpByIdRepo(key);
  if (!record)
    return new ErrorApp("OTP tidak ditemukan", 404, MESSAGE_CODE.NOT_FOUND);
  if (record.purpose !== "CUSTOMER_REGISTER")
    return new ErrorApp("OTP tidak valid", 400, MESSAGE_CODE.BAD_REQUEST);
  if (record.usedAt)
    return new ErrorApp("OTP sudah digunakan", 400, MESSAGE_CODE.BAD_REQUEST);
  if (new Date(record.expiresAt) < new Date())
    return new ErrorApp("OTP kedaluwarsa", 400, MESSAGE_CODE.BAD_REQUEST);
  if (record.code !== otp)
    return new ErrorApp("Kode OTP salah", 400, MESSAGE_CODE.BAD_REQUEST);

  // resolve user
  const user = record.userId
    ? await userRepository.getUserById(record.userId)
    : await userRepository.getUserByEmailAndRole(record.email, Role.CUSTOMER);
  if (!user)
    return new ErrorApp("User tidak ditemukan", 404, MESSAGE_CODE.NOT_FOUND);

  // update password from stored hash
  if (record.hashedPassword) {
    await userRepository.updateUser(user.id, {
      password: record.hashedPassword,
    });
  }
  // ensure customer profile and activate
  const customer = await customersRepository.getCustomerByUserIdRepo(user.id);
  if (!customer) {
    await customersRepository.createCustomerRepo({ userId: user.id });
  }
  await customersRepository.updateCustomerByUserIdRepo(user.id, {
    activatedAt: new Date(),
  });
  await markOtpUsedRepo(record.id);
  return { ok: true };
};
