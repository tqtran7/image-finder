import { getDb } from "@/lib/db";
import PageContent from "@/components/PageContent";
import { searchImages, parseFilters } from "@/lib/search";
import type { SuggestionGroup } from "@/components/SuggestionsPanel";
import type { CollectionItem } from "@/components/CollectionSwitcher";

export interface RootWithCount {
  id: number;
  path: string;
  label: string;
  added_at: number | null;
  last_scanned_at: number | null;
  image_count: number;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[]>>;
}) {
  const db = getDb();
  const params = await searchParams;

  const collections = db
    .prepare("SELECT id, name, prompt FROM collections ORDER BY id ASC")
    .all() as CollectionItem[];

  const rawCollectionParam = params["collection"];
  const collectionParam = Array.isArray(rawCollectionParam)
    ? rawCollectionParam[0]
    : rawCollectionParam;
  const activeCollectionId =
    collectionParam && collections.some((c) => c.id === Number(collectionParam))
      ? Number(collectionParam)
      : (collections[0]?.id ?? 1);

  const roots = db
    .prepare(
      `SELECT r.id, r.path, r.label, r.added_at, r.last_scanned_at,
              COUNT(CASE WHEN i.missing_at IS NULL THEN 1 END) AS image_count
       FROM roots r
       LEFT JOIN images i ON i.root_id = r.id
       WHERE r.collection_id = ?
       GROUP BY r.id
       ORDER BY r.added_at DESC`,
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

  const totalCount = (
    db
      .prepare(
        `SELECT COUNT(*) AS n FROM images i
         JOIN roots r ON r.id = i.root_id
         WHERE i.missing_at IS NULL AND r.collection_id = ?`,
      )
      .get(activeCollectionId) as { n: number }
  ).n;

  const filters = parseFilters(params);
  // Always scope the image query to the active collection
  const images = searchImages({ ...filters, collectionId: activeCollectionId });

  const rawSuggestions = db
    .prepare(
      `SELECT ts.image_id, i.filename, ts.name
       FROM tag_suggestions ts
       JOIN images i ON i.id = ts.image_id
       JOIN roots r ON r.id = i.root_id
       WHERE ts.status = 'pending' AND r.collection_id = ?
       ORDER BY ts.image_id, ts.name`,
    )
    .all(activeCollectionId) as { image_id: number; filename: string; name: string }[];

  // Group by image_id
  const suggestionMap = new Map<number, SuggestionGroup>();
  for (const row of rawSuggestions) {
    if (!suggestionMap.has(row.image_id)) {
      suggestionMap.set(row.image_id, { imageId: row.image_id, filename: row.filename, tags: [] });
    }
    suggestionMap.get(row.image_id)!.tags.push(row.name);
  }
  const suggestions = Array.from(suggestionMap.values());

  return (
    <PageContent
      roots={roots}
      images={images}
      vocabulary={vocabulary}
      totalCount={totalCount}
      suggestions={suggestions}
      collections={collections}
      activeCollectionId={activeCollectionId}
    />
  );
}
