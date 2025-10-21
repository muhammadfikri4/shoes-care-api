import { PrismaClient } from "@prisma/client";
import { RegisterDTO } from "../auth/auth.dto";
const prisma = new PrismaClient();

export const getUserByEmail = async(email: string) => prisma.user.findUnique({ where: { email } })
export const getUserById = async(id: string) => prisma.user.findUnique({ where: { id } })
export const   createUser = async(data: RegisterDTO) =>
  prisma.user.create({ data })
export const updateUser =  async(userId: string, data: Partial<RegisterDTO>) =>
  prisma.user.update({ where: { id: userId }, data })
export const upsertCustomerByEmail = async(email: string, name?: string) => prisma.user.upsert({
  where: { email },
  create: { email, name: name || email },
  update: {},
})
