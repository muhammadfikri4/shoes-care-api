import {
  PaymentMethod,
  TransactionStatus,
} from "@prisma/client";
import { Query } from "../../interface/Query";

// Input shape for items in CreateTransactionDTO (aligned with request schema)
export interface ProductItem {
  name: string;
  price: number;
  estimateDay?: number;
  file: Express.Multer.File | string;
  note?: string;
  // Backward compatibility (if some callers send these):
  rackId: string;
}

export interface CreateTransactionDTO {
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  paymentMethod?: PaymentMethod;
  usePromo?: boolean;
  promoCode?: string;
  cashPaid?: number;
  items?: ProductItem[];
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
  customerUserId?: string;
  createdByUserId?: string;
}

export interface MidtransVANumber {
  va_number: string;
  bank: string;
}

export interface MidtransTransactionDTO {
  va_numbers?: MidtransVANumber[];
  transaction_type?: string;
  transaction_time?: string;
  transaction_status?: string;
  transaction_id?: string;
  status_message?: string;
  status_code?: string;
  signature_key?: string;
  settlement_time?: string;
  reference_id?: string;
  payment_type?: string;
  order_id?: string;
  merchant_id?: string;
  store?: string;
  issuer?: string;
  gross_amount?: string;
  fraud_status?: string;
  expiry_time?: string;
  currency?: string;
  acquirer?: string;
  va?: VirtualAccountType;

  masked_card?: string;
  card_type?: string;
  three_ds_version?: string;
  channel_response_code?: string;
  channel_response_message?: string;
  bank?: string;
  eci?: string;
  saved_token_id?: string;
  saved_token_id_expired_at?: string;
  approval_code?: string;
  installment_term?: string;
}

export interface VirtualAccountType {
  permata_va?: string;
  bca_va?: string;
  mandiri_va?: string;
  bri_va?: string;
  bni_va?: string;
  bsi_va?: string;
  danamaon_va?: string;
  cimb_va?: string;
}

export interface ItemDetail {
  price: number;
  quantity: number;
  name: string;
}

export interface MidtransCreationDTO {
  transaction_id?: string;
  transaction_details?: {
    order_id?: string;
    gross_amount?: number;
  };
  customer_details?: {
    name?: string;
    email?: string;
  };
  item_details?: ItemDetail[];
  callbacks?: {
    finish: string;
    error: string;
    pending: string;
  };
}

export interface MidtransResponse {
  token?: string;
  redirect_url: string;
}

// Generic DTO for status update endpoints
export interface TransactionIdDTO {
  id: string;
}

export interface PaymentPayload {
  paidAt: Date | undefined;
  cashPaid: number | undefined;
  cashChange: number | undefined;
}

export interface TransactionCreationDTO {
  createdByUserId?: string | null;
  customerUserId?: string | undefined;
  basePrice: number;
  finalPrice: number;
  promoApplied: boolean;
  code: string;
  qrCodeData: string;
  qrCodeUrl?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  paymentMethod?: PaymentMethod;
  items: ProductItem[];
  promoIdToUse?: string;
  paidAt?: Date;
  cashPaid?: number;
  cashChange?: number;
  midtransToken?: string;
  midtransRedirectUrl?: string;
}
