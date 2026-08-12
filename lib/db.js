import { Pool } from "pg";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const globalForDb = globalThis;

export const db =
  globalForDb.__dbPool ??
  new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

if (!globalForDb.__dbPool) {
  globalForDb.__dbPool = db;
  // Boşta kalan bağlantı koptuğunda süreç çökmesin (Railway iç ağı ara ara bağlantı düşürür)
  db.on("error", (err) => console.error("pg havuz hatası (yoksayıldı):", err.message));
}

// İlk açılışta şema yoksa kur. Container ilk saniyelerde DB'ye erişemeyebilir (Railway iç
// ağı geç hazır olur) — yeniden dener; başarısızlık önbelleğe ALINMAZ, sonraki istek yeniden dener.
async function ensureSchemaOnce() {
  const res = await db.query("SELECT to_regclass('public.participants') AS t");
  if (!res.rows[0].t) {
    const sql = readFileSync(join(process.cwd(), "db", "schema.sql"), "utf8");
    await db.query(sql);
    console.log("🗄  veritabanı şeması kuruldu");
  }
  // Migrasyonlar (idempotent)
  await db.query("ALTER TABLE participants DROP CONSTRAINT IF EXISTS participants_email_game_key");
  await db.query("ALTER TABLE participants ADD COLUMN IF NOT EXISTS is_reserve BOOLEAN NOT NULL DEFAULT false");
  await db.query("ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS round_times JSONB");
  await db.query("INSERT INTO settings (key, value) VALUES ('no_show_minutes', '10') ON CONFLICT (key) DO NOTHING");
  await db.query(`CREATE TABLE IF NOT EXISTS applications (
    id SERIAL PRIMARY KEY, full_name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL, country TEXT NOT NULL, company TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'approved', 'reserve')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  await db.query("ALTER TABLE applications ADD COLUMN IF NOT EXISTS password TEXT");
}

async function ensureSchemaWithRetry() {
  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      await ensureSchemaOnce();
      return;
    } catch (err) {
      console.error(`DB bağlantı/şema denemesi ${attempt}/10:`, err.message);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  throw new Error("Veritabanına bağlanılamadı");
}

export async function q(text, params) {
  if (!globalForDb.__dbReady) {
    globalForDb.__dbReady = ensureSchemaWithRetry().catch((err) => {
      globalForDb.__dbReady = null; // bir sonraki çağrı baştan denesin
      throw err;
    });
  }
  await globalForDb.__dbReady;
  const res = await db.query(text, params);
  return res.rows;
}

export async function audit(action, detail, actor = "otomatik") {
  await q("INSERT INTO audit_log (actor, action, detail) VALUES ($1, $2, $3)", [
    actor,
    action,
    JSON.stringify(detail ?? {}),
  ]);
}
