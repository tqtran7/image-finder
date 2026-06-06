"use server";

import { revalidatePath } from "next/cache";
import { statSync } from "node:fs";
import path from "node:path";
import { getDb } from "@/lib/db";
import { scanRoot } from "@/lib/scan";

// ── Roots ──────────────────────────────────────────────────────────────────

export async function addRoot(absPath: string, label?: string) {
  const resolved = path.resolve(absPath);

  try {
    const st = statSync(resolved);
    if (!st.isDirectory()) throw new Error(`Not a directory: ${resolved}`);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`Directory does not exist: ${resolved}`);
    }
    throw err;
  }

  const db = getDb();
  const now = Date.now();

  const result = db
    .prepare(
      `INSERT INTO roots (path, label, added_at)
       VALUES (?, ?, ?)
       ON CONFLICT(path) DO UPDATE SET label = excluded.label
       RETURNING id`,
    )
    .get(resolved, label ?? path.basename(resolved), now) as
    | { id: number }
    | undefined;

  if (result?.id) {
    scanRoot(result.id);
  }

  revalidatePath("/");
}

export async function rescanRoot(rootId: number) {
  scanRoot(rootId);
  revalidatePath("/");
}

export async function removeRoot(id: number) {
  const db = getDb();
  db.prepare("DELETE FROM roots WHERE id = ?").run(id);
  revalidatePath("/");
}
