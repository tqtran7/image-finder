import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { getDb } from "@/lib/db";

const IMAGE_EXTS = new Set([
  "svg", "png", "jpg", "jpeg", "gif", "webp", "ico", "bmp", "avif",
]);

interface FileStat {
  size: number;
  mtime: number;
}

export interface ScanResult {
  indexed: number;
  missing: number;
}

export function scanRoot(rootId: number): ScanResult {
  const db = getDb();

  const root = db
    .prepare("SELECT id, path FROM roots WHERE id = ?")
    .get(rootId) as { id: number; path: string } | undefined;

  if (!root) throw new Error(`Root ${rootId} not found`);

  // Walk the directory and collect all image file paths + stats
  const found = new Map<string, FileStat>();
  walkDir(root.path, found);

  const now = Date.now();

  // All currently-indexed (non-missing) files for this root
  const existing = db
    .prepare(
      "SELECT id, abs_path FROM images WHERE root_id = ? AND missing_at IS NULL",
    )
    .all(rootId) as { id: number; abs_path: string }[];

  const existingPaths = new Set(existing.map((r) => r.abs_path));

  // Upsert every found file in a single transaction
  const upsert = db.prepare(`
    INSERT INTO images
      (root_id, abs_path, rel_path, filename, ext, size, mtime, indexed_at, missing_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
    ON CONFLICT(abs_path) DO UPDATE SET
      size       = excluded.size,
      mtime      = excluded.mtime,
      indexed_at = excluded.indexed_at,
      missing_at = NULL
  `);

  db.transaction(() => {
    for (const [absPath, stat] of found) {
      const rel = path.relative(root.path, absPath);
      const filename = path.basename(absPath);
      const ext = path.extname(absPath).slice(1).toLowerCase();
      upsert.run(rootId, absPath, rel, filename, ext, stat.size, stat.mtime, now);
    }
  })();

  // Mark files that have disappeared since last scan
  const markMissing = db.prepare(
    "UPDATE images SET missing_at = ? WHERE id = ? AND missing_at IS NULL",
  );

  let missingCount = 0;
  for (const row of existing) {
    if (!found.has(row.abs_path)) {
      markMissing.run(now, row.id);
      missingCount++;
    }
  }

  // Update scan timestamp on the root
  db.prepare("UPDATE roots SET last_scanned_at = ? WHERE id = ?").run(now, rootId);

  return { indexed: found.size, missing: missingCount };
}

// ── helpers ────────────────────────────────────────────────────────────────

function walkDir(dir: string, out: Map<string, FileStat>): void {
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
      walkDir(full, out);
    } else if (st.isFile()) {
      const ext = path.extname(name).slice(1).toLowerCase();
      if (IMAGE_EXTS.has(ext)) {
        out.set(full, { size: st.size, mtime: Math.floor(st.mtimeMs) });
      }
    }
  }
}
