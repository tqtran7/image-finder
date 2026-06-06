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

  if (result?.id) scanRoot(result.id);

  revalidatePath("/");
}

export async function rescanRoot(rootId: number) {
  scanRoot(rootId);
  revalidatePath("/");
}

export async function removeRoot(id: number) {
  getDb().prepare("DELETE FROM roots WHERE id = ?").run(id);
  revalidatePath("/");
}

// ── Tags ───────────────────────────────────────────────────────────────────

export async function addTags(imageIds: number[], tagNames: string[]) {
  const db = getDb();
  const now = Date.now();

  // INSERT OR IGNORE so we don't fail on duplicate names (case-insensitive)
  const upsertTag = db.prepare(
    `INSERT INTO tags (name) VALUES (lower(?))
     ON CONFLICT(name) DO UPDATE SET name = name
     RETURNING id`,
  );
  const insertImageTag = db.prepare(
    `INSERT INTO image_tags (image_id, tag_id, source, created_at)
     VALUES (?, ?, 'manual', ?)
     ON CONFLICT(image_id, tag_id) DO NOTHING`,
  );

  db.transaction(() => {
    for (const raw of tagNames) {
      const name = raw.trim().toLowerCase();
      if (!name) continue;
      const tag = upsertTag.get(name) as { id: number } | undefined;
      if (!tag) continue;
      for (const imageId of imageIds) {
        insertImageTag.run(imageId, tag.id, now);
      }
    }
  })();

  revalidatePath("/");
}

export async function removeTag(imageId: number, tagName: string) {
  getDb()
    .prepare(
      `DELETE FROM image_tags
       WHERE image_id = ?
         AND tag_id = (SELECT id FROM tags WHERE name = lower(?) COLLATE NOCASE)`,
    )
    .run(imageId, tagName);
  revalidatePath("/");
}
