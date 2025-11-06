import nodemailer from "nodemailer";
import { config } from "../libs";
import { MailOptions } from "nodemailer/lib/smtp-pool";
import QRCode from "qrcode";
import { buildInvoiceHtml, buildPromoHtml, buildResetPasswordHtml, message } from "./template";

export const transporter = nodemailer.createTransport({
  host: config.SMTP_HOST,
  port: config.SMTP_PORT,
  secure: false,
  auth: {
    user: config.SMTP_LOGIN,
    pass: config.SMTP_PASSWORD,
  },
} as MailOptions);
// export const transporter = nodemailer.createTransport({
//     service: 'gmail',
//     host: 'smtp.gmail.com',
//     auth: {
//         user: 'muhfikriantoaji@gmail.com',
//         pass: 'qvzs ugvq unss wbwq'
//     }
// });

export const SendEmail = async (to: string, name: string, otp: number) => {
  return await transporter.sendMail({
    to,
    from: config.EMAIL_SENDER,
    subject: "OTP Verification",
    html: message(name, otp),
  });
};

export const SendPromoCodeEmail = async (
  to: string,
  name: string,
  code: string,
  discountPercent = 100
) => {
  const html = buildPromoHtml({ name, code, discountPercent });
  return transporter.sendMail({
    to,
    from: config.EMAIL_SENDER,
    subject: `Kode Promo Anda: ${code}`,
    html,
  });
};

export const SendTransactionNotificationEmail = async (payload: {
  to: string;
  name?: string;
  code: string;
  qrData: string;
  trackingUrl?: string;
  amount?: number;
  paymentMethod?: string;
  midtransUrl?: string;
}) => {
  const {
    to,
    name,
    code,
    qrData,
    trackingUrl,
    amount,
    paymentMethod,
    midtransUrl,
  } = payload;

  const qrPng: Buffer | undefined = await QRCode.toBuffer(qrData, {
    width: 256,
    margin: 1,
    errorCorrectionLevel: "M",
    type: "png",
  });

  const html = buildInvoiceHtml({
    title: "Invoice Transaksi",
    subtitle: "Transaksi berhasil dibuat",
    code,
    name,
    amount,
    email: undefined,
    paymentMethod,
    trackingUrl,
    actionUrl: midtransUrl,
    actionLabel: "Bayar via Midtrans",
    qrCid: qrPng ? "qr-pickup" : undefined,
  });

  return transporter.sendMail({
    to,
    from: config.EMAIL_SENDER,
    subject: `Invoice ${code} dibuat`,
    html,
    attachments: qrPng
      ? [
          {
            filename: "qr.png",
            content: qrPng,
            contentType: "image/png",
            cid: "qr-pickup",
          },
        ]
      : [],
  });
};

export const SendPaymentSuccessEmail = async (payload: {
  to: string;
  name?: string;
  code: string;
  qrData: string;
  trackingUrl?: string;
  amount?: number;
}) => {
  const { to, name, code, qrData, trackingUrl, amount } = payload;
  const qrPng: Buffer | undefined = await QRCode.toBuffer(qrData, {
    width: 256,
    margin: 1,
    errorCorrectionLevel: "M",
    type: "png",
  });
  const html = buildInvoiceHtml({
    title: "Pembayaran Berhasil",
    subtitle: "Terima kasih, pembayaran Anda sudah kami terima",
    code,
    name,
    amount,
    trackingUrl,
    qrCid: qrPng ? "qr-pickup" : undefined,
  });
  return transporter.sendMail({
    to,
    from: config.EMAIL_SENDER,
    subject: `Pembayaran invoice ${code} diterima`,
    html,
    attachments: qrPng
      ? [
          {
            filename: "qr.png",
            content: qrPng,
            contentType: "image/png",
            cid: "qr-pickup",
          },
        ]
      : [],
  });
};

export const SendReadyToPickupEmail = async (payload: {
  to: string;
  name?: string;
  code: string;
  qrData: string;
  trackingUrl?: string;
}) => {
  const { to, name, code, qrData, trackingUrl } = payload;
  const qrPng: Buffer | undefined = await QRCode.toBuffer(qrData, {
    width: 256,
    margin: 1,
    errorCorrectionLevel: "M",
    type: "png",
  });
  const html = buildInvoiceHtml({
    title: "Siap Diambil",
    subtitle: "Sepatu Anda siap untuk diambil di outlet",
    code,
    name,
    trackingUrl,
    qrCid: qrPng ? "qr-pickup" : undefined,
  });
  return transporter.sendMail({
    to,
    from: config.EMAIL_SENDER,
    subject: `Pesanan ${code} siap diambil`,
    html,
    attachments: qrPng
      ? [
          {
            filename: "qr.png",
            content: qrPng,
            contentType: "image/png",
            cid: "qr-pickup",
          },
        ]
      : [],
  });
};

export const SendResetPasswordEmail = async (payload: {
  to: string;
  name?: string;
  resetUrl: string;
}) => {
  const { to, name, resetUrl } = payload;
  const html = buildResetPasswordHtml({ name, resetUrl });
  return await transporter.sendMail({
    to,
    from: config.EMAIL_SENDER,
    subject: "Reset Password - Shoes Care",
    html,
  });
};
