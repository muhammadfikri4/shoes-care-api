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
                        
                        ${paymentMethod ? `
                        <div style="font-size:12px;color:#6b7280;margin-bottom:4px">Metode Pembayaran</div>
                        <div style="font-size:14px;font-weight:600;margin-bottom:16px">${paymentMethod}</div>
                        ` : ""}
                        
                        ${money ? `
                        <div style="font-size:12px;color:#6b7280;margin-bottom:4px">Total</div>
                        <div style="font-size:20px;font-weight:700;margin-bottom:16px">Rp ${money}</div>
                        ` : ""}
                        
                        ${trackingUrl ? `
                        <div style="margin-top:12px">
                          <a href="${trackingUrl}" style="display:inline-block;background:#0ea5e9;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">Lacak Status</a>
                        </div>
                        ` : ""}
                        
                        ${actionUrl ? `
                        <div style="margin-top:12px">
                          <a href="${actionUrl}" style="display:inline-block;background:#10b981;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">${actionLabel || "Buka Link"}</a>
                        </div>
                        ` : ""}
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
