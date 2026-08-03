import { Pool } from "pg";

const globalForDb = globalThis;

export const db =
  globalForDb.__dbPool ??
  new Pool({ connectionString: process.env.DATABASE_URL });

if (!globalForDb.__dbPool) globalForDb.__dbPool = db;

export async function q(text, params) {
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
