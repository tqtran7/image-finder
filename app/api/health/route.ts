import { getDb, DB_PATH } from "@/lib/db";

// Throwaway sanity endpoint for Step 1. Confirms the native better-sqlite3
// binding loads, the DB file opens, and the schema migrated. Remove later.
export async function GET() {
  const db = getDb();

  const tables = db
    .prepare(
      `SELECT name FROM sqlite_master
       WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
       ORDER BY name`,
    )
    .all()
    .map((row) => (row as { name: string }).name);

  return Response.json({ ok: true, dbPath: DB_PATH, tables });
}
