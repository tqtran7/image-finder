import { NextRequest } from "next/server";
import { readdirSync, statSync } from "node:fs";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const execAsync = promisify(exec);

export async function GET(req: NextRequest) {
  const rawPath = req.nextUrl.searchParams.get("path");

  try {
    if (!rawPath) {
      // No path → return drive roots on Windows, "/" on other platforms
      const entries = await getRoots();
      return Response.json({ entries });
    }

    const dir = path.resolve(rawPath);
    const entries = listSubdirs(dir);
    return Response.json({ path: dir, entries });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 400 });
  }
}

// ── helpers ────────────────────────────────────────────────────────────────

interface FsEntry {
  name: string;
  path: string;
  isDir: boolean;
}

/** List immediate subdirectories of a directory. */
function listSubdirs(dir: string): FsEntry[] {
  const names = readdirSync(dir, { withFileTypes: false }) as string[];
  const entries: FsEntry[] = [];

  for (const name of names) {
    const full = path.join(dir, name);
    try {
      const st = statSync(full);
      if (st.isDirectory()) {
        entries.push({ name, path: full, isDir: true });
      }
    } catch {
      // skip inaccessible entries
    }
  }

  return entries.sort((a, b) => a.name.localeCompare(b.name));
}

/** Return drive roots on Windows, ["/"] on POSIX. */
async function getRoots(): Promise<FsEntry[]> {
  if (process.platform === "win32") {
    return getWindowsDrives();
  }
  return [{ name: "/", path: "/", isDir: true }];
}

async function getWindowsDrives(): Promise<FsEntry[]> {
  try {
    const { stdout } = await execAsync(
      "wmic logicaldisk get DeviceID /format:csv",
    );
    const drives: FsEntry[] = [];
    for (const line of stdout.split(/\r?\n/)) {
      const match = line.trim().match(/([A-Z]:)$/i);
      if (match) {
        const letter = match[1].toUpperCase();
        drives.push({ name: letter + "\\", path: letter + "\\", isDir: true });
      }
    }
    return drives.sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    // fallback: probe A–Z
    const drives: FsEntry[] = [];
    for (let i = 65; i <= 90; i++) {
      const letter = String.fromCharCode(i) + ":\\";
      try {
        statSync(letter);
        drives.push({ name: letter, path: letter, isDir: true });
      } catch {
        // drive not present
      }
    }
    return drives;
  }
}
