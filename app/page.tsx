import { getDb } from "@/lib/db";
import RootsManager from "@/components/RootsManager";
import IconGrid from "@/components/IconGrid";
import type { ImageItem } from "@/components/IconCard";

export interface RootWithCount {
  id: number;
  path: string;
  label: string;
  added_at: number | null;
  last_scanned_at: number | null;
  image_count: number;
}

export default function Home() {
  const db = getDb();

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

  const images = db
    .prepare(
      `SELECT id, filename, ext
       FROM images
       WHERE missing_at IS NULL
       ORDER BY filename COLLATE NOCASE`,
    )
    .all() as ImageItem[];

  return (
    <div className="h-screen flex flex-col font-sans bg-zinc-50">
      {/* Header */}
      <header className="shrink-0 bg-white border-b px-6 py-3 flex items-center">
        <h1 className="text-base font-semibold text-zinc-900">Icon Finder</h1>
      </header>

      {/* Body: sidebar + grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar — folders */}
        <aside className="w-72 shrink-0 border-r bg-white flex flex-col overflow-y-auto">
          <div className="px-4 py-4 border-b">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
              Folders
            </h2>
            <RootsManager roots={roots} />
          </div>
        </aside>

        {/* Main — icon grid */}
        <main className="flex-1 flex flex-col overflow-hidden bg-zinc-50">
          <IconGrid images={images} />
        </main>
      </div>
    </div>
  );
}
