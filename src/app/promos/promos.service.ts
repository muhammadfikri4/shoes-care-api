import { Role } from "@prisma/client";
import { MESSAGE_CODE } from "../../utils/error-code";
import { ErrorApp } from "../../utils/http-error";
import { Meta } from "../../utils/Meta";
import * as userRepository from "../users/users.repository";
import { PromoCheckResponse } from "./promos.dto";
import { PromosQueryParams } from "./promos.interface";
import {
  checkPromoForUserRepo,
  getPromoByCodeRepo,
  getPromos,
  getPromosCount,
} from "./promos.repository";

export const verifyPromoService = async (email: string, code: string) => {
  const user = await userRepository.getUserByEmailAndRole(email, Role.CUSTOMER);
  if (!user) return new ErrorApp("User not found", 404, MESSAGE_CODE.NOT_FOUND);
  const promo = await getPromoByCodeRepo(code);
  if (!promo || promo.userId !== user.id) {
    return new ErrorApp(
      "Promo code tidak valid",
      400,
      MESSAGE_CODE.BAD_REQUEST
    );
  }
  if (!promo.isActive || promo.isUsed) {
    return new ErrorApp(
      "Promo code tidak aktif/terpakai",
      400,
      MESSAGE_CODE.BAD_REQUEST
    );
  }
  return { valid: true, discountPercent: promo.discountPercent };
};

export const listPromosService = async (
  userId: string,
  query: PromosQueryParams
) => {
  const { page = "1", perPage = "10" } = query;
  const user = await userRepository.getUserById(userId);
  if (!user) {
    return new ErrorApp("User not found", 404, MESSAGE_CODE.NOT_FOUND);
  }
  const [promos, totalData] = await Promise.all([
    getPromos({
      ...query,
      ...(user.role === Role.CUSTOMER && {
        userId: user.id,
      }),
    }),
    getPromosCount({
      ...query,
      ...(user.role === Role.CUSTOMER && {
        userId: user.id,
      }),
    }),
  ]);

  const meta = Meta(Number(page), Number(perPage), totalData);
  return { data: promos, meta };
};

export const checkPromoByCodeService = async (
  userId: string,
  code: string
): Promise<PromoCheckResponse | ErrorApp> => {
  if (!userId)
    return new ErrorApp("Unauthorized", 401, MESSAGE_CODE.UNAUTHORIZED);
  const user = await userRepository.getUserById(userId);
  if (!user) {
    return new ErrorApp("User not found", 404, MESSAGE_CODE.NOT_FOUND);
  }
  const promo = await checkPromoForUserRepo(
    code,
    user.role === Role.CUSTOMER ? userId : undefined
  );
  if (!promo)
    return new ErrorApp(
      "Promo code tidak valid",
      400,
      MESSAGE_CODE.BAD_REQUEST
    );
  return {
    valid: true,
    code: promo.code,
    discountPercent: promo.discountPercent ?? 100,
  };
};
