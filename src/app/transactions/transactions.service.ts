import { MESSAGE_CODE } from "../../utils/ErrorCode";
import { ErrorApp } from "../../utils/HttpError";
import { userRepository } from "../users/users.repository";
import { CreateTransactionDTO, ScanQRDTO, TransactionListFilterDTO, VerifyPromoDTO } from "./transactions.dto";
import {
  countTransactionByUserRepo,
  getRackByIdRepo,
  listFilteredTransactionsRepo,
  listTransactionsByUserRepo,
  countFilteredTransactionsRepo,
} from "./transactions.repository";
import QRCode from "qrcode";
import { transporter } from "../../utils/MailerConfig";
import { config } from "../../libs";
import { PaymentMethod, PrismaClient, RackStatus, TransactionStatus } from "@prisma/client";
import { createCustomerRepo, getCustomerByUserIdRepo } from "../customers/customers.repository";
import { getPromoByCodeRepo, markPromoUsedRepo } from "../promos/promos.repository";
import { verifyPromoService } from "../promos/promos.service";
import { Meta } from "../../utils/Meta";
import { uploadBuffer } from "../../utils/Cloudinary";

const prisma = new PrismaClient();

const generateInvoice = () => {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = Math.random().toString().slice(2, 8);
  return `INV-${y}${m}${d}-${rand}`;
};

export const createTransaction = async (data: CreateTransactionDTO) => {
    const rack = await getRackByIdRepo(data.rackId);
    if (!rack) return new ErrorApp("Rack not found", 404, MESSAGE_CODE.NOT_FOUND);
    if (rack.status !== RackStatus.AVAILABLE) {
      return new ErrorApp("Rack not available", 400, MESSAGE_CODE.BAD_REQUEST);
    }

    let userId: string | null | undefined = undefined;
    let snapName: string | undefined = undefined;
    let snapEmail: string | undefined = undefined;
    let customerRecordId: string | undefined = undefined;
    if (data.customerEmail) {
      const user = await userRepository.upsertCustomerByEmail(
        data.customerEmail,
        data.customerName
      );
      userId = user.id;
      snapName = user.name ?? data.customerName ?? undefined;
      snapEmail = user.email;
      // ensure customer record exists
      const existingCustomer = await getCustomerByUserIdRepo(user.id);
      if (existingCustomer) customerRecordId = existingCustomer.id;
      else customerRecordId = (await createCustomerRepo({ userId: user.id, name: snapName, phone: data.customerPhone })).id;
    }

    const count = userId ? await countTransactionByUserRepo(userId) : 0;
    const promoByCount = userId ? ((count + 1) % 10 === 0) : false;
    const basePriceFromItems = Array.isArray(data.items) ? data.items.reduce((acc, it) => acc + (it.price || 0) * (it.qty || 1), 0) : undefined;
    const basePrice = typeof data.price === 'number' ? data.price : (basePriceFromItems ?? 0);
    // Validate promo code ownership if usePromo flagged
    let promoApplied = promoByCount;
    let promoIdToUse: string | undefined;
    if (data.usePromo && data.promoCode && data.customerEmail) {
      const verified = await verifyPromoService(data.customerEmail, data.promoCode);
      if (verified instanceof Error) return verified;
      promoApplied = true;
      const promo = await getPromoByCodeRepo(data.promoCode);
      promoIdToUse = promo?.id;
    } else if (data.usePromo) {
      return new ErrorApp("Promo code dan email diperlukan", 400, MESSAGE_CODE.BAD_REQUEST);
    }
    const finalPrice = promoApplied ? 0 : basePrice;
    const invoice = generateInvoice();

    // Use a transaction to ensure rack update and transaction creation are atomic
    const created = await prisma.$transaction(async (tx) => {
      const qrCodeData = `sc-pos:tx:${invoice}`;
      // Map uploaded files (if any)
      const itemsData = Array.isArray(data.items) ? data.items : [];
      const uploadedFiles = (data). || [];
      if (uploadedFiles.length && itemsData.length) {
        // upload each buffer to cloudinary
        for (let i = 0; i < itemsData.length; i++) {
          const fi = uploadedFiles[i];
          if (fi && fi.buffer) {
            try {
              const up = await uploadBuffer(fi.buffer, fi.originalname);
              itemsData[i] = { ...itemsData[i], photoUrl: up.url } as any;
            } catch (e) {
              // ignore upload failure per item
              console.error('Upload photo failed', e);
            }
          }
        }
      }

      const t = await tx.transaction.create({
        data: {
          invoice,
          userId: userId ?? undefined,
          customerId: customerRecordId,
          rackId: data.rackId,
          status: TransactionStatus.CREATED,
          price: basePrice,
          finalPrice,
          promoApplied,
          qrCodeData,
          customerName: snapName,
          customerEmail: snapEmail,
          customerPhone: data.customerPhone,
          paymentMethod: data.paymentMethod as PaymentMethod | undefined,
          items: Array.isArray(itemsData) && itemsData.length > 0 ? {
            create: itemsData.map((it: any) => ({
              name: it.shoeName,
              qty: it.qty ?? 1,
              unitPrice: it.price,
              lineTotal: (it.qty ?? 1) * it.price,
              estimateDays: it.days,
              photoUrl: it.photoUrl,
              note: it.note,
            }))
          } : undefined,
        },
      });
      await tx.rack.update({ where: { id: data.rackId }, data: { status: RackStatus.OCCUPIED } });
      if (promoIdToUse) {
        await tx.promo.update({ where: { id: promoIdToUse }, data: { used: true, usedAt: new Date() } });
      }
      await tx.transactionHistory.create({
        data: {
          transactionId: t.id,
          previousStatus: null,
          newStatus: TransactionStatus.CREATED,
          note: 'Transaction created',
        },
      });
      return t;
    });

    // Generate QR image and email customer if email present
    if (data.customerEmail) {
      try {
        const dataUrl = await QRCode.toDataURL(created.qrCodeData, { errorCorrectionLevel: 'M', margin: 2, width: 300 });
        await transporter.sendMail({
          to: data.customerEmail,
          from: config.EMAIL_SENDER,
          subject: `ShoesCare Transaksi ${created.invoice}`,
          html: `<p>Terima kasih. Berikut QR untuk pengambilan cucian:</p><img src="${dataUrl}" alt="QR Code" /><p>Invoice: ${created.invoice}</p>`
        });
      } catch (e) {
        console.error('Failed to send QR email', e);
      }
    }

    return created;
  };

export const listTransactions = async (
  query: TransactionListFilterDTO = {},
) => {
  const {page = '1', perPage = '10'} = query;
  const [rows, total] = await Promise.all([
    listFilteredTransactionsRepo(query),
    countFilteredTransactionsRepo(query),
  ]);
  const meta = Meta(Number(page), Number(perPage), total);
  const data = rows.map((t) => ({
    ...t,
    quantityShoes: t.items?.reduce((acc, it) => acc + (it.qty || 0), 0) ?? 0,
  }));
  return { data, meta };
};

export const listTransactionsByUser = async (userId: string) => listTransactionsByUserRepo(userId);

export const scanPickup = async (data: ScanQRDTO) => {
    // qr expected format sc-pos:tx:{invoice}
    const parts = data.qr.split(':');
    if (parts.length !== 3 || parts[0] !== 'sc-pos' || parts[1] !== 'tx') {
      return new ErrorApp("QR tidak valid", 400, MESSAGE_CODE.BAD_REQUEST);
    }
    const invoice = parts[2];
    const trx = await prisma.transaction.findUnique({ where: { invoice } });
    if (!trx) return new ErrorApp("Transaksi tidak ditemukan", 404, MESSAGE_CODE.NOT_FOUND);
    if (trx.status === TransactionStatus.PICKED_UP) {
      return new ErrorApp("Transaksi sudah diambil", 400, MESSAGE_CODE.BAD_REQUEST);
    }
    await prisma.$transaction(async (tx) => {
      await tx.transaction.update({ where: { id: trx.id }, data: { status: TransactionStatus.PICKED_UP, pickedUpAt: new Date() } });
      if (trx.rackId) {
        await tx.rack.update({ where: { id: trx.rackId }, data: { status: RackStatus.AVAILABLE } });
      }
      await tx.transactionHistory.create({
        data: {
          transactionId: trx.id,
          previousStatus: trx.status,
          newStatus: TransactionStatus.PICKED_UP,
          note: 'Shoes picked up via QR scan',
        },
      });
    });
  return { ok: true };
  };

export const lookupTransaction = async (params: { qr?: string; invoice?: string }) => {
    let invoice: string | undefined = params.invoice;
    if (params.qr && !invoice) {
      const parts = params.qr.split(':');
      if (parts.length === 3 && parts[0] === 'sc-pos' && parts[1] === 'tx') {
        invoice = parts[2];
      } else {
        return new ErrorApp("QR tidak valid", 400, MESSAGE_CODE.BAD_REQUEST);
      }
    }
    if (!invoice) {
      return new ErrorApp("Parameter invoice atau qr diperlukan", 400, MESSAGE_CODE.BAD_REQUEST);
    }
    const trx = await prisma.transaction.findUnique({
      where: { invoice },
      include: { rack: true, items: true, TransactionHistory: { orderBy: { changedAt: 'asc' } } },
    });
    if (!trx) return new ErrorApp("Transaksi tidak ditemukan", 404, MESSAGE_CODE.NOT_FOUND);
    return {
      id: trx.id,
      invoice: trx.invoice,
      status: trx.status,
      rack: trx.rack ? { id: trx.rack.id, code: trx.rack.code, name: trx.rack.name } : null,
      price: trx.price,
      finalPrice: trx.finalPrice,
      promoApplied: trx.promoApplied,
      customerName: trx.customerName,
      customerEmail: trx.customerEmail,
      createdAt: trx.createdAt,
      updatedAt: trx.updatedAt,
      items: trx.items?.map(it => ({ id: it.id, name: it.name, qty: it.qty, unitPrice: it.unitPrice, lineTotal: it.lineTotal })) ?? [],
      history: trx.TransactionHistory?.map(h => ({
        id: h.id,
        previousStatus: h.previousStatus,
        newStatus: h.newStatus,
        note: h.note,
        changedAt: h.changedAt,
      })) ?? [],
    };
  };

export const verifyPromo = async (data: VerifyPromoDTO) => verifyPromoService(data.email, data.code);
