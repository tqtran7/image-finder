"use server";

import { revalidatePath } from "next/cache";
import { statSync } from "node:fs";
import path from "node:path";
import { getDb } from "@/lib/db";
import { scanRoot } from "@/lib/scan";
import { getTagger, getTaggerModel } from "@/lib/taggers";

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

export async function clearTagsForRoot(rootId: number) {
  const db = getDb();
  db.transaction(() => {
    db.prepare(
      `DELETE FROM image_tags
       WHERE image_id IN (SELECT id FROM images WHERE root_id = ?)
         AND source = 'ai'`,
    ).run(rootId);
    db.prepare(
      `UPDATE images SET tagged_at = NULL, tagger_model = NULL WHERE root_id = ?`,
    ).run(rootId);
  })();
  revalidatePath("/");
}

export async function clearGeneratedTags(imageIds: number[]) {
  if (imageIds.length === 0) return;
  const db = getDb();
  const placeholders = imageIds.map(() => "?").join(",");
  db.transaction(() => {
    db.prepare(
      `DELETE FROM image_tags WHERE source = 'ai' AND image_id IN (${placeholders})`,
    ).run(...imageIds);
    db.prepare(
      `UPDATE images SET tagged_at = NULL, tagger_model = NULL WHERE id IN (${placeholders})`,
    ).run(...imageIds);
  })();
  revalidatePath("/");
}

export async function removeTag(imageId: number, tagName: string) {
  const db = getDb();
  db.transaction(() => {
    db.prepare(
      `DELETE FROM image_tags
       WHERE image_id = ?
         AND tag_id = (SELECT id FROM tags WHERE name = lower(?) COLLATE NOCASE)`,
    ).run(imageId, tagName);
    // Clear tagging stamp only when no AI tags remain — so the next batch run
    // re-tags this image if the skip-already-tagged filter is on.
    db.prepare(
      `UPDATE images SET tagged_at = NULL, tagger_model = NULL
       WHERE id = ?
         AND NOT EXISTS (
           SELECT 1 FROM image_tags WHERE image_id = ? AND source = 'ai'
         )`,
    ).run(imageId, imageId);
  })();
  revalidatePath("/");
}

// ── AI auto-tagging ────────────────────────────────────────────────────────

export async function autoTagImages(imageIds: number[], invert = false, addBlackBackground = false) {
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
      tags = await tagger.tag(img.abs_path, img.ext, img.collection_prompt ?? undefined, invert, addBlackBackground);
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
        if (tag) insert.run(img.id, tag, getTaggerModel(), now);
      }
    })();
    if (tags.length > 0) tagged++;
  }

  console.log(`[autoTag] done: ${tagged}/${images.length} images tagged, ${errors.length} errors`);
  revalidatePath("/");
  return { tagged, total: images.length, errors };
}

/** Rules governing which images a batch auto-tag run should (re-)tag. */
export interface AutoTagFilter {
  /** Skip images that already have auto-tags (the resumable default). */
  skipTagged: boolean;
  /** When skipping, still re-tag images whose tagger_model differs from current. */
  retagIfDifferentModel: boolean;
  /** When skipping, still re-tag images tagged longer ago than this many days. */
  retagOlderThanDays: number | null;
  /**
   * Tagging-time option (not a selection predicate): invert image colors before
   * sending to the vision model, so white/light artwork on a transparent background
   * is visible. Ignored by buildTagFilterClause.
   */
  invert: boolean;
  /**
   * Tagging-time option: composite the image onto a solid black background before
   * sending to the vision model. Removes transparency so white/light artwork on a
   * transparent background shows up clearly. Ignored by buildTagFilterClause.
   */
  addBlackBackground: boolean;
}

/**
 * Builds the SQL predicate + bound params for an AutoTagFilter, to be ANDed onto
 * the base `missing_at IS NULL` clause. When skipTagged is off, no filter applies
 * (re-tag everything). When on, an image qualifies if it's never been tagged, OR
 * it matches one of the enabled re-tag exceptions.
 */
function buildTagFilterClause(
  filter: AutoTagFilter,
): { sql: string; params: (string | number)[] } {
  if (!filter.skipTagged) return { sql: "", params: [] };

  const ors = ["tagged_at IS NULL"];
  const params: (string | number)[] = [];

  if (filter.retagIfDifferentModel) {
    ors.push("(tagged_at IS NOT NULL AND tagger_model IS NOT ?)");
    params.push(getTaggerModel());
  }
  if (filter.retagOlderThanDays != null) {
    const cutoff = Date.now() - filter.retagOlderThanDays * 86_400_000;
    ors.push("(tagged_at IS NOT NULL AND tagged_at < ?)");
    params.push(cutoff);
  }

  return { sql: ` AND (${ors.join(" OR ")})`, params };
}

/** Returns the IDs of non-missing images in a root that match the filter, ordered by filename. */
export async function getImagesForRoot(
  rootId: number,
  filter: AutoTagFilter,
): Promise<{ id: number }[]> {
  const { sql, params } = buildTagFilterClause(filter);
  return getDb()
    .prepare(
      `SELECT id FROM images
       WHERE root_id = ? AND missing_at IS NULL${sql}
       ORDER BY filename COLLATE NOCASE`,
    )
    .all(rootId, ...params) as { id: number }[];
}

/** Returns the IDs of non-missing images in a collection that match the filter, ordered by filename. */
export async function getImagesForCollection(
  collectionId: number,
  filter: AutoTagFilter,
): Promise<{ id: number }[]> {
  const { sql, params } = buildTagFilterClause(filter);
  return getDb()
    .prepare(
      `SELECT i.id FROM images i
       JOIN roots r ON r.id = i.root_id
       WHERE r.collection_id = ? AND i.missing_at IS NULL${sql}
       ORDER BY i.filename COLLATE NOCASE`,
    )
    .all(collectionId, ...params) as { id: number }[];
}

/**
 * Tags a single image and writes the result directly into image_tags (source 'ai').
 * Does NOT call revalidatePath — caller should router.refresh() after the full batch.
 */
export async function autoTagAndAcceptImage(
  imageId: number,
  invert = false,
  addBlackBackground = false,
): Promise<{ tagged: boolean; error?: string }> {
  const db = getDb();
  const tagger = getTagger();
  const now = Date.now();

  const img = db
    .prepare(
      `SELECT i.id, i.abs_path, i.ext, c.prompt AS collection_prompt
       FROM images i
       JOIN roots r ON r.id = i.root_id
       JOIN collections c ON c.id = r.collection_id
       WHERE i.id = ? AND i.missing_at IS NULL`,
    )
    .get(imageId) as {
    id: number;
    abs_path: string;
    ext: string;
    collection_prompt: string | null;
  } | undefined;

  if (!img) return { tagged: false, error: "Image not found or missing" };

  let tags: string[];
  try {
    tags = await tagger.tag(img.abs_path, img.ext, img.collection_prompt ?? undefined, invert, addBlackBackground);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { tagged: false, error: msg };
  }

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
  const markTagged = db.prepare(
    "UPDATE images SET tagged_at = ?, tagger_model = ? WHERE id = ?",
  );

  // The image was processed without error — stamp it (even with zero tags) so
  // batch runs treat it as done and don't retry it forever.
  db.transaction(() => {
    for (const name of tags) {
      if (!name) continue;
      const tag = upsertTag.get(name) as { id: number } | undefined;
      if (tag) insertImageTag.run(img.id, tag.id, now);
    }
    markTagged.run(now, getTaggerModel(), img.id);
  })();

  return { tagged: tags.length > 0 };
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
