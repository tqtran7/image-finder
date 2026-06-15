import { getDb } from "@/lib/db";
import { searchImages, parseFilters } from "@/lib/search";
import type { RootWithCount } from "@/app/page";
import type { FileDetailGroup } from "@/components/TagSuggestions";
import type { CollectionItem } from "@/components/CollectionSwitcher";
import type { ImageItem } from "@/components/IconCard";

export type SectionKind = "image" | "mesh";

export interface SectionData {
  roots: RootWithCount[];
  images: ImageItem[];
  vocabulary: string[];
  totalCount: number;
  totalTaggedCount: number;
  suggestions: FileDetailGroup[];
  collections: CollectionItem[];
  activeCollectionId: number;
}

/**
 * Loads everything PageContent needs for a section (image or mesh). Collections
 * are filtered by `kind`; all other queries scope to the active collection, so a
 * section only ever sees its own folders, files, tags and counts.
 */
export function loadSection(
  kind: SectionKind,
  params: Record<string, string | string[] | undefined>,
): SectionData {
  const db = getDb();

  const collections = db
    .prepare(
      "SELECT id, name, prompt FROM collections WHERE kind = ? ORDER BY sort_order ASC, id ASC",
    )
    .all(kind) as CollectionItem[];

  const rawCollectionParam = params["collection"];
  const collectionParam = Array.isArray(rawCollectionParam)
    ? rawCollectionParam[0]
    : rawCollectionParam;
  const activeCollectionId =
    collectionParam && collections.some((c) => c.id === Number(collectionParam))
      ? Number(collectionParam)
      : (collections[0]?.id ?? 0);

  const roots = db
    .prepare(
      `SELECT r.id, r.path, r.label, r.added_at, r.last_scanned_at,
              COUNT(CASE WHEN i.missing_at IS NULL THEN 1 END) AS image_count,
              COUNT(CASE WHEN i.missing_at IS NULL AND EXISTS (SELECT 1 FROM image_tags it WHERE it.image_id = i.id) THEN 1 END) AS tagged_count
       FROM roots r
       LEFT JOIN images i ON i.root_id = r.id
       WHERE r.collection_id = ?
       GROUP BY r.id
       ORDER BY r.sort_order ASC, r.added_at DESC`,
    )
    .all(activeCollectionId) as RootWithCount[];

  const vocabulary = (
    db
      .prepare(
        `SELECT DISTINCT t.name
         FROM tags t
         JOIN image_tags it ON it.tag_id = t.id
         JOIN images i ON i.id = it.image_id
         JOIN roots r ON r.id = i.root_id
         WHERE r.collection_id = ?
         ORDER BY t.name COLLATE NOCASE`,
      )
      .all(activeCollectionId) as { name: string }[]
  ).map((r) => r.name);

  const { totalCount, totalTaggedCount } = db
    .prepare(
      `SELECT COUNT(*) AS totalCount,
              COUNT(CASE WHEN EXISTS (SELECT 1 FROM image_tags it WHERE it.image_id = i.id) THEN 1 END) AS totalTaggedCount
       FROM images i
       JOIN roots r ON r.id = i.root_id
       WHERE i.missing_at IS NULL AND r.collection_id = ?`,
    )
    .get(activeCollectionId) as { totalCount: number; totalTaggedCount: number };

  const filters = parseFilters(params);
  // Always scope the file query to the active collection
  const images = searchImages({ ...filters, collectionId: activeCollectionId });

  const rawSuggestions = db
    .prepare(
      `SELECT DISTINCT ts.image_id, i.filename, ts.name
       FROM tag_suggestions ts
       JOIN images i ON i.id = ts.image_id
       JOIN roots r ON r.id = i.root_id
       WHERE ts.status = 'pending' AND r.collection_id = ?
       ORDER BY ts.image_id, ts.name`,
    )
    .all(activeCollectionId) as { image_id: number; filename: string; name: string }[];

  // Group by image_id
  const suggestionMap = new Map<number, FileDetailGroup>();
  for (const row of rawSuggestions) {
    if (!suggestionMap.has(row.image_id)) {
      suggestionMap.set(row.image_id, { imageId: row.image_id, filename: row.filename, tags: [] });
    }
    suggestionMap.get(row.image_id)!.tags.push(row.name);
  }
  const suggestions = Array.from(suggestionMap.values());

  return {
    roots,
    images,
    vocabulary,
    totalCount,
    totalTaggedCount,
    suggestions,
    collections,
    activeCollectionId,
  };
}
