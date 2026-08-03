import { Pool } from "pg";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const globalForDb = globalThis;

export const db =
  globalForDb.__dbPool ??
  new Pool({ connectionString: process.env.DATABASE_URL });

if (!globalForDb.__dbPool) globalForDb.__dbPool = db;

// İlk açılışta şema yoksa kur (schema.sql idempotent: IF NOT EXISTS / ON CONFLICT)
async function ensureSchema() {
  const res = await db.query("SELECT to_regclass('public.participants') AS t");
  if (!res.rows[0].t) {
    const sql = readFileSync(join(process.cwd(), "db", "schema.sql"), "utf8");
    await db.query(sql);
    console.log("🗄  veritabanı şeması kuruldu");
  }
}
globalForDb.__dbReady ??= ensureSchema();

export async function q(text, params) {
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
