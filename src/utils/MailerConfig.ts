import nodemailer from 'nodemailer';
import { config } from '../libs';
import { MailOptions } from 'nodemailer/lib/smtp-pool';
import QRCode from 'qrcode';

export const message = (name: string, otp: number) => {
    return `
        <p>Hi ${name},</p>
        <br/>
        <p>Please use the following One Time Password (OTP) to access the form: <span style="color: #059df0">${otp}</span>. Don't share this OTP with anyone.</p>`
}

export const transporter = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: false,
    auth: {
        user: config.SMTP_LOGIN,
        pass: config.SMTP_PASSWORD
    }
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
        subject: 'HIMTI UMT Code Verification',
        text: `Your OTP Code Verification is ${otp}`,
        html: message(name, otp),
    })
}

export const SendPromoCodeEmail = async (
  to: string,
  name: string,
  code: string,
  discountPercent = 100,
) => {
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#222">
      <h2>Promo untuk Anda 🎉</h2>
      <p>Halo ${name || 'Customer'},</p>
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

export const SendTransactionNotificationEmail = async (payload: {
  to: string;
  name?: string;
  invoice: string;
  qrData: string;
  trackingUrl?: string;
  amount?: number;
  paymentMethod?: string;
  midtransUrl?: string;
}) => {
  const { to, name, invoice, qrData, trackingUrl, amount, paymentMethod, midtransUrl } = payload;
  let qrBase64 = '';
  try {
    qrBase64 = await QRCode.toDataURL(qrData, { width: 256, margin: 1 });
  } catch (e) {
    // ignore QR generation failure; still send email
  }
  const trackButton = trackingUrl
    ? `<a href="${trackingUrl}" style="background:#0ea5e9;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;display:inline-block">Lacak Status</a>`
    : '';
  const midtransButton = midtransUrl
    ? `<div style="margin-top:8px"><a href="${midtransUrl}" style="background:#16a34a;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;display:inline-block">Bayar via Midtrans</a></div>`
    : '';
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#222">
      <h2>Transaksi Berhasil Dibuat</h2>
      <p>Halo ${name || 'Customer'},</p>
      <p>Transaksi Anda dengan invoice <strong>${invoice}</strong> telah dibuat.</p>
      ${typeof amount === 'number' ? `<p>Total: <strong>Rp ${amount?.toLocaleString('id-ID')}</strong></p>` : ''}
      ${paymentMethod ? `<p>Metode Pembayaran: <strong>${paymentMethod}</strong></p>` : ''}
      <p>Gunakan QR berikut untuk pengambilan:</p>
      ${qrBase64 ? `<img src="${qrBase64}" alt="QR Pickup" style="width:200px;height:200px"/>` : `<pre style="background:#f5f5f5;padding:8px;border-radius:8px">${qrData}</pre>`}
      <div style="margin-top:12px">${trackButton}</div>
      ${midtransButton}
      <p style="margin-top:16px">Terima kasih telah mempercayai layanan kami.</p>
      <p>Salam,<br/>Shoes Care</p>
    </div>
  `;
  return transporter.sendMail({
    to,
    from: config.EMAIL_SENDER,
    subject: `Invoice ${invoice} dibuat`,
    html,
  });
};
