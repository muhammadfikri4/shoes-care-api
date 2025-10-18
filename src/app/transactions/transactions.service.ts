import { MESSAGE_CODE } from "../../utils/ErrorCode";
import { ErrorApp } from "../../utils/HttpError";
import { userRepository } from "../users/users.repository";
import { CreateTransactionDTO, ScanQRDTO } from "./transactions.dto";
import { transactionsRepository } from "./transactions.repository";
import QRCode from "qrcode";
import { transporter } from "../../utils/MailerConfig";
import { config } from "../../libs";
import { PrismaClient, RackStatus, TransactionStatus } from "@prisma/client";

const prisma = new PrismaClient();

const generateInvoice = () => {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = Math.random().toString().slice(2, 8);
  return `INV-${y}${m}${d}-${rand}`;
};

export const transactionsService = {
  create: async (data: CreateTransactionDTO) => {
    const rack = await transactionsRepository.getRackById(data.rackId);
    if (!rack) return new ErrorApp("Rack not found", 404, MESSAGE_CODE.NOT_FOUND);
    if (rack.status !== RackStatus.AVAILABLE) {
      return new ErrorApp("Rack not available", 400, MESSAGE_CODE.BAD_REQUEST);
    }

    let userId: string | null | undefined = undefined;
    let snapName: string | undefined = undefined;
    let snapEmail: string | undefined = undefined;
    if (data.customerEmail) {
      const user = await userRepository.upsertCustomerByEmail(data.customerEmail, data.customerName);
      userId = user.id;
      snapName = user.name ?? data.customerName ?? undefined;
      snapEmail = user.email;
    }

    const count = userId ? await transactionsRepository.countByUser(userId) : 0;
    const promoApplied = userId ? ((count + 1) % 10 === 0) : false;
    const finalPrice = promoApplied ? 0 : data.price;
    const invoice = generateInvoice();

    // Use a transaction to ensure rack update and transaction creation are atomic
    const created = await prisma.$transaction(async (tx) => {
      const qrCodeData = `sc-pos:tx:${invoice}`;
      const t = await tx.transaction.create({
        data: {
          invoice,
          userId: userId ?? undefined,
          rackId: data.rackId,
          status: TransactionStatus.CREATED,
          price: data.price,
          finalPrice,
          promoApplied,
          qrCodeData,
          customerName: snapName,
          customerEmail: snapEmail,
        },
      });
      await tx.rack.update({ where: { id: data.rackId }, data: { status: RackStatus.OCCUPIED } });
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
  },
  listAll: async () => transactionsRepository.listAll(),
  listByUser: async (userId: string) => transactionsRepository.listByUser(userId),
  scanPickup: async (data: ScanQRDTO) => {
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
  },
  lookup: async (params: { qr?: string; invoice?: string }) => {
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
    const trx = await prisma.transaction.findUnique({ where: { invoice }, include: { rack: true } });
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
    };
  },
};
