import { User } from "@prisma/client";
import { CustomerResponseDTO } from "./users.dto";

export const getUserProfile = (data: User) => {
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    role: data.role,
  };
};

export const getCustomerDTOMapper = (
  data: User & {
    _count: {
      transactionsAsCustomer: number;
      Promo: number;
    };
  }
): CustomerResponseDTO => {
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    totalTransactions: data._count.transactionsAsCustomer,
    totalPromos: data._count.Promo,
    totalCurrentTransactions: data.promoEligibilityCount,
  };
};
