export const buildPromoHtml = (opts: {
  name?: string;
  code: string;
  discountPercent?: number;
}) => {
  const { name, code, discountPercent = 100 } = opts;
  return `<!DOCTYPE html>
  <html lang="id">
  <head>
    <meta charset="utf-8"><meta http-equiv="x-ua-compatible" content="ie=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1"><title>Promo</title>
    <style>
      img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic}
      table{border-collapse:collapse!important}body{margin:0!important;padding:0!important;background:#f6f7fb}
      a[x-apple-data-detectors]{color:inherit!important;text-decoration:none!important}
      .container{width:600px;max-width:600px}.card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden}
      .header{background:#111827;color:#fff;padding:16px 20px}.px{padding-left:20px;padding-right:20px}.ptb{padding-top:20px;padding-bottom:20px}
      .muted{color:#6b7280}
      .pill{padding:12px 16px;border:1px dashed #999;border-radius:8px;display:inline-block;margin:8px 0;font-size:16px;letter-spacing:2px}
      .btn{background:#0ea5e9;color:#fff;padding:12px 16px;border-radius:8px;display:inline-block;font-size:14px}
      @media (prefers-color-scheme: dark){.bg-body{background:#0b1220!important}.card{background:#0f172a!important;border-color:#1f2937!important;color:#e5e7eb!important}.header{background:#111827!important;color:#fff!important}.muted{color:#9ca3af!important}.btn{color:#fff!important}}
      @media screen and (max-width:600px){.container{width:100%!important}.px{padding-left:16px!important;padding-right:16px!important}.ptb{padding-top:16px!important;padding-bottom:16px!important}.btn{display:block!important;width:100%!important;text-align:center!important}}
    </style>
  </head>
  <body class="bg-body" style="background:#f6f7fb;margin:0;padding:24px 0;color:#111">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
      <table role="presentation" class="container card" cellpadding="0" cellspacing="0">
        <tr><td class="header"><div style="font-size:18px;font-weight:700">Promo untuk Anda 🎉</div></td></tr>
        <tr><td class="px ptb">
          <p style="margin:0 0 8px 0">Halo ${name || "Customer"},</p>
          <p class="muted" style="margin:0 0 12px 0">Terima kasih sudah setia menggunakan layanan kami. Berikut adalah kode promo spesial untuk Anda:</p>
          <div class="pill"><strong>${code}</strong></div>
          <p style="margin:8px 0 12px 0">Diskon: <strong>${discountPercent}%</strong></p>
          <p class="muted" style="margin:0 0 16px 0">Masukkan kode ini saat transaksi berikutnya. Syarat dan ketentuan berlaku.</p>
          <a href="#" class="btn">Belanja Sekarang</a>
          <p style="margin:16px 0 0 0">Salam hangat,<br/>Shoes Care</p>
        </td></tr>
      </table>
      <div style="max-width:600px;margin:10px auto 0;text-align:center;color:#94a3b8;font-size:12px;padding-bottom:16px">Butuh bantuan? Hubungi support.</div>
    </td></tr></table>
  </body></html>`;
};

export const buildInvoiceHtml = (opts: {
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

  return `<!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8">
      <meta http-equiv="x-ua-compatible" content="ie=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${title}</title>
    </head>
    <body style="margin:0;padding:24px 0;background:#f6f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#111827">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
              <!-- Header -->
              <tr>
                <td style="background:#111827;color:#fff;padding:16px 20px">
                  <div style="font-size:18px;font-weight:700;margin:0">${title}</div>
                  ${subtitle ? `<div style="font-size:12px;color:#9ca3af;margin-top:4px">${subtitle}</div>` : ""}
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td style="padding:20px">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <!-- Left Column -->
                      <td valign="top" style="width:50%;padding-right:16px">
                        <div style="font-size:12px;color:#6b7280;margin-bottom:4px">Kode Transaksi</div>
                        <div style="font-size:16px;font-weight:600;margin-bottom:16px">${code}</div>
                        
                        <div style="font-size:12px;color:#6b7280;margin-bottom:4px">Customer</div>
                        <div style="font-size:14px;margin-bottom:16px">${name || "-"}${email ? ` (${email})` : ""}</div>
                        
                        ${
                          paymentMethod
                            ? `
                        <div style="font-size:12px;color:#6b7280;margin-bottom:4px">Metode Pembayaran</div>
                        <div style="font-size:14px;font-weight:600;margin-bottom:16px">${paymentMethod}</div>
                        `
                            : ""
                        }
                        
                        ${
                          money
                            ? `
                        <div style="font-size:12px;color:#6b7280;margin-bottom:4px">Total</div>
                        <div style="font-size:20px;font-weight:700;margin-bottom:16px">Rp ${money}</div>
                        `
                            : ""
                        }
                        
                        ${
                          trackingUrl
                            ? `
                        <div style="margin-top:12px">
                          <a href="${trackingUrl}" style="display:inline-block;background:#0ea5e9;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">Lacak Status</a>
                        </div>
                        `
                            : ""
                        }
                        
                        ${
                          actionUrl
                            ? `
                        <div style="margin-top:12px">
                          <a href="${actionUrl}" style="display:inline-block;background:#10b981;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">${actionLabel || "Buka Link"}</a>
                        </div>
                        `
                            : ""
                        }
                      </td>
                      <!-- Right Column - QR Code -->
                      <td valign="top" style="width:50%;text-align:center">
                        <div style="font-size:12px;color:#6b7280;margin-bottom:8px;text-align:left">QR Pickup</div>
                        ${
                          qrCid
                            ? `<img src="cid:${qrCid}" alt="QR Pickup" style="width:200px;height:200px;border:1px solid #e5e7eb;border-radius:8px;display:block">`
                            : `<div style="padding:20px;border:1px dashed #cbd5e1;border-radius:8px;font-size:12px;color:#64748b">QR tidak tersedia</div>`
                        }
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="border-top:1px solid #e5e7eb;padding:16px 20px;font-size:12px;color:#6b7280">
                  <p style="margin:0 0 8px 0;color:#ef4444;font-weight:600">*Gunakan QR Code ini untuk melakukan pengambilan.</p>
                  <p style="margin:0">Terima kasih telah mempercayai layanan kami — Shoes Care</p>
                </td>
              </tr>
            </table>
            <!-- Support Text -->
            <div style="max-width:600px;margin:16px auto 0;text-align:center;color:#94a3b8;font-size:12px">
              Butuh bantuan? Hubungi support.
            </div>
          </td>
        </tr>
      </table>
    </body>
    </html>`;
};

export const buildResetPasswordHtml = (opts: {
  name?: string;
  resetUrl: string;
}) => {
  const { name, resetUrl } = opts;
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta http-equiv="x-ua-compatible" content="ie=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>Reset Password - Shoes Care</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
    table { border-collapse: collapse !important; }
    img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; max-width: 100%; height: auto; }
    a { text-decoration: none; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }

    .container { width: 100%; max-width: 600px; margin: 0 auto; }
    .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
    .card-header { background: linear-gradient(135deg, rgb(38, 123, 220) 0%, rgb(68, 105, 239) 100%); color: #ffffff; padding: 28px 32px; }
    .content { padding: 32px; }
    .footer { padding: 24px 32px; border-top: 1px solid #e5e7eb; background: #f9fafb; }

    .btn-container { margin: 28px 0; text-align: center; }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg,rgb(38, 123, 220) 0%,rgb(68, 105, 239) 100%);
      color: #ffffff !important;
      padding: 16px 40px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      text-align: center;
      box-shadow: 0 4px 6px rgba(220, 38, 38, 0.2);
      text-decoration: none;
    }

    .url-box {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      margin: 20px 0;
      word-break: break-all;
    }

    /* Dark Mode */
    @media (prefers-color-scheme: dark) {
      body { background: #0f172a !important; }
      .card { background: #1e293b !important; border-color: #334155 !important; }
      .content, .footer { color: #e5e7eb !important; }
      .url-box { background: #1e293b !important; border-color: #334155 !important; }
      .footer { background: #0f172a !important; border-color: #334155 !important; }
    }

    /* Mobile */
    @media screen and (max-width: 600px) {
      .container { width: 100% !important; }
      .card-header { padding: 24px 20px !important; }
      .content { padding: 24px 20px !important; }
      .footer { padding: 20px !important; }
      .btn {
        display: block !important;
        width: 100% !important;
        padding: 14px 24px !important;
        font-size: 15px !important;
        box-sizing: border-box !important;
      }
      h1 { font-size: 20px !important; }
      .url-box { padding: 12px !important; font-size: 13px !important; }
    }
  </style>
</head>
<body style="background-color:#f8fafc;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc;padding:20px 0;">
    <tr>
      <td align="center">
        <table role="presentation" class="container" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td>
              <table role="presentation" class="card" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="card-header">
                    <h1 style="margin:0;font-size:24px;font-weight:700;line-height:1.2;">🔐 Reset Password</h1>
                  </td>
                </tr>
                <tr>
                  <td class="content">
                    <p style="margin:0 0 16px 0;font-size:16px;color:#1f2937;font-weight:600;">Halo ${name || "Customer"},</p>
                    <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#4b5563;">
                      Kami menerima permintaan untuk mereset password akun Anda di <strong>Shoes Care</strong>. Klik tombol di bawah ini untuk membuat password baru.
                    </p>
                    <div class="btn-container">
                      <a href="${resetUrl}" class="btn" target="_blank" rel="noopener noreferrer">Reset Password Sekarang</a>
                    </div>
                    <p style="margin:0 0 12px 0;font-size:14px;color:#6b7280;">
                      ⏱️ Link ini akan <strong>kadaluarsa dalam 1 jam</strong>.
                    </p>
                    <p style="margin:0 0 20px 0;font-size:14px;color:#6b7280;">
                      Jika Anda tidak meminta reset password, abaikan email ini dan password Anda akan tetap aman.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td class="footer">
                    <p style="margin:0 0 8px 0;font-size:13px;color:#dc2626;font-weight:600;">⚠️ Jangan bagikan link ini kepada siapa pun!</p>
                    <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">
                      Terima kasih telah mempercayai layanan kami.<br/>
                      <strong>— Tim Shoes Care</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export const message = (name: string, otp: string | number) => {
  const otpStr = String(otp);
  return `<!DOCTYPE html>
  <html lang="id">
  <head>
    <meta charset="utf-8"><meta http-equiv="x-ua-compatible" content="ie=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1"><title>Verification Code</title>
    <style>
      img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic}
      table{border-collapse:collapse!important}body{margin:0!important;padding:0!important;background:#f8fafc}
      a[x-apple-data-detectors]{color:inherit!important;text-decoration:none!important}
      .container{width:600px;max-width:600px}
      .card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden}
      .card-header{padding:16px 20px;background:#0b6bcb;color:#fff}
      .px{padding-left:20px;padding-right:20px}.ptb{padding-top:20px;padding-bottom:20px}
      .muted{color:#475569}.otp{font-size:28px;letter-spacing:8px;font-weight:700;background:#0b6bcb10;color:#0b6bcb;border:1px solid #cfe3fb;padding:16px 20px;border-radius:12px;text-align:center}
      @media (prefers-color-scheme: dark){.bg-body{background:#0b1220!important}.card{background:#0f172a!important;border-color:#1f2937!important;color:#e5e7eb!important}.card-header{background:#0b6bcb!important;color:#fff!important}.muted{color:#9ca3af!important}.otp{color:#fff!important;background:#111827!important}}
      @media screen and (max-width:600px){.container{width:100%!important}.px{padding-left:16px!important;padding-right:16px!important}.ptb{padding-top:16px!important;padding-bottom:16px!important}.otp{font-size:24px!important;letter-spacing:6px!important}}
    </style>
    <!--[if mso]><style>.otp{letter-spacing:4px!important}</style><![endif]-->
  </head>
  <body class="bg-body" style="background:#f8fafc;margin:0;padding:24px 0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
      <table role="presentation" class="container card" cellpadding="0" cellspacing="0">
        <tr><td class="card-header"><h1 style="margin:0;font-size:20px;line-height:1.2;font-weight:700">Verification Code</h1></td></tr>
        <tr><td class="px ptb">
          <p style="margin:0 0 8px 0">Hi ${name},</p>
          <p class="muted" style="margin:0 0 16px 0">Masukkan kode OTP di bawah ini untuk mengakses formulir. <strong>Jangan bagikan</strong> kode ini kepada siapa pun.</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0 8px 0"><tr><td class="otp">${otpStr}</td></tr></table>
          <p class="muted" style="margin:8px 0 0 0;font-size:12px;color:#64748b">Kode berlaku terbatas. Jika Anda tidak meminta OTP ini, abaikan email ini.</p>
        </td></tr>
      </table>
      <div style="max-width:560px;margin:10px auto 0;text-align:center;color:#94a3b8;font-size:12px;padding-bottom:16px">Butuh bantuan? Hubungi support.</div>
    </td></tr></table>
  </body></html>`;
};
