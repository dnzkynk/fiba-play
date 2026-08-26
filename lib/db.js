import { Pool } from "pg";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { hashPassword } from "./crypto.js";

const globalForDb = globalThis;

export const db =
  globalForDb.__dbPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    // Yük altında (yük testi / 64 kişilik tur başlangıcı) havuz tıkanmasın
    max: parseInt(process.env.DB_POOL_MAX ?? "20", 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

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
  // Telefon artık istenmiyor — mevcut sütun korunur (geçmiş veri), zorunluluk kaldırılır
  await db.query("ALTER TABLE applications ALTER COLUMN phone DROP NOT NULL");
  // Fikstürde bayrak gösterimi için katılımcıya ülke kodu eklendi
  await db.query("ALTER TABLE participants ADD COLUMN IF NOT EXISTS country TEXT");

  // Turnuva üyeliği: kura ÖNCESİ kişi↔turnuva bağı. PK aynı kişinin aynı turnuvaya
  // iki kez atanmasını engeller; farklı turnuvalara atanabilir (çoklu üyelik).
  await db.query(`CREATE TABLE IF NOT EXISTS tournament_players (
    tournament_id INT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    participant_id INT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    is_reserve BOOLEAN NOT NULL DEFAULT false,
    added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (tournament_id, participant_id))`);

  // Mevcut (kura çekilmiş) turnuvaların oyuncularını üyelik tablosuna doldur —
  // yeni atama arayüzü eski turnuvalarla da tutarlı görünsün.
  await db.query(`INSERT INTO tournament_players (tournament_id, participant_id, is_reserve)
    SELECT DISTINCT m.tournament_id, p.id, p.is_reserve
    FROM matches m JOIN participants p ON p.id IN (m.p1_id, m.p2_id)
    ON CONFLICT DO NOTHING`);

  // İlk yönetici: yalnız hiç yönetici yoksa ve ortam değişkenleri verilmişse açılır.
  // (Kaynak kodda sabit parola bulundurmamak için — public repoda sızıntı olmasın.)
  const seedEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const seedPass = process.env.SEED_ADMIN_PASSWORD?.trim();
  if (seedEmail && seedPass) {
    const { rows } = await db.query("SELECT count(*)::int AS n FROM admins");
    if (rows[0].n === 0) {
      await db.query(
        "INSERT INTO admins (full_name, email, password) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING",
        [process.env.SEED_ADMIN_NAME ?? "Yönetici", seedEmail, hashPassword(seedPass)]
      );
      console.log(`👤 ilk yönetici oluşturuldu: ${seedEmail}`);
    }
  }

  // Parola migrasyonu: düz metin kayıtları hash'e çevir.
  // AES ile şifrelenmiş eski kayıtlara dokunulmaz — ilk başarılı girişte hash'e yükseltilir.
  for (const table of ["participants", "applications", "admins"]) {
    const rows = await db.query(
      `SELECT id, password FROM ${table}
       WHERE password IS NOT NULL AND password NOT LIKE 'scrypt:%' AND password NOT LIKE 'enc:v1:%'`
    );
    for (const r of rows.rows) {
      await db.query(`UPDATE ${table} SET password = $1 WHERE id = $2`, [hashPassword(r.password), r.id]);
    }
    if (rows.rows.length) console.log(`🔒 ${table}: ${rows.rows.length} parola hash'lendi`);
  }

  // Parola sıfırlama jetonları (tek kullanımlık, süreli)
  await db.query(`CREATE TABLE IF NOT EXISTS password_resets (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  await db.query("DELETE FROM password_resets WHERE expires_at < now() - interval '7 days'");
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
