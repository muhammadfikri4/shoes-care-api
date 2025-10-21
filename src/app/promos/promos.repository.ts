import { PrismaClient } from "@prisma/client";

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
    orderBy: { usedAt: 'desc' },
  });

export const getActivePromoForUserRepo = async (userId: string) =>
  prisma.promo.findFirst({
    where: { userId, used: false, isActive: true },
    orderBy: { createdAt: 'desc' },
  });

export const createPromoRepo = async (data: { userId: string; code: string; discountPercent?: number }) =>
  prisma.promo.create({ data: { userId: data.userId, code: data.code, discountPercent: data.discountPercent ?? 100, isActive: true } });
