import path from "node:path";
import { getDb } from "@/lib/db";

/** Normalize to an absolute path with consistent separators. */
export function normalizePath(p: string): string {
  return path.resolve(p);
}

/**
 * Returns all registered root paths from the DB.
 * Used to guard every disk-reading endpoint.
 */
export function registeredRoots(): string[] {
  const db = getDb();
  return (db.prepare("SELECT path FROM roots").all() as { path: string }[]).map(
    (r) => r.path,
  );
}

/**
 * Throws if `absPath` is not inside any registered root.
 * Protects against path traversal and reading arbitrary files.
 */
export function assertInsideRoot(absPath: string): void {
  const norm = normalizePath(absPath);
  const roots = registeredRoots();
  const ok = roots.some((r) => norm.startsWith(r + path.sep) || norm === r);
  if (!ok) {
    throw new Error(`Path is outside all registered roots: ${norm}`);
  }
}

/** True if `absPath` is inside any registered root. */
export function isInsideRoot(absPath: string): boolean {
  try {
    assertInsideRoot(absPath);
    return true;
  } catch {
    return false;
  }
}
