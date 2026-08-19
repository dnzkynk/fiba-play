// Parola saklama: scrypt ile geri döndürülemez özet (hash).
// Kimse — yönetici dahil — kayıtlı parolayı göremez; unutan kullanıcı
// kendisine üretilen tek kullanımlık bağlantıyla yeni parolasını kendisi belirler.
//
// Geriye dönük uyumluluk: eski kayıtlar AES ile şifrelenmişti ('enc:v1:').
// Bu kayıtlar doğrulanabilir ve ilk başarılı girişte otomatik olarak hash'e yükseltilir.
import crypto from "node:crypto";

const HASH_PREFIX = "scrypt:";
const ENC_PREFIX = "enc:v1:";
const secret =
  process.env.PASSWORD_SECRET || process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "dev";
const LEGACY_KEY = crypto.createHash("sha256").update(String(secret)).digest();

// --- Yeni: scrypt hash ---
export function hashPassword(plain) {
  if (plain == null) return null;
  if (typeof plain === "string" && plain.startsWith(HASH_PREFIX)) return plain; // zaten hash
  const salt = crypto.randomBytes(16);
  const dk = crypto.scryptSync(String(plain), salt, 32);
  return `${HASH_PREFIX}${salt.toString("base64")}:${dk.toString("base64")}`;
}

function verifyHash(input, stored) {
  const [, saltB64, dkB64] = stored.split(":");
  if (!saltB64 || !dkB64) return false;
  const expected = Buffer.from(dkB64, "base64");
  const actual = crypto.scryptSync(String(input), Buffer.from(saltB64, "base64"), expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

// --- Eski AES kayıtları (yalnız doğrulama ve tek seferlik yükseltme için) ---
function decryptLegacy(stored) {
  try {
    const raw = Buffer.from(stored.slice(ENC_PREFIX.length), "base64");
    const decipher = crypto.createDecipheriv("aes-256-gcm", LEGACY_KEY, raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

// Girilen parola saklanan değerle eşleşiyor mu? (her iki biçimi de destekler)
export function passwordMatches(input, stored) {
  if (!stored || input == null) return false;
  const value = String(input).trim();
  if (stored.startsWith(HASH_PREFIX)) {
    try { return verifyHash(value, stored); } catch { return false; }
  }
  if (stored.startsWith(ENC_PREFIX)) return decryptLegacy(stored) === value;
  return stored === value; // en eski düz metin kayıtlar
}

// Saklanan değer eski biçimdeyse true — çağıran taraf girişte hash'e yükseltir
export function needsUpgrade(stored) {
  return !!stored && !stored.startsWith(HASH_PREFIX);
}

// Sıfırlama jetonu: ham değer kullanıcıya, özeti veritabanına
export function makeResetToken() {
  const raw = crypto.randomBytes(32).toString("base64url");
  return { raw, hash: crypto.createHash("sha256").update(raw).digest("hex") };
}
export function hashResetToken(raw) {
  return crypto.createHash("sha256").update(String(raw)).digest("hex");
}
