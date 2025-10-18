import { PrismaClient, RackStatus } from "@prisma/client";

const prisma = new PrismaClient();

export const racksRepository = {
  create: async (data: { code: string; name?: string; location?: string; status?: RackStatus }) =>
    prisma.rack.create({ data }),
  list: async () => prisma.rack.findMany({ orderBy: { code: 'asc' } }),
  getById: async (id: string) => prisma.rack.findUnique({ where: { id } }),
  update: async (id: string, data: Partial<{ code: string; name?: string; location?: string; status?: RackStatus }>) =>
    prisma.rack.update({ where: { id }, data }),
  remove: async (id: string) => prisma.rack.delete({ where: { id } }),
};

