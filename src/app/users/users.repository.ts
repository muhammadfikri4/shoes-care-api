import { PrismaClient, Role } from "@prisma/client";
import { RegisterDTO } from "../auth/auth.dto";
const prisma = new PrismaClient();

export const getUserByEmail = async (email: string) =>
  prisma.user.findFirst({ where: { email } });
export const getUserByEmailAndRole = async (email: string, role: Role) =>
  prisma.user.findFirst({ where: { email, role } });
export const getUserById = async (id: string) =>
  prisma.user.findUnique({ where: { id }, include: { Customer: true } });
export const createUser = async (data: RegisterDTO) =>
  prisma.user.create({ data });
export const createUserRaw = async (data: {
  email: string;
  name: string;
  password?: string | null;
}) => prisma.user.create({ data });
export const updateUser = async (userId: string, data: Partial<RegisterDTO>) =>
  prisma.user.update({ where: { id: userId }, data });
export const upsertCustomerByEmail = async (email: string, name?: string) => {
  const customer = await prisma.user.findFirst({
    where: { email, role: Role.CUSTOMER },
  });
  if (!customer) {
    return await prisma.user.create({
      data: { name: name || email, role: Role.CUSTOMER, email },
    });
  }
  return customer;
};

export const getCustomerRegisterByEmail = async (email: string) => {
  return prisma.user.findFirst({
    where: {
      email,
      role: Role.CUSTOMER,
      password: {
        not: null,
      },
      Customer: {
        isNot: null,
      },
    },
  });
};
