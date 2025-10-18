export interface CreateTransactionDTO {
  rackId: string;
  price: number;
  customerEmail?: string;
  customerName?: string;
}

export interface ScanQRDTO {
  qr: string;
}
