import { MESSAGE_CODE } from "../../utils/ErrorCode";
import { ErrorApp } from "../../utils/HttpError";
import { userRepository } from "../users/users.repository";
import { getPromoByCodeRepo } from "./promos.repository";

export const verifyPromoService = async (email: string, code: string) => {
  const user = await userRepository.getUserByEmail(email);
  if (!user) return new ErrorApp("User not found", 404, MESSAGE_CODE.NOT_FOUND);
  const promo = await getPromoByCodeRepo(code);
  if (!promo || promo.userId !== user.id) {
    return new ErrorApp("Promo code tidak valid", 400, MESSAGE_CODE.BAD_REQUEST);
  }
  if (!promo.isActive || promo.used) {
    return new ErrorApp("Promo code tidak aktif/terpakai", 400, MESSAGE_CODE.BAD_REQUEST);
  }
  return { valid: true, discountPercent: promo.discountPercent };
};

