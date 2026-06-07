"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FolderPicker from "@/components/FolderPicker";
import { removeRoot, rescanRoot, getImagesForRoot, autoTagAndAcceptImage, clearTagsForRoot } from "@/lib/actions";
import type { RootWithCount } from "@/app/page";

interface TagProgress {
  rootId: number;
  done: number;
  total: number;
  errors: number;
}

export default function RootsManager({
  roots,
  activeCollectionId,
}: {
  roots: RootWithCount[];
  activeCollectionId: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeRootId = searchParams.get("root") ? Number(searchParams.get("root")) : null;

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [scanningId, setScanningId] = useState<number | null>(null);
  const [tagProgress, setTagProgress] = useState<TagProgress | null>(null);
  const [tagSummary, setTagSummary] = useState<string | null>(null);
  const [clearConfirmId, setClearConfirmId] = useState<number | null>(null);
  const [removeConfirmId, setRemoveConfirmId] = useState<number | null>(null);

  const isTagging = tagProgress !== null;

  function handleFolderClick(rootId: number) {
    const p = new URLSearchParams(searchParams.toString());
    if (activeRootId === rootId) {
      p.delete("root");
    } else {
      p.set("root", String(rootId));
    }
    router.replace("?" + p.toString(), { scroll: false });
  }

  function handleRemove(id: number) {
    setRemoveConfirmId(id);
  }

  function confirmRemove(id: number) {
    setRemoveConfirmId(null);
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

  function handleClearTags(root: RootWithCount) {
    setClearConfirmId(root.id);
  }

  function confirmClearTags(root: RootWithCount) {
    setClearConfirmId(null);
    startTransition(async () => {
      await clearTagsForRoot(root.id);
      router.refresh();
    });
  }

  async function handleAutoTag(root: RootWithCount) {
    if (
      !confirm(
        `Auto-tag all ${root.image_count.toLocaleString()} images in "${root.label}"?\n` +
          `Tags will be applied automatically without review.`,
      )
    )
      return;

    setTagSummary(null);

    const images = await getImagesForRoot(root.id);
    if (images.length === 0) {
      setTagSummary(`"${root.label}": no images to tag`);
      return;
    }

    setTagProgress({ rootId: root.id, done: 0, total: images.length, errors: 0 });

    let tagged = 0;
    let errors = 0;

    for (const img of images) {
      const result = await autoTagAndAcceptImage(img.id);
      if (result.tagged) tagged++;
      if (result.error) errors++;
      setTagProgress((prev) =>
        prev ? { ...prev, done: prev.done + 1, errors } : null,
      );
    }

    setTagProgress(null);
    router.refresh();

    const parts = [`${tagged}/${images.length} tagged`];
    if (errors > 0) parts.push(`${errors} errors`);
    setTagSummary(`"${root.label}": ${parts.join(", ")}`);
  }

  return (
    <div>
      {roots.length === 0 ? (
        <p className="text-xs text-zinc-400 dark:text-zinc-500 py-2">
          No folders added yet.
        </p>
      ) : (
        <ul className="space-y-2 mb-4">
          {roots.map((root) => {
            const progress = tagProgress?.rootId === root.id ? tagProgress : null;
            const pct = progress ? Math.round((progress.done / progress.total) * 100) : 0;

            return (
              <li key={root.id}>
                {/* Info box — click to filter grid to this folder */}
                <div
                  onClick={() => !isTagging && handleFolderClick(root.id)}
                  className={`rounded-lg border px-3 py-2 flex items-start justify-between gap-2
                              transition-colors
                              ${isTagging ? "cursor-default" : "cursor-pointer"}
                              ${activeRootId === root.id
                                ? "border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                : "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-600"
                              }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className={`text-xs font-medium truncate
                                     ${activeRootId === root.id
                                       ? "text-blue-700 dark:text-blue-300"
                                       : "text-zinc-800 dark:text-zinc-200"}`}>
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
                  <button
                    onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(root.path); }}
                    title="Copy path"
                    className="text-xs text-zinc-400 hover:text-zinc-600
                               dark:text-zinc-500 dark:hover:text-zinc-300 shrink-0"
                  >
                    ⎘
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemove(root.id); }}
                    disabled={pending || isTagging}
                    title="Remove folder"
                    className="text-xs text-red-400 hover:text-red-500
                               disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  >
                    ✕
                  </button>
                </div>

                {/* Progress bar — shown while this folder is being tagged */}
                {progress && (
                  <div className="mt-1.5 px-0.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-violet-600 dark:text-violet-400 font-medium">
                        Auto-tagging…
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

                {/* Action row — hidden while this folder is being tagged */}
                {!progress && (
                  <div className="flex items-center gap-3 mt-1.5 px-0.5">
                    <button
                      onClick={() => handleAutoTag(root)}
                      disabled={pending || isTagging || root.image_count === 0}
                      title="Auto-tag all images in this folder"
                      className="inline-flex items-center gap-1 text-xs font-medium
                                 text-violet-500 hover:text-violet-600
                                 dark:text-violet-400 dark:hover:text-violet-300
                                 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      ✦ Auto-tag
                    </button>
                    <button
                      onClick={() => handleRescan(root.id)}
                      disabled={pending || isTagging}
                      title="Rescan folder"
                      className="inline-flex items-center gap-1 text-xs font-medium
                                 text-zinc-400 hover:text-zinc-700
                                 dark:text-zinc-500 dark:hover:text-zinc-300
                                 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {scanningId === root.id ? "Scanning…" : "↻ Rescan"}
                    </button>
                    <button
                      onClick={() => handleClearTags(root)}
                      disabled={pending || isTagging}
                      title="Clear AI-generated tags in this folder (manual tags are kept)"
                      className="inline-flex items-center gap-1 text-xs font-medium
                                 text-zinc-400 hover:text-zinc-700
                                 dark:text-zinc-500 dark:hover:text-zinc-300
                                 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      ✕ Clear AI tags
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {tagSummary && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3 break-words">
          {tagSummary}
        </p>
      )}

      <button
        onClick={() => setPickerOpen(true)}
        disabled={isTagging}
        className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg
                   border border-dashed border-zinc-300 dark:border-zinc-600
                   px-3 py-2 text-xs font-medium
                   text-zinc-500 dark:text-zinc-400
                   hover:border-zinc-400 dark:hover:border-zinc-500
                   hover:text-zinc-700 dark:hover:text-zinc-300
                   disabled:opacity-40 disabled:cursor-not-allowed
                   transition-colors"
      >
        + Add folder
      </button>

      {pickerOpen && (
        <FolderPicker
          collectionId={activeCollectionId}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {removeConfirmId !== null && (() => {
        const root = roots.find((r) => r.id === removeConfirmId);
        if (!root) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 p-6 max-w-sm w-full mx-4">
              <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 mb-2">
                Remove folder?
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5 leading-relaxed">
                This will remove{" "}
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  &quot;{root.label}&quot;
                </span>{" "}
                and its {root.image_count.toLocaleString()} images from the collection. The files on disk will not be deleted.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setRemoveConfirmId(null)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700
                             text-zinc-600 dark:text-zinc-400
                             hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => confirmRemove(root.id)}
                  className="text-xs px-3 py-1.5 rounded-lg
                             bg-red-500 hover:bg-red-600 text-white font-medium"
                >
                  Remove folder
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {clearConfirmId !== null && (() => {
        const root = roots.find((r) => r.id === clearConfirmId);
        if (!root) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 p-6 max-w-sm w-full mx-4">
              <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 mb-2">
                Clear AI-generated tags?
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5 leading-relaxed">
                This will remove all AI-generated tags from every image in{" "}
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  &quot;{root.label}&quot;
                </span>{" "}
                ({root.image_count.toLocaleString()} images). Manually-added tags are kept. This cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setClearConfirmId(null)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700
                             text-zinc-600 dark:text-zinc-400
                             hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => confirmClearTags(root)}
                  className="text-xs px-3 py-1.5 rounded-lg
                             bg-red-500 hover:bg-red-600 text-white font-medium"
                >
                  Clear AI tags
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
