import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const createOtpRepo = async (data: {
  email: string;
  userId?: string | null;
  purpose: string;
  code: string;
  hashedPassword?: string | null;
  expiresAt: Date;
}) => prisma.otp.create({ data });

export const getOtpByIdRepo = async (id: string) => prisma.otp.findUnique({ where: { id } });

export const markOtpUsedRepo = async (id: string) =>
  prisma.otp.update({ where: { id }, data: { usedAt: new Date() } });

