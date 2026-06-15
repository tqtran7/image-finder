import { readdirSync, statSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { getDb } from "@/lib/db";

const IMAGE_EXTS = new Set([
  "svg", "png", "jpg", "jpeg", "gif", "webp", "ico", "bmp", "avif",
]);

const MESH_EXTS = new Set(["fbx"]);

const EXTS_BY_KIND: Record<string, Set<string>> = {
  image: IMAGE_EXTS,
  mesh: MESH_EXTS,
};

interface FileStat {
  size: number;
  mtime: number;
}

export interface ScanResult {
  indexed: number;
  missing: number;
}

function sha256(filePath: string): string {
  const buf = readFileSync(filePath);
  return createHash("sha256").update(buf).digest("hex");
}

export function scanRoot(rootId: number): ScanResult {
  const db = getDb();

  const root = db
    .prepare(
      `SELECT r.id, r.path, c.kind
       FROM roots r
       LEFT JOIN collections c ON c.id = r.collection_id
       WHERE r.id = ?`,
    )
    .get(rootId) as { id: number; path: string; kind: string | null } | undefined;

  if (!root) throw new Error(`Root ${rootId} not found`);

  // The file extensions to index depend on the collection's kind (image vs mesh)
  const exts = EXTS_BY_KIND[root.kind ?? "image"] ?? IMAGE_EXTS;

  // Walk the directory and collect all matching file paths + stats
  const found = new Map<string, FileStat>();
  walkDir(root.path, found, exts);

  const now = Date.now();

  // All currently-indexed (non-missing) files for this root
  const existing = db
    .prepare(
      "SELECT id, abs_path, content_hash FROM images WHERE root_id = ? AND missing_at IS NULL",
    )
    .all(rootId) as { id: number; abs_path: string; content_hash: string | null }[];

  const existingByPath = new Map(existing.map((r) => [r.abs_path, r]));

  // Build a hash→row map for files that are currently indexed and have a hash.
  // Used to reattach tags when a file is moved/renamed.
  const existingByHash = new Map<string, { id: number; abs_path: string }>();
  for (const row of existing) {
    if (row.content_hash) existingByHash.set(row.content_hash, row);
  }

  const upsertNew = db.prepare(`
    INSERT INTO images
      (root_id, abs_path, rel_path, filename, ext, size, mtime, content_hash, indexed_at, missing_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
    ON CONFLICT(abs_path) DO UPDATE SET
      size         = excluded.size,
      mtime        = excluded.mtime,
      content_hash = excluded.content_hash,
      indexed_at   = excluded.indexed_at,
      missing_at   = NULL
  `);

  // Reattach a moved file: update abs_path/rel_path/filename on the existing row,
  // keeping its id and all image_tags intact.
  const reattach = db.prepare(`
    UPDATE images
    SET abs_path   = ?,
        rel_path   = ?,
        filename   = ?,
        ext        = ?,
        size       = ?,
        mtime      = ?,
        indexed_at = ?,
        missing_at = NULL
    WHERE id = ?
  `);

  const markMissing = db.prepare(
    "UPDATE images SET missing_at = ? WHERE id = ? AND missing_at IS NULL",
  );

  // Paths that were handled via reattach (not a new insert)
  const reattachedPaths = new Set<string>();
  // Rows whose abs_path changed — they should not be marked missing
  const reattachedIds = new Set<number>();

  db.transaction(() => {
    for (const [absPath, stat] of found) {
      const rel = path.relative(root.path, absPath);
      const filename = path.basename(absPath);
      const ext = path.extname(absPath).slice(1).toLowerCase();

      // Compute hash for every found file
      let hash: string;
      try {
        hash = sha256(absPath);
      } catch {
        hash = "";
      }

      if (!existingByPath.has(absPath)) {
        // New path — check if it's a moved/renamed file we already know by hash
        const prior = hash ? existingByHash.get(hash) : undefined;
        if (prior && !found.has(prior.abs_path)) {
          // The old path is no longer on disk → this is a move
          reattach.run(absPath, rel, filename, ext, stat.size, stat.mtime, now, prior.id);
          reattachedPaths.add(absPath);
          reattachedIds.add(prior.id);
        } else {
          upsertNew.run(rootId, absPath, rel, filename, ext, stat.size, stat.mtime, hash || null, now);
        }
      } else {
        // Known path — update stats and hash
        upsertNew.run(rootId, absPath, rel, filename, ext, stat.size, stat.mtime, hash || null, now);
      }
    }
  })();

  // Mark files that have disappeared since last scan (skip reattached rows)
  let missingCount = 0;
  for (const row of existing) {
    if (!found.has(row.abs_path) && !reattachedIds.has(row.id)) {
      markMissing.run(now, row.id);
      missingCount++;
    }
  }

  // Update scan timestamp on the root
  db.prepare("UPDATE roots SET last_scanned_at = ? WHERE id = ?").run(now, rootId);

  return { indexed: found.size, missing: missingCount };
}

// ── helpers ────────────────────────────────────────────────────────────────

function walkDir(dir: string, out: Map<string, FileStat>, exts: Set<string>): void {
  let names: string[];
  try {
    names = readdirSync(dir) as string[];
  } catch {
    return; // skip inaccessible directories
  }

  for (const name of names) {
    const full = path.join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }

    if (st.isDirectory()) {
      walkDir(full, out, exts);
    } else if (st.isFile()) {
      const ext = path.extname(name).slice(1).toLowerCase();
      if (exts.has(ext)) {
        out.set(full, { size: st.size, mtime: Math.floor(st.mtimeMs) });
      }
    }
  }
}
