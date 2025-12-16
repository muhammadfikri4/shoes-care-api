import QRCode from "qrcode";
import { GetPublicURL } from "../../utils/upload-file-to-storage";
import { TransactionData } from "./transaction.interface";

/**
 * Resolve QR code URL with fallback logic
 * - If qrCodeUrl from bucket is available, use it
 * - Otherwise, generate QR code from qrData as data URI
 */
const resolveQrCodeUrl = async (
  qrCodeUrl: string | null | undefined,
  qrData: string
): Promise<string | undefined> => {
  if (qrCodeUrl) {
    return qrCodeUrl;
  }
  try {
    const dataUri = await QRCode.toDataURL(qrData, {
      width: 256,
      margin: 1,
      errorCorrectionLevel: "M",
      type: "image/png",
    });
    return dataUri;
  } catch (error) {
    console.error("Failed to generate fallback QR code:", error);
    return undefined;
  }
};

export const getDetailTransactionDTOMapper = async (
  userId: string,
  data: TransactionData
) => {
  const qrCodeUrl = await resolveQrCodeUrl(data.qrCodeUrl, data.qrCodeData);

  return {
    id: data.id,
    code: data.code,
    status: data.status,
    price: Number(data.price),
    finalPrice: Number(data.finalPrice),
    promoApplied: data.promoApplied,
    discount: data.promo?.discountPercent || 0,
    paymentMethod: data.paymentMethod,
    qrCodeUrl,
    createdAt: data.createdAt,
    customer: {
      name: data.customerName,
      email: data.customerEmail,
      phone: data.customerPhone,
    },
    items: (data.items || [])?.map((it) => ({
      id: it.id,
      name: it.name,
      price: Number(it.price),
      photoUrl: it.file
        ? GetPublicURL(`transactions/shoes/${userId}/${it.file}`)
        : undefined,
      estimateDay: it.estimateDay,
      size: it.size,
      rackCode: it?.rack?.code,
      status: it.status,
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
