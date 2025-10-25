import {
  PaymentMethod,
  PaymentStatus,
  Prisma,
  PrismaClient,
  RackStatus,
  TransactionStatus,
} from "@prisma/client";
import { queryPagination } from "../../utils/Pagination";
import { ProductItem, TransactionListFilterDTO } from "./transactions.dto";

const prisma = new PrismaClient();

export const createTransactionRepo = async (data: {
  userId?: string | null;
  rackId: string;
  price: number;
  finalPrice: number;
  promoApplied: boolean;
  qrCodeData: string;
  code: string;
}) => prisma.transaction.create({ data });

export const countTransactionByUserRepo = async (userId: string) =>
  prisma.transaction.count({ where: { userId } });

export const listAllTransactionsRepo = async () =>
  prisma.transaction.findMany({
    include: { customer: true },
    orderBy: { createdAt: "desc" },
  });

export const listTransactionsByUserRepo = async (userId: string) =>
  prisma.transaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

export const getTransactionByIdRepo = async (id: string) =>
  prisma.transaction.findUnique({ where: { id }, include: { customer: true } });

export const updateTransactionStatusRepo = async (
  id: string,
  status: TransactionStatus
) => prisma.transaction.update({ where: { id }, data: { status } });

export const updateTransactionRepo = async (
  id: string,
  data: Partial<{ status: TransactionStatus }>
) => prisma.transaction.update({ where: { id }, data });

export const getRackByIdRepo = async (id: string) =>
  prisma.rack.findUnique({ where: { id } });

export const updateRackStatusRepo = async (id: string, status: RackStatus) =>
  prisma.rack.update({ where: { id }, data: { status } });

export const createTransactionAtomicRepo = async (payload: {
  userId?: string | null;
  customerId?: string | undefined;
  basePrice: number;
  finalPrice: number;
  promoApplied: boolean;
  code: string;
  qrCodeData: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  paymentMethod?: PaymentMethod;
  items: ProductItem[];
  promoIdToUse?: string;
  paymentStatus?: PaymentStatus;
  paidAt?: Date;
  cashPaid?: number;
  cashChange?: number;
  midtransToken?: string;
  midtransRedirectUrl?: string;
}) => {
  const result = await prisma.$transaction(async (tx) => {
    const t = await tx.transaction.create({
      data: {
        code: payload.code,
        userId: payload.userId ?? undefined,
        customerId: payload.customerId,
        status: TransactionStatus.CREATED,
        price: payload.basePrice,
        finalPrice: payload.finalPrice,
        promoApplied: payload.promoApplied,
        qrCodeData: payload.qrCodeData,
        customerName: payload.customerName,
        customerEmail: payload.customerEmail,
        customerPhone: payload.customerPhone,
        paymentMethod: payload.paymentMethod,
        paymentStatus: payload.paymentStatus ?? PaymentStatus.PENDING,
        paidAt: payload.paidAt,
        cashPaid: payload.cashPaid,
        cashChange: payload.cashChange,
        midtransToken: payload.midtransToken,
        midtransRedirectUrl: payload.midtransRedirectUrl,
        items: payload.items.length
          ? {
              create: payload.items.map((item) => ({
                ...item,
                file: item.file as string,
              })),
            }
          : undefined,
      },
    });
    if (payload.promoIdToUse) {
      await tx.promo.update({
        where: { id: payload.promoIdToUse },
        data: { used: true, usedAt: new Date() },
      });
    }
    await tx.transactionHistory.create({
      data: {
        transactionId: t.id,
        fromStatus: null,
        toStatus: TransactionStatus.CREATED,
        note: "Transaction created",
      },
    });
    return t;
  });
  return result;
};

export const getTransactionByInvoiceRepo = async (code: string) =>
  prisma.transaction.findUnique({ where: { code }, include: { items: true } });

export const pickupTransactionAtomicRepo = async (payload: {
  id: string;
  rackId?: string | null;
  previousStatus: TransactionStatus;
}) => {
  await prisma.$transaction(async (tx) => {
    await tx.transaction.update({
      where: { id: payload.id },
      data: { status: TransactionStatus.COMPLETED, pickedUpAt: new Date() },
    });
    if (payload.rackId) {
      await tx.rack.update({
        where: { id: payload.rackId },
        data: { status: RackStatus.AVAILABLE },
      });
    }
    await tx.transactionHistory.create({
      data: {
        transactionId: payload.id,
        fromStatus: payload.previousStatus,
        toStatus: TransactionStatus.COMPLETED,
        note: "Shoes picked up via QR scan",
      },
    });
  });
};

export const findTransactionDetailByInvoiceRepo = async (code: string) =>
  prisma.transaction.findUnique({
    where: { code },
    include: {
      items: { include: { rack: true } },
      TransactionHistory: { orderBy: { changedAt: "asc" } },
    },
  });
export const getTransactionById = async (transactionId: string) =>
  prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      items: { include: { rack: true } },
      TransactionHistory: { orderBy: { changedAt: "asc" } },
    },
  });

export const updatePaymentStatusByInvoiceRepo = async (
  code: string,
  status: PaymentStatus,
  paidAt?: Date
) =>
  prisma.transaction.update({
    where: { code },
    data: { paymentStatus: status, paidAt },
  });

const buildTransactionWhere = (
  filters: TransactionListFilterDTO
): Prisma.TransactionWhereInput => {
  const { endDate, maxPrice, minPrice, startDate, status, search } =
    filters || {};
  const where: Prisma.TransactionWhereInput = {};
  if (status) where.status = status;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate)
      (where.createdAt as Prisma.DateTimeFilter).gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      (where.createdAt as Prisma.DateTimeFilter).lte = end;
    }
  }
  if (typeof minPrice === "number" || typeof maxPrice === "number") {
    where.price = {};
    if (typeof minPrice === "number") where.price.gte = minPrice;
    if (typeof maxPrice === "number") where.price.lte = maxPrice;
  }
  if (search && search.trim()) {
    where.code = { contains: search.trim(), mode: "insensitive" };
  }
  return where;
};

export const listFilteredTransactionsRepo = async (
  query: TransactionListFilterDTO
) => {
  return prisma.transaction.findMany({
    where: buildTransactionWhere(query),
    include: { customer: true, items: true },
    orderBy: { createdAt: "desc" },
    ...queryPagination(query),
  });
};

export const countFilteredTransactionsRepo = async (
  filters: TransactionListFilterDTO
) => prisma.transaction.count({ where: buildTransactionWhere(filters) });

export const countCompletedTransactionsByUserSinceRepo = async (
  userId: string,
  since?: Date
) => {
  const where: Prisma.TransactionWhereInput = {
    userId,
    status: TransactionStatus.COMPLETED,
  };
  if (since) {
    where.createdAt = { gte: since } as Prisma.DateTimeFilter;
  }
  return prisma.transaction.count({ where });
};
