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
        <p className="text-sm text-zinc-400 py-4">
          No folders added yet. Click &ldquo;Add folder&rdquo; to get started.
        </p>
      ) : (
        <ul className="space-y-2 mb-4">
          {roots.map((root) => (
            <li
              key={root.id}
              className="flex items-center justify-between rounded-lg border border-zinc-200
                         bg-white px-4 py-3 gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-zinc-800 truncate">
                    {root.label}
                  </p>
                  <span className="shrink-0 text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
                    {root.image_count.toLocaleString()} images
                  </span>
                </div>
                <p className="text-xs text-zinc-400 font-mono truncate mt-0.5">
                  {root.path}
                </p>
                {root.last_scanned_at && (
                  <p className="text-xs text-zinc-300 mt-0.5">
                    Last scanned{" "}
                    {new Date(root.last_scanned_at).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleRescan(root.id)}
                  disabled={pending}
                  className="text-xs text-zinc-500 hover:text-zinc-800
                             disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {scanningId === root.id ? "Scanning…" : "Rescan"}
                </button>
                <button
                  onClick={() => handleRemove(root.id)}
                  disabled={pending}
                  className="text-xs text-red-400 hover:text-red-600
                             disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() => setPickerOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2
                   text-sm font-medium text-white hover:bg-zinc-700"
      >
        + Add folder
      </button>

      {pickerOpen && <FolderPicker onClose={() => setPickerOpen(false)} />}
    </div>
  );
}
