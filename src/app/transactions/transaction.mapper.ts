import { GetPublicURL } from "../../utils/upload-file-to-storage";
import { TransactionData } from "./transaction.interface";

export const getDetailTransactionDTOMapper = (
  userId: string,
  data: TransactionData
) => {
  return {
    id: data.id,
    code: data.code,
    status: data.status,
    price: data.price,
    finalPrice: data.finalPrice,
    promoApplied: data.promoApplied,
    paymentMethod: data.paymentMethod,
    createdAt: data.createdAt,
    customer: {
      name: data.customerName,
      email: data.customerEmail,
      phone: data.customerPhone,
    },
    items: (data.items || [])?.map((it) => ({
      id: it.id,
      name: it.name,
      price: it.price,
      photoUrl: it.file
        ? GetPublicURL(`transactions/shoes/${userId}/${it.file}`)
        : undefined,
      estimateDay: it.estimateDay,
      rackCode: it?.rack?.code,
    })),
    history:
      (data.TransactionHistory || [])?.map((h) => ({
        id: h.id,
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        note: h.note,
        changedAt: h.changedAt,
      })) ?? [],
  };
};
