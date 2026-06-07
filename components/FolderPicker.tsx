"use client";

import { useState, useEffect, useTransition } from "react";
import { addRoot } from "@/lib/actions";

interface FsEntry {
  name: string;
  path: string;
  isDir: boolean;
}

interface FolderPickerProps {
  collectionId: number;
  onClose: () => void;
}

export default function FolderPicker({ collectionId, onClose }: FolderPickerProps) {
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [pathInput, setPathInput] = useState("");
  const [entries, setEntries] = useState<FsEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function navigate(p: string | null) {
    setLoading(true);
    setError(null);
    try {
      const url = p ? `/api/fs?path=${encodeURIComponent(p)}` : "/api/fs";
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to list directory");
      setCurrentPath(p);
      setPathInput(p ?? "");
      setEntries(data.entries ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function goUp() {
    if (!currentPath) return;
    const parent = currentPath.replace(/[\\/][^\\/]+[\\/]?$/, "");
    if (!parent || parent === currentPath) navigate(null);
    else navigate(parent);
  }

  function commitPathInput() {
    const trimmed = pathInput.trim();
    if (trimmed) navigate(trimmed);
    else navigate(null);
  }

  function handleAdd() {
    const target = pathInput.trim() || currentPath;
    if (!target) return;
    startTransition(async () => {
      try {
        await addRoot(target, collectionId);
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  useEffect(() => {
    navigate(null);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-2xl w-[520px] max-h-[600px] flex flex-col overflow-hidden border border-zinc-200 dark:border-zinc-700">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">
            Select a folder
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Path input */}
        <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700">
          {currentPath && (
            <button
              onClick={goUp}
              title="Go up"
              className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 font-mono shrink-0"
            >
              ← up
            </button>
          )}
          <input
            type="text"
            value={pathInput}
            onChange={(e) => setPathInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitPathInput();
              else if (e.key === "Escape") setPathInput(currentPath ?? "");
            }}
            onBlur={commitPathInput}
            placeholder="Paste or type a path…"
            className="flex-1 min-w-0 text-xs font-mono rounded-md px-2 py-1
                       bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600
                       text-zinc-800 dark:text-zinc-200 placeholder-zinc-400
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Directory listing */}
        <div className="flex-1 overflow-y-auto px-2 py-1">
          {loading ? (
            <p className="text-sm text-zinc-400 dark:text-zinc-500 text-center py-8">
              Loading…
            </p>
          ) : error ? (
            <p className="text-sm text-red-500 px-3 py-4">{error}</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-zinc-400 dark:text-zinc-500 text-center py-8">
              No subfolders found
            </p>
          ) : (
            entries.map((entry) => (
              <button
                key={entry.path}
                onClick={() => navigate(entry.path)}
                className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg
                           hover:bg-zinc-100 dark:hover:bg-zinc-700
                           text-sm text-zinc-700 dark:text-zinc-300 font-mono"
              >
                <span className="text-zinc-400 shrink-0">📁</span>
                <span className="truncate">{entry.name}</span>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900">
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {currentPath
              ? "Navigate into a folder, or use this one"
              : "Pick a drive to start"}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-sm text-zinc-600 dark:text-zinc-400
                         hover:bg-zinc-200 dark:hover:bg-zinc-700"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={(!currentPath && !pathInput.trim()) || isPending}
              className="px-4 py-1.5 rounded-lg text-sm bg-zinc-900 dark:bg-zinc-100
                         text-white dark:text-zinc-900
                         hover:bg-zinc-700 dark:hover:bg-white
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isPending ? "Adding…" : "Use this folder"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
