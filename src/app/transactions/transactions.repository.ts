import { Prisma, PrismaClient, RackStatus, TransactionStatus } from "@prisma/client";
import { queryPagination } from "../../utils/Pagination";
import { TransactionListFilterDTO } from "./transactions.dto";

const prisma = new PrismaClient();

export const createTransactionRepo = async (data: {
  userId?: string | null;
  rackId: string;
  price: number;
  finalPrice: number;
  promoApplied: boolean;
  qrCodeData: string;
  invoice: string;
}) => prisma.transaction.create({ data });

export const countTransactionByUserRepo = async (userId: string) => prisma.transaction.count({ where: { userId } });

export const listAllTransactionsRepo = async () =>
  prisma.transaction.findMany({ include: { customer: true, rack: true }, orderBy: { createdAt: 'desc' } });

export const listTransactionsByUserRepo = async (userId: string) =>
  prisma.transaction.findMany({ where: { userId }, include: { rack: true }, orderBy: { createdAt: 'desc' } });

export const getTransactionByIdRepo = async (id: string) =>
  prisma.transaction.findUnique({ where: { id }, include: { rack: true, customer: true } });

export const updateTransactionStatusRepo = async (id: string, status: TransactionStatus) =>
  prisma.transaction.update({ where: { id }, data: { status } });

export const updateTransactionRepo = async (id: string, data: Partial<{ status: TransactionStatus }>) =>
  prisma.transaction.update({ where: { id }, data });

export const getRackByIdRepo = async (id: string) => prisma.rack.findUnique({ where: { id } });

export const updateRackStatusRepo = async (id: string, status: RackStatus) =>
  prisma.rack.update({ where: { id }, data: { status } });

const buildTransactionWhere = (filters: TransactionListFilterDTO): Prisma.TransactionWhereInput => {
  const { endDate, maxPrice, minPrice, startDate, status, search } = filters || {};
  const where: Prisma.TransactionWhereInput = {};
  if (status) where.status = status;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) (where.createdAt as Prisma.DateTimeFilter).gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      (where.createdAt as Prisma.DateTimeFilter).lte = end;
    }
  }
  if (typeof minPrice === 'number' || typeof maxPrice === 'number') {
    where.price = {};
    if (typeof minPrice === 'number') (where.price).gte = minPrice;
    if (typeof maxPrice === 'number') (where.price).lte = maxPrice;
  }
  if (search && search.trim()) {
    where.invoice = { contains: search.trim(), mode: 'insensitive' };
  }
  return where;
};

export const listFilteredTransactionsRepo = async (
  query: TransactionListFilterDTO,
) => {
  return prisma.transaction.findMany({
    where: buildTransactionWhere(query),
    include: { customer: true, rack: true, items: true },
    orderBy: { createdAt: 'desc' },
    ...queryPagination(query)
  });
};

export const countFilteredTransactionsRepo = async (filters: TransactionListFilterDTO) =>
  prisma.transaction.count({ where: buildTransactionWhere(filters) });
