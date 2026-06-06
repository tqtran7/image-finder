import { getDb } from "@/lib/db";
import PageContent from "@/components/PageContent";
import { searchImages, parseFilters } from "@/lib/search";
import type { SuggestionGroup } from "@/components/SuggestionsPanel";

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

  const roots = db
    .prepare(
      `SELECT r.id, r.path, r.label, r.added_at, r.last_scanned_at,
              COUNT(CASE WHEN i.missing_at IS NULL THEN 1 END) AS image_count
       FROM roots r
       LEFT JOIN images i ON i.root_id = r.id
       GROUP BY r.id
       ORDER BY r.added_at DESC`,
    )
    .all() as RootWithCount[];

  const vocabulary = (
    db
      .prepare("SELECT name FROM tags ORDER BY name COLLATE NOCASE")
      .all() as { name: string }[]
  ).map((r) => r.name);

  const totalCount = (
    db
      .prepare("SELECT COUNT(*) AS n FROM images WHERE missing_at IS NULL")
      .get() as { n: number }
  ).n;

  const filters = parseFilters(params);
  const images = searchImages(filters);

  const rawSuggestions = db
    .prepare(
      `SELECT ts.image_id, i.filename, ts.name
       FROM tag_suggestions ts
       JOIN images i ON i.id = ts.image_id
       WHERE ts.status = 'pending'
       ORDER BY ts.image_id, ts.name`,
    )
    .all() as { image_id: number; filename: string; name: string }[];

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
    />
  );
}
