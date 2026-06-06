"use server";

import { revalidatePath } from "next/cache";
import { statSync } from "node:fs";
import path from "node:path";
import { getDb } from "@/lib/db";
import { scanRoot } from "@/lib/scan";
import { getTagger } from "@/lib/taggers";

// ── Collections ────────────────────────────────────────────────────────────

export async function createCollection(name: string): Promise<number> {
  const db = getDb();
  const result = db
    .prepare(
      "INSERT INTO collections (name, prompt, created_at) VALUES (?, NULL, ?) RETURNING id",
    )
    .get(name.trim(), Date.now()) as { id: number };
  revalidatePath("/");
  return result.id;
}

export async function renameCollection(id: number, name: string) {
  getDb().prepare("UPDATE collections SET name = ? WHERE id = ?").run(name.trim(), id);
  revalidatePath("/");
}

export async function updateCollectionPrompt(id: number, prompt: string) {
  const trimmed = prompt.trim() || null;
  getDb().prepare("UPDATE collections SET prompt = ? WHERE id = ?").run(trimmed, id);
  revalidatePath("/");
}

export async function deleteCollection(id: number) {
  const db = getDb();
  const count = (
    db.prepare("SELECT COUNT(*) AS n FROM collections").get() as { n: number }
  ).n;
  if (count <= 1) throw new Error("Cannot delete the last remaining collection.");

  const defaultId = (
    db
      .prepare("SELECT id FROM collections WHERE id != ? ORDER BY id ASC LIMIT 1")
      .get(id) as { id: number }
  ).id;

  db.transaction(() => {
    db.prepare("UPDATE roots SET collection_id = ? WHERE collection_id = ?").run(defaultId, id);
    db.prepare("DELETE FROM collections WHERE id = ?").run(id);
  })();
  revalidatePath("/");
}

// ── Roots ──────────────────────────────────────────────────────────────────

export async function addRoot(absPath: string, collectionId: number, label?: string) {
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
      `INSERT INTO roots (path, label, added_at, collection_id)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(path) DO UPDATE SET label = excluded.label, collection_id = excluded.collection_id
       RETURNING id`,
    )
    .get(resolved, label ?? path.basename(resolved), now, collectionId) as
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

// ── AI auto-tagging ────────────────────────────────────────────────────────

export async function autoTagImages(imageIds: number[]) {
  console.log(`[autoTag] invoked with ${imageIds.length} ids:`, imageIds);
  console.log(`[autoTag] ANTHROPIC_API_KEY present:`, !!process.env.ANTHROPIC_API_KEY);
  const db = getDb();
  const tagger = getTagger();
  const now = Date.now();

  const images = db
    .prepare(
      `SELECT i.id, i.abs_path, i.ext, c.prompt AS collection_prompt
       FROM images i
       JOIN roots r ON r.id = i.root_id
       JOIN collections c ON c.id = r.collection_id
       WHERE i.id IN (${imageIds.map(() => "?").join(",")})`,
    )
    .all(...imageIds) as { id: number; abs_path: string; ext: string; collection_prompt: string | null }[];

  const insert = db.prepare(
    `INSERT OR IGNORE INTO tag_suggestions (image_id, name, model, created_at, status)
     VALUES (?, lower(?), ?, ?, 'pending')`,
  );

  let tagged = 0;
  const errors: string[] = [];

  for (const img of images) {
    let tags: string[];
    try {
      tags = await tagger.tag(img.abs_path, img.ext, img.collection_prompt ?? undefined);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[autoTag] ${img.abs_path} failed:`, msg);
      errors.push(`${img.id}: ${msg}`);
      continue;
    }
    if (tags.length === 0) {
      console.warn(`[autoTag] ${img.abs_path} (.${img.ext}) returned no tags`);
    }
    db.transaction(() => {
      for (const tag of tags) {
        if (tag) insert.run(img.id, tag, process.env.TAGGER_MODEL ?? "claude-haiku-4-5", now);
      }
    })();
    if (tags.length > 0) tagged++;
  }

  console.log(`[autoTag] done: ${tagged}/${images.length} images tagged, ${errors.length} errors`);
  revalidatePath("/");
  return { tagged, total: images.length, errors };
}

export async function acceptSuggestions(imageId: number) {
  const db = getDb();
  const now = Date.now();

  const suggestions = db
    .prepare("SELECT id, name FROM tag_suggestions WHERE image_id = ? AND status = 'pending'")
    .all(imageId) as { id: number; name: string }[];

  const upsertTag = db.prepare(
    `INSERT INTO tags (name) VALUES (lower(?))
     ON CONFLICT(name) DO UPDATE SET name = name
     RETURNING id`,
  );
  const insertImageTag = db.prepare(
    `INSERT INTO image_tags (image_id, tag_id, source, created_at)
     VALUES (?, ?, 'ai', ?)
     ON CONFLICT(image_id, tag_id) DO NOTHING`,
  );
  const markAccepted = db.prepare(
    "UPDATE tag_suggestions SET status = 'accepted' WHERE id = ?",
  );

  db.transaction(() => {
    for (const s of suggestions) {
      const tag = upsertTag.get(s.name) as { id: number } | undefined;
      if (tag) insertImageTag.run(imageId, tag.id, now);
      markAccepted.run(s.id);
    }
  })();

  revalidatePath("/");
}

export async function rejectSuggestions(imageId: number) {
  getDb()
    .prepare("UPDATE tag_suggestions SET status = 'rejected' WHERE image_id = ? AND status = 'pending'")
    .run(imageId);
  revalidatePath("/");
}
