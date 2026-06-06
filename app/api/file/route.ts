import { NextRequest } from "next/server";
import { createReadStream, statSync } from "node:fs";
import path from "node:path";
import { getDb } from "@/lib/db";
import { assertInsideRoot } from "@/lib/paths";
import { Readable } from "node:stream";

const MIME: Record<string, string> = {
  svg:  "image/svg+xml",
  png:  "image/png",
  jpg:  "image/jpeg",
  jpeg: "image/jpeg",
  gif:  "image/gif",
  webp: "image/webp",
  ico:  "image/x-icon",
  bmp:  "image/bmp",
  avif: "image/avif",
};

export async function GET(req: NextRequest) {
  const idParam = req.nextUrl.searchParams.get("id");
  const id = idParam ? parseInt(idParam, 10) : NaN;

  if (isNaN(id)) {
    return new Response("Missing or invalid id", { status: 400 });
  }

  const db = getDb();
  const row = db
    .prepare("SELECT abs_path, ext, mtime FROM images WHERE id = ? AND missing_at IS NULL")
    .get(id) as { abs_path: string; ext: string; mtime: number } | undefined;

  if (!row) {
    return new Response("Not found", { status: 404 });
  }

  // Security: reject paths outside any registered root
  try {
    assertInsideRoot(row.abs_path);
  } catch {
    return new Response("Forbidden", { status: 403 });
  }

  // Verify the file still exists on disk
  let fileSize: number;
  try {
    fileSize = statSync(row.abs_path).size;
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const mime = MIME[row.ext.toLowerCase()] ?? "application/octet-stream";
  const absPath = path.resolve(row.abs_path);

  // Stream the file so large rasters don't buffer entirely in memory
  const nodeStream = createReadStream(absPath);
  const webStream = Readable.toWeb(nodeStream) as ReadableStream;

  return new Response(webStream, {
    headers: {
      "Content-Type": mime,
      "Content-Length": String(fileSize),
      // Cache keyed on id+mtime — safe to cache until the file changes
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
