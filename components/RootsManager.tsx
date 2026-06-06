"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FolderPicker from "@/components/FolderPicker";
import { removeRoot, rescanRoot, autoTagRoot } from "@/lib/actions";
import type { RootWithCount } from "@/app/page";

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

  function handleFolderClick(rootId: number) {
    const p = new URLSearchParams(searchParams.toString());
    if (activeRootId === rootId) {
      p.delete("root");
    } else {
      p.set("root", String(rootId));
    }
    router.replace("?" + p.toString(), { scroll: false });
  }
  const [scanningId, setScanningId] = useState<number | null>(null);
  const [taggingId, setTaggingId] = useState<number | null>(null);
  const [tagResult, setTagResult] = useState<string | null>(null);

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

  function handleAutoTag(root: RootWithCount) {
    if (
      !confirm(
        `Auto-tag all ${root.image_count.toLocaleString()} images in "${root.label}"? ` +
          `Tags will be applied automatically (no review). This makes one AI call per image.`,
      )
    )
      return;
    setTaggingId(root.id);
    setTagResult(null);
    startTransition(async () => {
      try {
        const res = await autoTagRoot(root.id);
        const parts = [`${res.tagged}/${res.total} tagged`];
        if (res.errors.length) parts.push(`${res.errors.length} errors`);
        setTagResult(`"${root.label}": ${parts.join(", ")}`);
      } catch (e) {
        setTagResult(`"${root.label}": ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setTaggingId(null);
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
            <li key={root.id}>
              {/* Info box — click to filter grid to this folder */}
              <div
                onClick={() => handleFolderClick(root.id)}
                className={`rounded-lg border px-3 py-2 flex items-start justify-between gap-2
                            cursor-pointer transition-colors
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
                {/* Remove only */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemove(root.id); }}
                  disabled={pending}
                  title="Remove folder"
                  className="text-xs text-red-400 hover:text-red-500
                             disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  ✕
                </button>
              </div>

              {/* Action row below the box */}
              <div className="flex items-center gap-3 mt-1.5 px-0.5">
                <button
                  onClick={() => handleAutoTag(root)}
                  disabled={pending || root.image_count === 0}
                  title="Auto-tag all images in this folder (auto-accepts)"
                  className="inline-flex items-center gap-1 text-xs font-medium
                             text-violet-500 hover:text-violet-600
                             dark:text-violet-400 dark:hover:text-violet-300
                             disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {taggingId === root.id ? "Tagging…" : "✦ Auto-tag"}
                </button>
                <button
                  onClick={() => handleRescan(root.id)}
                  disabled={pending}
                  title="Rescan folder"
                  className="inline-flex items-center gap-1 text-xs font-medium
                             text-zinc-400 hover:text-zinc-700
                             dark:text-zinc-500 dark:hover:text-zinc-300
                             disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {scanningId === root.id ? "Scanning…" : "↻ Rescan"}
                </button>
                {taggingId === root.id && (
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 ml-auto">
                    {root.image_count.toLocaleString()} images
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {tagResult && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3 break-words">
          {tagResult}
        </p>
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

      {pickerOpen && (
        <FolderPicker
          collectionId={activeCollectionId}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
