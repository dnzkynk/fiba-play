// Parola gizleme: AES-256-GCM ile geri döndürülebilir şifreleme.
// Anahtar ortam değişkeninden (PASSWORD_SECRET / SESSION_SECRET) türetilir —
// yani veritabanı dökümü tek başına parolaları açığa çıkarmaz; çözmek için
// sunucudaki gizli anahtar gerekir. Admin panelinde parola gösterimi bu anahtarla yapılır.
import crypto from "node:crypto";

const PREFIX = "enc:v1:";
const secret = process.env.PASSWORD_SECRET || process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "dev";
const KEY = crypto.createHash("sha256").update(String(secret)).digest(); // 32 bayt

export function isEncrypted(v) {
  return typeof v === "string" && v.startsWith(PREFIX);
}

export function encryptPassword(plain) {
  if (plain == null) return null;
  if (isEncrypted(plain)) return plain; // zaten şifreli
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const ct = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ct]).toString("base64");
}

export function decryptPassword(stored) {
  if (stored == null) return null;
  if (!isEncrypted(stored)) return stored; // geçiş dönemi: düz metin olduğu gibi döner
  try {
    const raw = Buffer.from(stored.slice(PREFIX.length), "base64");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const ct = raw.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
  } catch {
    return null; // anahtar değişmiş / bozuk veri
  }
}

// Girilen parola, saklanan (şifreli veya düz) parolayla eşleşiyor mu?
export function passwordMatches(input, stored) {
  const plain = decryptPassword(stored);
  return plain != null && plain === String(input ?? "").trim();
}
