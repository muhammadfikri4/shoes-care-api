import nodemailer from "nodemailer";
import { config } from "../libs";
import { MailOptions } from "nodemailer/lib/smtp-pool";
import QRCode from "qrcode";

export const message = (name: string, otp: string | number) => {
  const otpStr = String(otp);
  return `
  
<div style="background:#f8fafc; padding:24px 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#0f172a;">
    <div style="max-width:560px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden;">
      <div style="padding:16px 20px; background:#0b6bcb; color:#ffffff;">
        <h1 style="margin:0; font-size:16px; font-weight:700;">Verification Code</h1>
      </div>

      <div style="padding:20px;">
        <p style="margin:0 0 8px 0;">Hi ${name},</p>
        <p style="margin:0 0 16px 0; color:#475569;">
          Masukkan kode OTP di bawah ini untuk mengakses formulir.
          <strong>Jangan bagikan</strong> kode ini kepada siapa pun.
        </p>

        <div style="margin:16px 0 8px 0;">
          ${otpStr}
        </div>
        <p style="margin:8px 0 0 0; font-size:12px; color:#64748b;">
          Kode berlaku terbatas. Jika Anda tidak meminta OTP ini, abaikan email ini.
        </p>

    </div>

    <div style="max-width:560px; margin:10px auto 0; text-align:center; color:#94a3b8; font-size:12px; padding-bottom:16px;">
      Butuh bantuan? Hubungi support.
    </div>
  </div>`;
};

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
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#222">
      <h2>Promo untuk Anda 🎉</h2>
      <p>Halo ${name || "Customer"},</p>
      <p>Terima kasih sudah setia menggunakan layanan kami. Berikut adalah kode promo spesial untuk Anda:</p>
      <div style="padding:12px 16px;border:1px dashed #999;border-radius:8px;display:inline-block;margin:8px 0;font-size:16px">
        <strong style="letter-spacing:2px">${code}</strong>
      </div>
      <p>Diskon: <strong>${discountPercent}%</strong></p>
      <p>Masukkan kode ini saat transaksi berikutnya. Syarat dan ketentuan berlaku.</p>
      <p>Salam hangat,<br/>Shoes Care</p>
    </div>
  `;
  return transporter.sendMail({
    to,
    from: config.EMAIL_SENDER,
    subject: `Kode Promo Anda: ${code}`,
    html,
  });
};

const buildInvoiceHtml = (opts: {
  title: string;
  subtitle?: string;
  code: string;
  name?: string;
  email?: string;
  amount?: number;
  paymentMethod?: string;
  trackingUrl?: string;
  actionUrl?: string;
  actionLabel?: string;
  qrCid?: string;
}) => {
  const {
    title,
    subtitle,
    code,
    name,
    email,
    amount,
    paymentMethod,
    trackingUrl,
    actionUrl,
    actionLabel,
    qrCid,
  } = opts;

  const money =
    typeof amount === "number"
      ? new Intl.NumberFormat("id-ID").format(amount)
      : undefined;

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#f6f7fb;padding:24px;color:#111">
    <div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
      <div style="background:#111827;color:#fff;padding:16px 20px">
        <div style="font-size:18px;font-weight:700">${title}</div>
        ${subtitle ? `<div style="font-size:12px;opacity:.9;margin-top:2px">${subtitle}</div>` : ""}
      </div>
      <div style="padding:20px">
        <div style="display:flex;gap:16px;flex-wrap:wrap">
          <div style="flex:1 1 280px;min-width:260px">
            <div style="font-size:12px;color:#6b7280">Kode Transaksi</div>
            <div style="font-size:16px;font-weight:600;margin-bottom:8px">${code}</div>
            <div style="font-size:12px;color:#6b7280">Customer</div>
            <div style="font-size:14px">${name || "-"}${email ? ` (<span>${email}</span>)` : ""}</div>
            ${paymentMethod ? `<div style="margin-top:10px;font-size:12px;color:#6b7280">Metode Pembayaran</div><div style="font-size:14px"><strong>${paymentMethod}</strong></div>` : ""}
            ${money ? `<div style="margin-top:10px;font-size:12px;color:#6b7280">Total</div><div style="font-size:20px;font-weight:700">Rp ${money}</div>` : ""}
            ${trackingUrl ? `<div style="margin-top:12px"><a href="${trackingUrl}" style="background:#0ea5e9;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none;display:inline-block;font-size:13px">Lacak Status</a></div>` : ""}
            ${actionUrl ? `<div style="margin-top:8px"><a href="${actionUrl}" style="background:#10b981;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none;display:inline-block;font-size:13px">${actionLabel || "Buka Link"}</a></div>` : ""}
          </div>
          <div style="flex:0 0 220px;max-width:240px">
            <div style="font-size:12px;color:#6b7280">QR Pickup</div>
            ${qrCid ? `<img src="cid:${qrCid}" alt="QR Pickup" style="width:200px;height:200px;border:1px solid #e5e7eb;border-radius:8px"/>` : '<div style="padding:12px;border:1px dashed #cbd5e1;border-radius:8px;font-size:12px;color:#64748b">QR tidak tersedia</div>'}
          </div>
        </div>
      </div>
      <div style="border-top:1px solid #e5e7eb;padding:14px 20px;font-size:12px;color:#6b7280">
      <p style="color: red;">*Gunakan QR Code ini untuk melakukan pengambilan.</p>  
      Terima kasih telah mempercayai layanan kami — Shoes Care
      </div>
    </div>
  </div>`;
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
