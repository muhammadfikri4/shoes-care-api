import { Query } from "../../interface/Query";

export interface UpdateProfileDTO {
  name: string;
}

export interface GetCustomersQueryDTO extends Query {
  search?: string;
}

export interface CustomerResponseDTO {
  id: string;
  name: string;
  email: string;
  totalTransactions: number;
  totalCurrentTransactions: number;
  totalPromos: number;
}
