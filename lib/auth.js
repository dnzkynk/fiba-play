import { cookies } from "next/headers";
import crypto from "node:crypto";
import { q } from "./db.js";

const SECRET = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "dev";

function sign(value) {
  return crypto.createHmac("sha256", SECRET).update(value).digest("hex").slice(0, 32);
}

// Oturum jetonu: <base64(email)>.<son kullanma ms>.<imza>
// Süre sunucu tarafında doğrulanır — çalınan çerez sonsuza kadar geçerli olmaz.
const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 gün

export function makeSession(email, ttlMs = SESSION_TTL_MS) {
  const payload = Buffer.from(email).toString("base64url");
  const exp = String(Date.now() + ttlMs);
  return `${payload}.${exp}.${sign(`${payload}.${exp}`)}`;
}

export function readSession(cookieValue) {
  if (!cookieValue) return null;
  const parts = cookieValue.split(".");
  // Süresiz eski biçim artık kabul edilmiyor (yeniden giriş gerekir)
  if (parts.length !== 3) return null;
  const [payload, exp, sig] = parts;
  const expected = sign(`${payload}.${exp}`);
  // Zamanlama saldırısına karşı sabit süreli karşılaştırma
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  if (!Number.isFinite(+exp) || Date.now() > +exp) return null;
  return Buffer.from(payload, "base64url").toString();
}

// Prodüksiyonda (HTTPS) çerezlere secure bayrağı eklenir
export const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  secure: (process.env.BASE_URL ?? "").startsWith("https://"),
};

// --- Admin (kişisel hesaplar: admins tablosu, imzalı oturum çerezi) ---
export async function currentAdmin() {
  const store = await cookies();
  const payload = readSession(store.get("fiba_admin")?.value);
  if (!payload?.startsWith("admin:")) return null;
  const email = payload.slice(6);
  const [admin] = await q("SELECT * FROM admins WHERE email = $1", [email]);
  return admin ?? null; // silinen yöneticinin oturumu anında geçersizleşir
}

export async function isAdmin() {
  return (await currentAdmin()) !== null;
}

export async function requireAdmin() {
  const admin = await currentAdmin();
  if (!admin) {
    const err = new Error("Yetkisiz");
    err.status = 401;
    throw err;
  }
  return admin;
}

// --- Oyuncu ---
export async function currentPlayerEmail() {
  const store = await cookies();
  return readSession(store.get("fiba_user")?.value);
}

// Aynı e-posta iki oyuna da kayıtlı olabilir: tüm katılım kayıtlarını döner.
export async function currentPlayerRows() {
  const email = await currentPlayerEmail();
  if (!email) return [];
  return q("SELECT * FROM participants WHERE email = $1 ORDER BY game", [email]);
}

// Okunabilir parola üretir (admin elle dağıtacak): fiba-x7k2m4 gibi
export function generatePassword() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[crypto.randomInt(chars.length)];
  return `fiba-${s}`;
}
