"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  removeRoot,
  rescanRoot,
  getImagesForRoot,
  autoTagAndAcceptImage,
  clearTagsForRoot,
} from "@/lib/actions";
import type { RootWithCount } from "@/app/page";

interface TagProgress {
  done: number;
  total: number;
  errors: number;
}

export default function FolderDetails({ root }: { root: RootWithCount }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [scanningId, setScanningId] = useState<number | null>(null);
  const [tagProgress, setTagProgress] = useState<TagProgress | null>(null);
  const [tagSummary, setTagSummary] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<"remove" | "clear" | null>(null);
  const [copied, setCopied] = useState(false);

  const isTagging = tagProgress !== null;

  function handleCopyPath() {
    navigator.clipboard.writeText(root.path);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleRescan() {
    setScanningId(root.id);
    startTransition(async () => {
      try {
        await rescanRoot(root.id);
      } finally {
        setScanningId(null);
      }
    });
  }

  async function handleAutoTag() {
    if (
      !window.confirm(
        `Auto-tag all ${root.image_count.toLocaleString()} images in "${root.label}"?\n` +
          `Tags will be applied automatically without review.`,
      )
    )
      return;

    setTagSummary(null);
    const imgs = await getImagesForRoot(root.id);
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

  function doClearTags() {
    setConfirmAction(null);
    startTransition(async () => {
      await clearTagsForRoot(root.id);
      router.refresh();
    });
  }

  function doRemove() {
    setConfirmAction(null);
    startTransition(async () => {
      await removeRoot(root.id);
    });
  }

  const pct = tagProgress
    ? Math.round((tagProgress.done / tagProgress.total) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-4 p-4 border-b border-zinc-200 dark:border-zinc-700">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">
          Folder
        </p>
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 break-words">
          {root.label}
        </p>
      </div>

      {/* Path + image count */}
      <div>
        <div className="flex items-start gap-2">
          <p className="text-xs text-zinc-400 dark:text-zinc-500 font-mono break-all flex-1 min-w-0 leading-relaxed">
            {root.path}
          </p>
          <button
            onClick={handleCopyPath}
            title="Copy path"
            className="text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 shrink-0 mt-0.5"
          >
            {copied ? "✓" : "⎘"}
          </button>
        </div>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
          {root.image_count.toLocaleString()} images
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
          disabled={pending || isTagging || root.image_count === 0}
          className="w-full text-left text-xs font-medium px-2 py-2 rounded-lg
                     text-violet-600 hover:bg-violet-50
                     dark:text-violet-400 dark:hover:bg-violet-900/20
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ✦ Auto-tag entire folder
        </button>
        <button
          onClick={() => setConfirmAction("clear")}
          disabled={pending || isTagging}
          className="w-full text-left text-xs font-medium px-2 py-2 rounded-lg
                     text-zinc-600 hover:bg-zinc-100
                     dark:text-zinc-300 dark:hover:bg-zinc-800
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ✕ Clear auto-tags in folder
        </button>
        <button
          onClick={handleRescan}
          disabled={pending || isTagging}
          className="w-full text-left text-xs font-medium px-2 py-2 rounded-lg
                     text-zinc-600 hover:bg-zinc-100
                     dark:text-zinc-300 dark:hover:bg-zinc-800
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {scanningId === root.id ? "Scanning…" : "↻ Rescan folder"}
        </button>
        <button
          onClick={() => setConfirmAction("remove")}
          disabled={pending || isTagging}
          className="w-full text-left text-xs font-medium px-2 py-2 rounded-lg
                     text-zinc-600 hover:bg-red-50
                     dark:text-zinc-300 dark:hover:bg-red-900/20
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ✕ Remove folder
        </button>
      </div>

      {/* Inline confirmations */}
      {confirmAction === "clear" && (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 p-3">
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3 leading-relaxed">
            Remove all AI-generated tags from every image in this folder? Manually-added
            tags will be kept.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmAction(null)}
              className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700
                         text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              onClick={doClearTags}
              className="flex-1 text-xs px-2 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium"
            >
              Clear AI tags
            </button>
          </div>
        </div>
      )}

      {confirmAction === "remove" && (
        <div className="rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 p-3">
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3 leading-relaxed">
            Remove this folder and its {root.image_count.toLocaleString()} images from the
            collection? Files on disk will not be deleted.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmAction(null)}
              className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700
                         text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              onClick={doRemove}
              className="flex-1 text-xs px-2 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium"
            >
              Remove folder
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
