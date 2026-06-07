"use client";

import { useState } from "react";
import { getImagesForCollection } from "@/lib/actions";
import { useAutoTagBatch } from "@/components/useAutoTagBatch";
import AutoTagModal from "@/components/AutoTagModal";
import type { AutoTagFilter } from "@/lib/actions";

export default function AllDetails({
  collectionId,
  collectionName,
  totalCount,
}: {
  collectionId: number;
  collectionName: string;
  totalCount: number;
}) {
  const [showModal, setShowModal] = useState(false);
  const { status, progress, summary, start, pause, resume, stop } = useAutoTagBatch();

  const isActive = status !== "idle";

  function handleConfirm(filter: AutoTagFilter) {
    start((f) => getImagesForCollection(collectionId, f), filter);
  }

  const pct = progress
    ? Math.round((progress.done / progress.total) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-4 p-4 border-b border-zinc-200 dark:border-zinc-700">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">
          Collection
        </p>
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 break-words">
          {collectionName}
        </p>
      </div>

      {/* Image count */}
      <div>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          {totalCount.toLocaleString()} images
        </p>
      </div>

      {/* Auto-tag progress */}
      {progress && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-violet-600 dark:text-violet-400 font-medium">
              {status === "paused" ? "Paused" : "Auto-tagging…"}
            </span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              {progress.done} / {progress.total}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-violet-500 dark:bg-violet-400 transition-all duration-200"
              style={{ width: `${pct}%` }}
            />
          </div>
          {progress.errors > 0 && (
            <p className="text-xs text-red-400 mt-1">{progress.errors} errors</p>
          )}
        </div>
      )}
      {summary && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{summary}</p>
      )}

      <div className="border-t border-zinc-200 dark:border-zinc-700" />

      {/* Actions */}
      <div className="flex flex-col gap-0.5">
        {!isActive && (
          <button
            onClick={() => setShowModal(true)}
            disabled={totalCount === 0}
            className="w-full text-left text-xs font-medium px-2 py-2 rounded-lg
                       text-violet-600 hover:bg-violet-50
                       dark:text-violet-400 dark:hover:bg-violet-900/20
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ✦ Auto-tag entire collection
          </button>
        )}

        {status === "running" && (
          <button
            onClick={pause}
            className="w-full text-left text-xs font-medium px-2 py-2 rounded-lg
                       text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20"
          >
            ⏸ Pause
          </button>
        )}
        {status === "paused" && (
          <button
            onClick={resume}
            className="w-full text-left text-xs font-medium px-2 py-2 rounded-lg
                       text-violet-600 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-900/20"
          >
            ▶ Resume
          </button>
        )}
        {isActive && (
          <button
            onClick={stop}
            className="w-full text-left text-xs font-medium px-2 py-2 rounded-lg
                       text-zinc-600 hover:bg-red-50 dark:text-zinc-300 dark:hover:bg-red-900/20"
          >
            ■ Stop
          </button>
        )}
      </div>

      {showModal && (
        <AutoTagModal
          title={`Auto-tag "${collectionName}"`}
          description={`${totalCount.toLocaleString()} images — tags applied automatically without review.`}
          onConfirm={handleConfirm}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
