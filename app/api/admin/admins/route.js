// Yönetici hesapları: ekleme ve silme (kendini ve son yöneticiyi silemezsin).
import { NextResponse } from "next/server";
import { q, audit } from "@/lib/db";
import { requireAdmin, generatePassword } from "@/lib/auth";
import { hashPassword } from "@/lib/crypto";

export async function POST(req) {
  let me;
  try {
    me = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const b = await req.json();
  const email = (b.email ?? "").trim().toLowerCase();
  if (!b.fullName?.trim()) return NextResponse.json({ error: "Ad soyad gerekli" }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return NextResponse.json({ error: "Geçerli bir e-posta girin" }, { status: 400 });

  const password = b.password?.trim() || generatePassword();
  if (password.length < 8)
    return NextResponse.json({ error: "Yönetici parolası en az 8 karakter olmalı" }, { status: 400 });
  try {
    const [a] = await q(
      "INSERT INTO admins (full_name, email, password) VALUES ($1, $2, $3) RETURNING id, full_name, email",
      [b.fullName.trim(), email, hashPassword(password)]
    );
    await audit("admin_add", { email }, me.email);
    return NextResponse.json({ ...a, password }); // düz parola yalnız bu yanıtta gösterilir
  } catch (err) {
    if (err.code === "23505")
      return NextResponse.json({ error: "Bu e-posta zaten yönetici" }, { status: 400 });
    throw err;
  }
}

export async function DELETE(req) {
  let me;
  try {
    me = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const { id } = await req.json();
  const [target] = await q("SELECT * FROM admins WHERE id = $1", [id]);
  if (!target) return NextResponse.json({ error: "Yönetici bulunamadı" }, { status: 404 });
  if (target.id === me.id)
    return NextResponse.json({ error: "Kendi hesabınızı silemezsiniz" }, { status: 400 });
  const [{ n }] = await q("SELECT count(*)::int AS n FROM admins");
  if (n <= 1)
    return NextResponse.json({ error: "Son yönetici silinemez" }, { status: 400 });
  await q("DELETE FROM admins WHERE id = $1", [id]);
  await audit("admin_delete", { email: target.email }, me.email);
  return NextResponse.json({ ok: true });
}
