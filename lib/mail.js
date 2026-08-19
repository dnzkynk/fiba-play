// E-posta gönderimi (SMTP). Ortam değişkenleri tanımlı değilse sessizce devre dışıdır —
// sistem e-postasız da çalışmaya devam eder (bağlantılar panelden elle iletilir).
//
// Microsoft 365 için: SMTP_HOST=smtp.office365.com, SMTP_PORT=587
// (kutunun "Authenticated SMTP" ayarı açık olmalı; MFA varsa uygulama parolası gerekir)
import nodemailer from "nodemailer";

const cfg = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT ?? "587", 10),
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.SMTP_FROM || process.env.SMTP_USER,
};

export const mailEnabled = !!(cfg.host && cfg.user && cfg.pass);

let transporter = null;
function tx() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465, // 587 → STARTTLS
      auth: { user: cfg.user, pass: cfg.pass },
    });
  }
  return transporter;
}

// Gönderim hatası akışı bozmaz: loglanır, çağıran taraf devam eder.
export async function sendMail({ to, subject, html, text }) {
  if (!mailEnabled) return { sent: false, reason: "smtp-yok" };
  try {
    await tx().sendMail({
      from: `"Fiba Games" <${cfg.from}>`,
      to, subject, html,
      text: text ?? html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    });
    return { sent: true };
  } catch (err) {
    console.error("e-posta gönderilemedi:", err.message);
    return { sent: false, reason: err.message };
  }
}

// Ortak şablon — kurumsal görünüm, TR/EN
export function layout({ title, body, cta, ctaUrl, footer }) {
  return `<!doctype html><html><body style="margin:0;background:#f5f5f4;padding:32px 16px;font-family:-apple-system,'Segoe UI',Roboto,sans-serif">
  <table role="presentation" style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e7e5e4;border-radius:16px;overflow:hidden">
    <tr><td style="background:#0066B3;padding:20px 28px">
      <span style="color:#fff;font-size:18px;font-weight:700;letter-spacing:.3px">Fiba Games 2026</span>
    </td></tr>
    <tr><td style="padding:28px">
      <h1 style="margin:0 0 12px;font-size:20px;color:#1c1917">${title}</h1>
      <div style="font-size:15px;line-height:1.6;color:#44403c">${body}</div>
      ${cta ? `<p style="margin:24px 0 8px"><a href="${ctaUrl}" style="display:inline-block;background:#0066B3;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:15px">${cta}</a></p>
      <p style="margin:8px 0 0;font-size:12px;color:#a8a29e;word-break:break-all">${ctaUrl}</p>` : ""}
    </td></tr>
    <tr><td style="padding:16px 28px;background:#fafaf9;border-top:1px solid #e7e5e4;font-size:12px;color:#78716c">${footer}</td></tr>
  </table></body></html>`;
}
