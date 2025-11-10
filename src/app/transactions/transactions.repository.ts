import {
  PaymentMethod,
  PaymentStatus,
  Prisma,
  PrismaClient,
  RackStatus,
  TransactionStatus,
} from "@prisma/client";
import { queryPagination } from "../../utils/Pagination";
import {
  TransactionCreationDTO,
  TransactionListFilterDTO,
} from "./transactions.dto";

const prisma = new PrismaClient();

export const createTransactionRepo = async (data: {
  userId?: string | null;
  price: number;
  finalPrice: number;
  promoApplied: boolean;
  qrCodeData: string;
  code: string;
}) => prisma.transaction.create({ data });

export const countTransactionByUserRepo = async (userId: string) =>
  prisma.transaction.count({ where: { customerUserId: userId } });

export const listAllTransactionsRepo = async () =>
  prisma.transaction.findMany({
    include: { customerUser: true, createdByUser: true },
    orderBy: { createdAt: "desc" },
  });

export const listTransactionsByUserRepo = async (userId: string) =>
  prisma.transaction.findMany({
    where: { customerUserId: userId },
    orderBy: { createdAt: "desc" },
  });

export const getTransactionByIdRepo = async (id: string) =>
  prisma.transaction.findUnique({
    where: { id },
    include: { customerUser: true, createdByUser: true },
  });

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

export const createTransactionAtomicRepo = async (
  payload: TransactionCreationDTO
) => {
  const result = await prisma.$transaction(async (tx) => {
    const t = await tx.transaction.create({
      data: {
        code: payload.code,
        createdByUserId: payload.createdByUserId ?? undefined,
        customerUserId: payload.customerUserId,
        status:
          payload.paymentMethod === PaymentMethod.CASH
            ? TransactionStatus.IN_PROGRESS
            : TransactionStatus.CREATED,
        price: Number(payload.basePrice),
        finalPrice: Number(payload.finalPrice),
        promoApplied: payload.promoApplied,
        qrCodeData: payload.qrCodeData,
        customerName: payload.customerName,
        customerEmail: payload.customerEmail,
        customerPhone: payload.customerPhone,
        paymentMethod: payload.paymentMethod,
        paymentStatus: payload.paymentStatus ?? PaymentStatus.PENDING,
        paidAt: payload.paidAt,
        cashPaid: Number(payload.cashPaid),
        cashChange: Number(payload.cashChange),
        midtransToken: payload.midtransToken,
        midtransRedirectUrl: payload.midtransRedirectUrl,
        items: payload.items.length
          ? {
              create: payload.items.map((item) => ({
                ...item,
                price: Number(item.price),
                file: item.file as string,
              })),
            }
          : undefined,
      },
    });
    if (payload.promoIdToUse) {
      await tx.promo.update({
        where: { id: payload.promoIdToUse },
        data: { isUsed: true, usedAt: new Date() },
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

export const readyToPickupAtomicRepo = async (payload: {
  id: string;
  previousStatus: TransactionStatus;
}) => {
  await prisma.$transaction(async (tx) => {
    await tx.transaction.update({
      where: { id: payload.id },
      data: { status: TransactionStatus.READY_TO_PICKUP, readyAt: new Date() },
    });
    await tx.transactionHistory.create({
      data: {
        transactionId: payload.id,
        fromStatus: payload.previousStatus,
        toStatus: TransactionStatus.READY_TO_PICKUP,
        note: "Transaction ready for pickup",
      },
    });
  });
};

export const completeTransactionAtomicRepo = async (payload: {
  id: string;
  previousStatus: TransactionStatus;
  rackIds?: string[];
}) => {
  await prisma.$transaction(async (tx) => {
    await tx.transaction.update({
      where: { id: payload.id },
      data: { status: TransactionStatus.COMPLETED, pickedUpAt: new Date() },
    });
    if (payload.rackIds?.length) {
      for (const rid of payload.rackIds) {
        await tx.rack.update({
          where: { id: rid },
          data: { status: RackStatus.AVAILABLE },
        });
      }
    }
    await tx.transactionHistory.create({
      data: {
        transactionId: payload.id,
        fromStatus: payload.previousStatus,
        toStatus: TransactionStatus.COMPLETED,
        note: "Transaction marked completed",
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
  paymentStatus: PaymentStatus,
  paidAt?: Date,
  status?: TransactionStatus
) =>
  prisma.transaction.update({
    where: { code },
    data: { paymentStatus, paidAt, status },
  });

const buildTransactionWhere = (
  filters: TransactionListFilterDTO
): Prisma.TransactionWhereInput => {
  const {
    endDate,
    maxPrice,
    minPrice,
    startDate,
    status,
    search,
    createdByUserId,
    customerUserId,
  } = filters || {};
  const where: Prisma.TransactionWhereInput = {};
  if (createdByUserId) where.createdByUserId = createdByUserId;
  if (status) where.status = status;
  if (customerUserId) where.customerUserId = customerUserId;
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
  console.log({ where });
  return where;
};

export const listFilteredTransactionsRepo = async (
  query: TransactionListFilterDTO
) => {
  return prisma.transaction.findMany({
    where: buildTransactionWhere(query),
    include: { customerUser: true, createdByUser: true, items: true },
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
    customerUserId: userId,
    status: TransactionStatus.IN_PROGRESS,
  };
  if (since) {
    where.createdAt = { gte: since } as Prisma.DateTimeFilter;
  }
  return prisma.transaction.count({ where });
};

export const countTransactionsByCustomerEmailRepo = async (email: string) =>
  prisma.transaction.count({ where: { customerEmail: email } });
