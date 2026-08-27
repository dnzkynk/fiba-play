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
  // Yanıtlar gerçek destek kutusuna gitsin (gönderici alan adı farklı olabilir)
  replyTo: process.env.SMTP_REPLY_TO || null,
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
export async function sendMail({ to, subject, html, text, attachments }) {
  if (!mailEnabled) return { sent: false, reason: "smtp-yok" };
  try {
    await tx().sendMail({
      from: `"Fiba Games" <${cfg.from}>`,
      ...(cfg.replyTo ? { replyTo: cfg.replyTo } : {}),
      to, subject, html,
      text: text ?? html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
      ...(attachments ? { attachments } : {}),
    });
    return { sent: true };
  } catch (err) {
    console.error("e-posta gönderilemedi:", err.message);
    return { sent: false, reason: err.message };
  }
}

// Ortak şablon — bilinçli olarak sade: renkli başlık/kart/büyük buton yok.
// Amaç, "toplu/pazarlama şablonu" görünümünden kaçınmak — spam filtreleri
// (özellikle Outlook/Hotmail) düz, kişisel görünümlü postaları daha az cezalandırıyor.
export function layout({ title, body, cta, ctaUrl, footer }) {
  return `<!doctype html><html><body style="margin:0;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1c1917;font-size:15px;line-height:1.6;max-width:560px">
<p style="margin:0 0 16px;font-weight:600">${title}</p>
<div style="margin:0 0 16px">${body}</div>
${cta ? `<p style="margin:0 0 16px"><a href="${ctaUrl}" style="color:#0066B3">${cta}</a></p>` : ""}
<p style="margin:24px 0 0;font-size:12px;color:#78716c">${footer}</p>
</body></html>`;
}
