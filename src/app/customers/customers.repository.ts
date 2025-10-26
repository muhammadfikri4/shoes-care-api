import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getCustomerByUserIdRepo = async (userId: string) =>
  prisma.customer.findUnique({ where: { userId } });

export const createCustomerRepo = async (data: {
  userId: string;
  name?: string;
  phone?: string;
}) => prisma.customer.create({ data });

export const getCustomerByEmail = async (email: string) =>
  prisma.customer.findFirst({
    where: {
      user: {
        email,
      },
    },
  });

export const updateCustomerByUserIdRepo = async (
  userId: string,
  data: Partial<{
    activatedAt: Date | null;
    activationCode: string | null;
    activationExpiresAt: Date | null;
    name?: string | null;
    phone?: string | null;
  }>
) => prisma.customer.update({ where: { userId }, data });
