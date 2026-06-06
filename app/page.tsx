import { getDb } from "@/lib/db";
import PageContent from "@/components/PageContent";
import { searchImages, parseFilters } from "@/lib/search";

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

  return (
    <PageContent
      roots={roots}
      images={images}
      vocabulary={vocabulary}
      totalCount={totalCount}
      filters={filters}
    />
  );
}
