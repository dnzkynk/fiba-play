// Public başvuru: ad soyad, e-posta, telefon, ülke, şirket.
// Aynı e-postayla ikinci başvuru reddedilir (409).
import { NextResponse } from "next/server";
import { q } from "@/lib/db";
import { hashPassword } from "@/lib/crypto";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export async function POST(req) {
  // Kötü niyetli toplu başvuruya karşı: IP başına dakikada 5
  if (!rateLimit(`apply:${clientIp(req)}`, { max: 5, windowMs: 60_000 })) {
    return NextResponse.json({ error: "rate" }, { status: 429 });
  }
  const b = await req.json().catch(() => ({}));
  const clean = (v, max) => String(v ?? "").trim().slice(0, max);
  const fullName = clean(b.fullName, 100);
  const email = clean(b.email, 120).toLowerCase();
  const phone = clean(b.phone, 30);
  const country = clean(b.country, 60);
  const company = clean(b.company, 80);
  const password = clean(b.password, 40);

  if (!fullName || !phone || !country || !company)
    return NextResponse.json({ error: "eksik" }, { status: 400 });
  if (fullName.length < 5 || !fullName.includes(" "))
    return NextResponse.json({ error: "name" }, { status: 400 });
  if ((phone.match(/\d/g) ?? []).length < 7)
    return NextResponse.json({ error: "phone" }, { status: 400 });

  // Aynı telefon numarasıyla ikinci başvuru (biçimden bağımsız, rakam bazında)
  const [phoneDupe] = await q(
    `SELECT 1 FROM applications WHERE regexp_replace(phone, '\\D', '', 'g') = $1 LIMIT 1`,
    [phone.replace(/\D/g, "")]
  );
  if (phoneDupe) return NextResponse.json({ error: "dupe-phone" }, { status: 409 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return NextResponse.json({ error: "email" }, { status: 400 });
  if (!/^[+\d][\d\s().-]{5,}$/.test(phone))
    return NextResponse.json({ error: "phone" }, { status: 400 });
  if (password.length < 6)
    return NextResponse.json({ error: "password" }, { status: 400 });

  try {
    await q(
      `INSERT INTO applications (full_name, email, phone, country, company, password) VALUES ($1,$2,$3,$4,$5,$6)`,
      [fullName, email, phone, country, company, hashPassword(password)]
    );
  } catch (err) {
    if (String(err.message).includes("applications_email_key"))
      return NextResponse.json({ error: "dupe" }, { status: 409 });
    throw err;
  }
  return NextResponse.json({ ok: true });
}
