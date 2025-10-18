import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { config } from "../../libs";
import { MESSAGE_CODE } from "../../utils/ErrorCode";
import { generateRandom } from "../../utils/generate-random";
import { ErrorApp } from "../../utils/HttpError";
import { userRepository } from "../users/users.repository";
import { CustomerOtpVerifyDTO, LoginDTO, RegisterDTO } from "./auth.dto";

export const authService = {
  register: async (data: RegisterDTO) => {
    const hash = await bcrypt.hash(data.password, 10);
    const code = generateRandom(6)
    return userRepository.createUser({ ...data, password: hash, code});
  },

  login: async (data: LoginDTO) => {
    const user = await userRepository.getUserByEmail(data.email);
    if (!user || !user.password) {
      return new ErrorApp("Invalid credentials", 400, MESSAGE_CODE.BAD_REQUEST);
    }
    const ok = await bcrypt.compare(data.password, user.password);
    if (!ok) {
      return new ErrorApp("Invalid credentials", 400, MESSAGE_CODE.BAD_REQUEST);
    }
    const token = jwt.sign({ userId: user.id }, config.JWT_SECRET, { expiresIn: "7d" });
    return { token, user };
  },
  verifyCustomerOtp: async (data: CustomerOtpVerifyDTO) => {
    const user = await userRepository.getUserByEmail(data.email);
    if (!user) {
      return new ErrorApp("User not found", 404, MESSAGE_CODE.NOT_FOUND);
    }
    const token = jwt.sign({ userId: user.id }, config.JWT_SECRET, { expiresIn: "7d" });
    return { token, user };
  }
};
