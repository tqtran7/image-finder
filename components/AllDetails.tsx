"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getImagesForCollection, autoTagAndAcceptImage } from "@/lib/actions";

interface TagProgress {
  done: number;
  total: number;
  errors: number;
}

export default function AllDetails({
  collectionId,
  collectionName,
  totalCount,
}: {
  collectionId: number;
  collectionName: string;
  totalCount: number;
}) {
  const router = useRouter();
  const [tagProgress, setTagProgress] = useState<TagProgress | null>(null);
  const [tagSummary, setTagSummary] = useState<string | null>(null);

  const isTagging = tagProgress !== null;

  async function handleAutoTag() {
    if (
      !window.confirm(
        `Auto-tag all ${totalCount.toLocaleString()} images in "${collectionName}"?\n` +
          `Tags will be applied automatically without review.`,
      )
    )
      return;

    setTagSummary(null);
    const imgs = await getImagesForCollection(collectionId);
    if (imgs.length === 0) {
      setTagSummary("No images to tag");
      return;
    }

    setTagProgress({ done: 0, total: imgs.length, errors: 0 });
    let tagged = 0;
    let errors = 0;

    for (const img of imgs) {
      const result = await autoTagAndAcceptImage(img.id);
      if (result.tagged) tagged++;
      if (result.error) errors++;
      setTagProgress((prev) => (prev ? { ...prev, done: prev.done + 1, errors } : null));
    }

    setTagProgress(null);
    router.refresh();

    const parts = [`${tagged}/${imgs.length} tagged`];
    if (errors > 0) parts.push(`${errors} errors`);
    setTagSummary(parts.join(", "));
  }

  const pct = tagProgress
    ? Math.round((tagProgress.done / tagProgress.total) * 100)
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
      {tagProgress && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-violet-600 dark:text-violet-400 font-medium">
              Auto-tagging…
            </span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              {tagProgress.done} / {tagProgress.total}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-violet-500 dark:bg-violet-400 transition-all duration-200"
              style={{ width: `${pct}%` }}
            />
          </div>
          {tagProgress.errors > 0 && (
            <p className="text-xs text-red-400 mt-1">{tagProgress.errors} errors</p>
          )}
        </div>
      )}
      {tagSummary && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{tagSummary}</p>
      )}

      <div className="border-t border-zinc-200 dark:border-zinc-700" />

      {/* Actions */}
      <div className="flex flex-col gap-0.5">
        <button
          onClick={handleAutoTag}
          disabled={isTagging || totalCount === 0}
          className="w-full text-left text-xs font-medium px-2 py-2 rounded-lg
                     text-violet-600 hover:bg-violet-50
                     dark:text-violet-400 dark:hover:bg-violet-900/20
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ✦ Auto-tag entire collection
        </button>
      </div>
    </div>
  );
}
