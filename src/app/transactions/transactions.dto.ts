import { PaymentMethod, TransactionStatus } from "@prisma/client";
import { Query } from "../../interface/Query";

export interface CreateTransactionDTO {
  rackId: string;
  price?: number; // optional if items provided
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  paymentMethod?: PaymentMethod;
  usePromo?: boolean;
  promoCode?: string;
  items?: Array<{
    shoeName: string;
    price: number;
    qty?: number;
    days?: number;
    photoUrl?: string;
    note?: string;
  }>;
}

export interface ScanQRDTO {
  qr: string;
}

export interface VerifyPromoDTO {
  email: string;
  code: string;
}

export interface TransactionListFilterDTO extends Query {
  minPrice?: number;
  maxPrice?: number;
  status?: TransactionStatus;
  startDate?: string;
  endDate?: string;
}
