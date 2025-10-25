import {
  Rack,
  Transaction,
  TransactionHistory,
  TransactionItem,
} from "@prisma/client";

export interface TransactionData extends Transaction {
  items: Array<
    TransactionItem & {
      rack: Rack;
    }
  >;
  TransactionHistory: TransactionHistory[];
}
