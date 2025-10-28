import { PrismaClient } from "@prisma/client";
import { PromosQueryParams } from "./promos.interface";
import { queryPagination } from "../../utils/Pagination";

const prisma = new PrismaClient();

export const getPromoByCodeRepo = async (code: string) =>
  prisma.promo.findUnique({ where: { code } });

export const markPromoUsedRepo = async (id: string) =>
  prisma.promo.update({
    where: { id },
    data: { used: true, usedAt: new Date() },
  });

export const getPromoByCustomerId = async (userId: string, code: string) =>
  prisma.promo.findFirst({
    where: { userId, used: false, usedAt: null, code },
  });

export const getLastUsedPromoByUserRepo = async (userId: string) =>
  prisma.promo.findFirst({
    where: { userId, used: true, usedAt: { not: null } },
    orderBy: { usedAt: "desc" },
  });

export const getActivePromoForUserRepo = async (userId: string) =>
  prisma.promo.findFirst({
    where: { userId, used: false, isActive: true },
    orderBy: { createdAt: "desc" },
  });

export const createPromoRepo = async (data: {
  userId: string;
  code: string;
  discountPercent?: number;
}) =>
  prisma.promo.create({
    data: {
      userId: data.userId,
      code: data.code,
      discountPercent: data.discountPercent ?? 100,
      isActive: true,
    },
  });

export const getPromos = async (query: PromosQueryParams) => {
  const { search, userId } = query;
  return prisma.promo.findMany({
    where: {
      ...(search && {
        code: {
          contains: search,
          mode: "insensitive",
        },
      }),
      ...(userId && { userId }),
    },
    include: { user: true },
    orderBy: { createdAt: "desc" },
    ...queryPagination(query),
  });
};

export const getPromosCount = async (query: PromosQueryParams) => {
  const { search, userId } = query;
  return prisma.promo.count({
    where: {
      ...(search && {
        code: {
          contains: search,
          mode: "insensitive",
        },
      }),
      ...(userId && { userId }),
    },
  });
};

export const checkPromoForUserRepo = async (userId: string, code: string) =>
  prisma.promo.findFirst({
    where: { userId, code, isActive: true, used: false },
  });
