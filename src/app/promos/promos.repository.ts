import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getPromoByCodeRepo = async (code: string) =>
  prisma.promo.findUnique({ where: { code } });

export const markPromoUsedRepo = async (id: string) =>
  prisma.promo.update({ where: { id }, data: { used: true, usedAt: new Date() } });

