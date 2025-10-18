import { PrismaClient, TransactionStatus } from "@prisma/client";

const prisma = new PrismaClient();

export const transactionsRepository = {
  create: async (data: {
    userId?: string | null;
    rackId: string;
    price: number;
    finalPrice: number;
    promoApplied: boolean;
    qrCodeData: string;
    invoice: string;
  }) => prisma.transaction.create({ data }),

  countByUser: async (userId: string) => prisma.transaction.count({ where: { userId } }),

  listAll: async () => prisma.transaction.findMany({ include: { customer: true, rack: true }, orderBy: { createdAt: 'desc' } }),
  listByUser: async (userId: string) => prisma.transaction.findMany({ where: { userId }, include: { rack: true }, orderBy: { createdAt: 'desc' } }),
  getById: async (id: string) => prisma.transaction.findUnique({ where: { id }, include: { rack: true, customer: true } }),
  updateStatus: async (id: string, status: TransactionStatus) => prisma.transaction.update({ where: { id }, data: { status } }),
  update: async (id: string, data: Partial<{ status: TransactionStatus }>) => prisma.transaction.update({ where: { id }, data }),

  getRackById: async (id: string) => prisma.rack.findUnique({ where: { id } }),
  updateRackStatus: async (id: string, status: any) => prisma.rack.update({ where: { id }, data: { status } }),
};

