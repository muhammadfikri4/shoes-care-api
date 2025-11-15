import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const createRackRepo = async (data: { code: string; name?: string; description?: string }) =>
  prisma.rack.create({ data });

export const listRacksRepo = async () => prisma.rack.findMany({ orderBy: { code: 'asc' } });

export const getRackByIdRepo = async (id: string) => prisma.rack.findUnique({ where: { id } });

export const updateRackRepo = async (
  id: string,
  data: Partial<{ code: string; name?: string; description?: string }>
) => prisma.rack.update({ where: { id }, data });

export const removeRackRepo = async (id: string) => prisma.rack.delete({ where: { id } });
