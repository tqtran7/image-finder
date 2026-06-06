"use client";

import { useState, useTransition } from "react";
import FolderPicker from "@/components/FolderPicker";
import { removeRoot, rescanRoot } from "@/lib/actions";
import type { RootWithCount } from "@/app/page";

export default function RootsManager({ roots }: { roots: RootWithCount[] }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [scanningId, setScanningId] = useState<number | null>(null);

  function handleRemove(id: number) {
    startTransition(async () => {
      await removeRoot(id);
    });
  }

  function handleRescan(id: number) {
    setScanningId(id);
    startTransition(async () => {
      try {
        await rescanRoot(id);
      } finally {
        setScanningId(null);
      }
    });
  }

  return (
    <div>
      {roots.length === 0 ? (
        <p className="text-xs text-zinc-400 dark:text-zinc-500 py-2">
          No folders added yet.
        </p>
      ) : (
        <ul className="space-y-2 mb-4">
          {roots.map((root) => (
            <li
              key={root.id}
              className="rounded-lg border border-zinc-200 dark:border-zinc-700
                         bg-zinc-50 dark:bg-zinc-900 px-3 py-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">
                      {root.label}
                    </p>
                    <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full">
                      {root.image_count.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 dark:text-zinc-600 font-mono truncate mt-0.5">
                    {root.path}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleRescan(root.id)}
                    disabled={pending}
                    className="text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300
                               disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {scanningId === root.id ? "…" : "↻"}
                  </button>
                  <button
                    onClick={() => handleRemove(root.id)}
                    disabled={pending}
                    className="text-xs text-red-400 hover:text-red-500
                               disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() => setPickerOpen(true)}
        className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg
                   border border-dashed border-zinc-300 dark:border-zinc-600
                   px-3 py-2 text-xs font-medium
                   text-zinc-500 dark:text-zinc-400
                   hover:border-zinc-400 dark:hover:border-zinc-500
                   hover:text-zinc-700 dark:hover:text-zinc-300
                   transition-colors"
      >
        + Add folder
      </button>

      {pickerOpen && <FolderPicker onClose={() => setPickerOpen(false)} />}
    </div>
  );
}
