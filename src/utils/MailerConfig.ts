import * as brevo from "@getbrevo/brevo";
import QRCode from "qrcode";
import { config } from "../libs";
import {
  buildInvoiceHtml,
  buildPromoHtml,
  buildResetPasswordHtml,
  message,
} from "./template";

// Initialize Brevo API client
const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  config.EMAIL.API_KEY ?? ""
);

/**
 * Centralized QR code image resolver with fallback logic
 * - If qrCodeUrl is available, use it
 * - Otherwise, generate QR code from qrData as data URI
 */
const resolveQrCodeImage = async (
  qrCodeUrl: string | undefined,
  qrData: string
): Promise<string | undefined> => {
  // If bucket URL is available, use it
  if (qrCodeUrl) {
    return qrCodeUrl;
  }

  // Fallback: generate QR code from qrData
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

export const SendEmail = async (to: string, name: string, otp: number) => {
  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.sender = {
    name: config.EMAIL.NAME_SENDER,
    email: config.EMAIL.EMAIL_SENDER ?? "",
  };
  sendSmtpEmail.to = [{ email: to, name }];
  sendSmtpEmail.subject = "OTP Verification";
  sendSmtpEmail.htmlContent = message(name, otp);

  return await apiInstance.sendTransacEmail(sendSmtpEmail);
};

export const SendPromoCodeEmail = async (
  to: string,
  name: string,
  code: string,
  discountPercent = 100,
  actionUrl?: string
) => {
  const html = buildPromoHtml({ name, code, discountPercent, actionUrl });
  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.sender = {
    name: config.EMAIL.NAME_SENDER,
    email: config.EMAIL.EMAIL_SENDER ?? "",
  };
  sendSmtpEmail.to = [{ email: to, name }];
  sendSmtpEmail.subject = `Promo ${discountPercent}% - ${code}`;
  sendSmtpEmail.htmlContent = html;

  return await apiInstance.sendTransacEmail(sendSmtpEmail);
};

export const SendTransactionNotificationEmail = async (payload: {
  to: string;
  name?: string;
  code: string;
  qrData: string;
  qrCodeUrl?: string;
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
    qrCodeUrl,
    trackingUrl,
    amount,
    paymentMethod,
    midtransUrl,
  } = payload;

  // Use centralized QR code resolver
  const qrImageSrc = await resolveQrCodeImage(qrCodeUrl, qrData);

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
    qrCid: qrImageSrc,
  });

  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.sender = {
    name: config.EMAIL.NAME_SENDER,
    email: config.EMAIL.EMAIL_SENDER ?? "",
  };
  sendSmtpEmail.to = [{ email: to, name }];
  sendSmtpEmail.subject = `Invoice ${code} dibuat`;
  sendSmtpEmail.htmlContent = html;

  return await apiInstance.sendTransacEmail(sendSmtpEmail);
};

export const SendPaymentSuccessEmail = async (payload: {
  to: string;
  name?: string;
  code: string;
  qrData: string;
  qrCodeUrl?: string;
  trackingUrl?: string;
  amount?: number;
}) => {
  const { to, name, code, qrData, qrCodeUrl, trackingUrl, amount } = payload;

  // Use centralized QR code resolver
  const qrImageSrc = await resolveQrCodeImage(qrCodeUrl, qrData);

  const html = buildInvoiceHtml({
    title: "Pembayaran Berhasil",
    subtitle: "Terima kasih, pembayaran Anda sudah kami terima",
    code,
    name,
    amount,
    trackingUrl,
    qrCid: qrImageSrc,
  });

  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.sender = {
    name: config.EMAIL.NAME_SENDER,
    email: config.EMAIL.EMAIL_SENDER ?? "",
  };
  sendSmtpEmail.to = [{ email: to, name }];
  sendSmtpEmail.subject = `Pembayaran invoice ${code} diterima`;
  sendSmtpEmail.htmlContent = html;

  return await apiInstance.sendTransacEmail(sendSmtpEmail);
};

export const SendReadyToPickupEmail = async (payload: {
  to: string;
  name?: string;
  code: string;
  qrData: string;
  qrCodeUrl?: string;
  trackingUrl?: string;
}) => {
  const { to, name, code, qrData, qrCodeUrl, trackingUrl } = payload;

  // Use centralized QR code resolver
  const qrImageSrc = await resolveQrCodeImage(qrCodeUrl, qrData);

  const html = buildInvoiceHtml({
    title: "Siap Diambil",
    subtitle: "Sepatu Anda siap untuk diambil di outlet",
    code,
    name,
    trackingUrl,
    qrCid: qrImageSrc,
  });

  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.sender = {
    name: config.EMAIL.NAME_SENDER,
    email: config.EMAIL.EMAIL_SENDER ?? "",
  };
  sendSmtpEmail.to = [{ email: to, name }];
  sendSmtpEmail.subject = `Pesanan ${code} siap diambil`;
  sendSmtpEmail.htmlContent = html;

  return await apiInstance.sendTransacEmail(sendSmtpEmail);
};

export const SendCompletedEmail = async (payload: {
  to: string;
  name?: string;
  code: string;
  qrData: string;
  qrCodeUrl?: string;
  trackingUrl?: string;
}) => {
  const { to, name, code, qrData, qrCodeUrl, trackingUrl } = payload;

  // Use centralized QR code resolver
  const qrImageSrc = await resolveQrCodeImage(qrCodeUrl, qrData);

  const html = buildInvoiceHtml({
    title: "Pesanan Selesai",
    subtitle: "Terima kasih telah menggunakan layanan kami",
    code,
    name,
    trackingUrl,
    qrCid: qrImageSrc,
  });

  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.sender = {
    name: config.EMAIL.NAME_SENDER,
    email: config.EMAIL.EMAIL_SENDER ?? "",
  };
  sendSmtpEmail.to = [{ email: to, name }];
  sendSmtpEmail.subject = `Pesanan ${code} telah selesai`;
  sendSmtpEmail.htmlContent = html;

  return await apiInstance.sendTransacEmail(sendSmtpEmail);
};

export const SendResetPasswordEmail = async (payload: {
  to: string;
  name?: string;
  resetUrl: string;
}) => {
  const { to, name, resetUrl } = payload;
  const html = buildResetPasswordHtml({ name, resetUrl });

  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.sender = {
    name: config.EMAIL.NAME_SENDER,
    email: config.EMAIL.EMAIL_SENDER ?? "",
  };
  sendSmtpEmail.to = [{ email: to, name }];
  sendSmtpEmail.subject = "Reset Password - Shoes Care";
  sendSmtpEmail.htmlContent = html;

  return await apiInstance.sendTransacEmail(sendSmtpEmail);
};
