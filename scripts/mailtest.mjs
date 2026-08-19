// Kullanım: SMTP_* değişkenleriyle → node scripts/mailtest.mjs alici@ornek.com
import { sendMail, mailEnabled } from "../lib/mail.js";
const to = process.argv[2];
if (!mailEnabled) { console.log("SMTP tanımlı değil (SMTP_HOST/USER/PASS)"); process.exit(1); }
if (!to) { console.log("Kullanım: node scripts/mailtest.mjs alici@ornek.com"); process.exit(1); }
const r = await sendMail({ to, subject: "Fiba Games — SMTP testi",
  html: "<p>Bu bir test e-postasıdır. Bunu görüyorsanız e-posta gönderimi çalışıyor ✓</p>" });
console.log(r.sent ? "✓ gönderildi" : "✗ gönderilemedi: " + r.reason);
