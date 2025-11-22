import { PrismaClient } from "@prisma/client";
import { Query } from "../../interface/Query";
import { queryPagination } from "../../utils/Pagination";

const prisma = new PrismaClient();

export const createRackRepo = async (data: {
  code: string;
  name?: string;
  description?: string;
}) => prisma.rack.create({ data });

export const getRacks = async (query: Query) => {
  const { search } = query;
  return prisma.rack.findMany({
    where: {
      ...(search && {
        OR: [
          {
            name: { contains: search, mode: "insensitive" },
          },
          {
            code: { contains: search, mode: "insensitive" },
          },
        ],
      }),
    },
    orderBy: { createdAt: "desc" },
    ...queryPagination(query),
  });
};
export const getRacksCount = async (query: Query) => {
  const { search } = query;
  return prisma.rack.count({
    where: {
      ...(search && {
        OR: [
          {
            name: { contains: search, mode: "insensitive" },
          },
          {
            code: { contains: search, mode: "insensitive" },
          },
        ],
      }),
    },
  });
};

export const getRackByIdRepo = async (id: string) =>
  prisma.rack.findUnique({ where: { id }, include: { TransactionItem: true } });

export const updateRackRepo = async (
  id: string,
  data: Partial<{ code: string; name?: string; description?: string }>
) => prisma.rack.update({ where: { id }, data });

export const removeRackRepo = async (id: string) =>
  prisma.rack.delete({ where: { id } });

export const getRackByCode = async (code: string) =>
  prisma.rack.findUnique({ where: { code } });
