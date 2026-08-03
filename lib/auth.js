import { cookies } from "next/headers";
import crypto from "node:crypto";
import { q } from "./db.js";

const SECRET = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "dev";

function sign(value) {
  return crypto.createHmac("sha256", SECRET).update(value).digest("hex").slice(0, 32);
}

export function makeSession(email) {
  const payload = Buffer.from(email).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readSession(cookieValue) {
  if (!cookieValue) return null;
  const [payload, sig] = cookieValue.split(".");
  if (!payload || sig !== sign(payload)) return null;
  return Buffer.from(payload, "base64url").toString();
}

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
