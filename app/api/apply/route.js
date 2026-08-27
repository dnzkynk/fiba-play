// Public başvuru: ad soyad, e-posta, ülke, şirket. Telefon artık istenmiyor.
// Aynı e-postayla ikinci başvuru reddedilir (409).
import { NextResponse } from "next/server";
import path from "node:path";
import { q } from "@/lib/db";
import { hashPassword } from "@/lib/crypto";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { sendMail } from "@/lib/mail";
import { applyReceivedMail } from "@/lib/mailtemplates";
import { COUNTRY_CODES } from "@/lib/countries";

const rulesPdfPath = path.join(process.cwd(), "public/legal/fiba-game-rules.pdf");

export async function POST(req) {
  // Kötü niyetli toplu başvuruya karşı: IP başına dakikada 5
  if (!rateLimit(`apply:${clientIp(req)}`, { max: 5, windowMs: 60_000 })) {
    return NextResponse.json({ error: "rate" }, { status: 429 });
  }
  const b = await req.json().catch(() => ({}));
  const clean = (v, max) => String(v ?? "").trim().slice(0, max);
  const fullName = clean(b.fullName, 100);
  const email = clean(b.email, 120).toLowerCase();
  const country = clean(b.country, 2).toUpperCase();
  const company = clean(b.company, 80);
  const password = clean(b.password, 40);

  if (!fullName || !country || !company)
    return NextResponse.json({ error: "eksik" }, { status: 400 });
  // Aydınlatma metinlerinin okunduğuna dair işaretleme zorunlu (JS kapalıysa bile atlanamaz).
  // Not: KVKK aydınlatma yükümlülüğü için ayrıca bir "rıza" kaydı tutulmuyor —
  // metinlerin erişilebilir olması ve işaretlenip devam edilebilmesi yeterli.
  if (b.noticeAck !== "1")
    return NextResponse.json({ error: "notice" }, { status: 400 });
  if (fullName.length < 5 || !fullName.includes(" "))
    return NextResponse.json({ error: "name" }, { status: 400 });
  if (!COUNTRY_CODES.includes(country))
    return NextResponse.json({ error: "country" }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return NextResponse.json({ error: "email" }, { status: 400 });
  if (password.length < 6)
    return NextResponse.json({ error: "password" }, { status: 400 });

  try {
    await q(
      `INSERT INTO applications (full_name, email, country, company, password) VALUES ($1,$2,$3,$4,$5)`,
      [fullName, email, country, company, hashPassword(password)]
    );
  } catch (err) {
    if (String(err.message).includes("applications_email_key"))
      return NextResponse.json({ error: "dupe" }, { status: 409 });
    throw err;
  }
  const { subject, html } = applyReceivedMail(fullName.split(" ")[0]);
  await sendMail({
    to: email, subject, html,
    attachments: [{ filename: "Fiba Games - Rules.pdf", path: rulesPdfPath }],
  }); // SMTP yoksa sessizce atlanır
  return NextResponse.json({ ok: true });
}
