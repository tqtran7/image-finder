"use client";

import { useState } from "react";
import AutoTagOptions, { DEFAULT_AUTOTAG_FILTER } from "@/components/AutoTagOptions";
import type { AutoTagFilter } from "@/lib/actions";

export default function AutoTagModal({
  title,
  description,
  onConfirm,
  onClose,
  showSkipOptions = true,
}: {
  title: string;
  description: string;
  onConfirm: (filter: AutoTagFilter) => void;
  onClose: () => void;
  showSkipOptions?: boolean;
}) {
  const [filter, setFilter] = useState<AutoTagFilter>(DEFAULT_AUTOTAG_FILTER);

  function handleConfirm() {
    onConfirm(filter);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700
                      rounded-xl shadow-2xl p-5 w-80 flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{title}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{description}</p>
        </div>

        <div className="border-t border-zinc-200 dark:border-zinc-700" />

        <AutoTagOptions value={filter} onChange={setFilter} showSkipOptions={showSkipOptions} />

        <div className="border-t border-zinc-200 dark:border-zinc-700" />

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 text-xs px-3 py-2 rounded-lg border border-zinc-200
                       dark:border-zinc-700 text-zinc-600 dark:text-zinc-400
                       hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 text-xs px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-700
                       text-white font-medium"
          >
            ✦ Start
          </button>
        </div>
      </div>
    </div>
  );
}
