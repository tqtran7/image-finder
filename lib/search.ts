import { getDb } from "@/lib/db";
import type { ImageItem } from "@/components/IconCard";

export interface SearchFilters {
  tags?: string[];
  rootId?: number;
  collectionId?: number;
}

interface RawImage {
  id: number;
  filename: string;
  ext: string;
  tag_names: string;
}

export function searchImages(filters: SearchFilters): ImageItem[] {
  const db = getDb();
  const { tags, rootId, collectionId } = filters;

  const conditions: string[] = ["i.missing_at IS NULL"];
  const params: (string | number)[] = [];

  if (collectionId) {
    conditions.push(
      "i.root_id IN (SELECT id FROM roots WHERE collection_id = ?)",
    );
    params.push(collectionId);
  } else if (rootId) {
    conditions.push("i.root_id = ?");
    params.push(rootId);
  }

  if (tags && tags.length > 0) {
    const lowered = tags.map((t) => t.toLowerCase());
    const placeholders = lowered.map(() => "?").join(", ");
    // Always AND — image must have every specified tag
    conditions.push(
      `i.id IN (
         SELECT image_id FROM image_tags it
         JOIN tags t ON t.id = it.tag_id
         WHERE lower(t.name) IN (${placeholders})
         GROUP BY image_id
         HAVING COUNT(DISTINCT lower(t.name)) = ?
       )`,
    );
    params.push(...lowered, lowered.length);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;

  const rows = db
    .prepare(
      `SELECT i.id, i.filename, i.ext,
              COALESCE(GROUP_CONCAT(t2.name, '|||'), '') AS tag_names
       FROM images i
       LEFT JOIN image_tags it2 ON it2.image_id = i.id
       LEFT JOIN tags t2 ON t2.id = it2.tag_id
       ${where}
       GROUP BY i.id
       ORDER BY i.filename COLLATE NOCASE`,
    )
    .all(...params) as RawImage[];

  return rows.map((r) => ({
    id: r.id,
    filename: r.filename,
    ext: r.ext,
    tags: r.tag_names ? r.tag_names.split("|||") : [],
  }));
}

export function parseFilters(
  params: Record<string, string | string[] | undefined>,
): SearchFilters {
  const raw = (key: string) => {
    const v = params[key];
    return Array.isArray(v) ? v[0] : v;
  };

  const tags = raw("tags")
    ?.split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  return {
    tags: tags?.length ? tags : undefined,
    rootId: raw("root") ? Number(raw("root")) : undefined,
    collectionId: raw("collection") ? Number(raw("collection")) : undefined,
  };
}
