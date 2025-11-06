import * as brevo from "@getbrevo/brevo";
import { config } from "../libs";
import QRCode from "qrcode";
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
  discountPercent = 100
) => {
  const html = buildPromoHtml({ name, code, discountPercent });
  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.sender = {
    name: config.EMAIL.NAME_SENDER,
    email: config.EMAIL.EMAIL_SENDER ?? "",
  };
  sendSmtpEmail.to = [{ email: to, name }];
  sendSmtpEmail.subject = `Kode Promo Anda: ${code}`;
  sendSmtpEmail.htmlContent = html;

  return await apiInstance.sendTransacEmail(sendSmtpEmail);
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

  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.sender = {
    name: config.EMAIL.NAME_SENDER,
    email: config.EMAIL.EMAIL_SENDER ?? "",
  };
  sendSmtpEmail.to = [{ email: to, name }];
  sendSmtpEmail.subject = `Invoice ${code} dibuat`;
  sendSmtpEmail.htmlContent = html;

  if (qrPng) {
    sendSmtpEmail.attachment = [
      {
        name: "qr.png",
        content: qrPng.toString("base64"),
      },
    ];
  }

  return await apiInstance.sendTransacEmail(sendSmtpEmail);
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

  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.sender = {
    name: config.EMAIL.NAME_SENDER,
    email: config.EMAIL.EMAIL_SENDER ?? "",
  };
  sendSmtpEmail.to = [{ email: to, name }];
  sendSmtpEmail.subject = `Pembayaran invoice ${code} diterima`;
  sendSmtpEmail.htmlContent = html;

  if (qrPng) {
    sendSmtpEmail.attachment = [
      {
        name: "qr.png",
        content: qrPng.toString("base64"),
      },
    ];
  }

  return await apiInstance.sendTransacEmail(sendSmtpEmail);
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

  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.sender = {
    name: config.EMAIL.NAME_SENDER,
    email: config.EMAIL.EMAIL_SENDER ?? "",
  };
  sendSmtpEmail.to = [{ email: to, name }];
  sendSmtpEmail.subject = `Pesanan ${code} siap diambil`;
  sendSmtpEmail.htmlContent = html;

  if (qrPng) {
    sendSmtpEmail.attachment = [
      {
        name: "qr.png",
        content: qrPng.toString("base64"),
      },
    ];
  }

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
