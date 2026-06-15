"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  removeRoot,
  rescanRoot,
  getImagesForRoot,
  clearTagsForRoot,
  moveRootToCollection,
} from "@/lib/actions";
import { useAutoTagBatch } from "@/components/useAutoTagBatch";
import { tagAndAcceptMeshItem } from "@/lib/three/tagMesh";
import AutoTagModal from "@/components/AutoTagModal";
import MoveRootModal from "@/components/MoveRootModal";
import CollectionPromptPreview from "@/components/CollectionPromptPreview";
import type { AutoTagFilter } from "@/lib/actions";
import type { RootWithCount } from "@/app/page";
import type { CollectionItem } from "@/components/CollectionSwitcher";

export default function FolderDetails({
  root,
  activeCollection,
  collections,
  onEditCollection,
  kind = "image",
}: {
  root: RootWithCount;
  activeCollection: CollectionItem | null;
  collections: CollectionItem[];
  onEditCollection: (collection: CollectionItem) => void;
  kind?: "image" | "mesh";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [scanningId, setScanningId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const { status, progress, summary, start, pause, resume, stop } = useAutoTagBatch();
  const [confirmAction, setConfirmAction] = useState<"remove" | "clear" | null>(null);
  const [copied, setCopied] = useState(false);

  const isTagging = status !== "idle";
  const isMesh = kind === "mesh";
  const noun = isMesh ? "meshes" : "images";
  const showAutoTag = true;

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

  function handleConfirm(filter: AutoTagFilter) {
    start(
      (f) => getImagesForRoot(root.id, f),
      filter,
      isMesh ? tagAndAcceptMeshItem : undefined,
    );
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

  function doMove(targetCollectionId: number) {
    startTransition(async () => {
      await moveRootToCollection(root.id, targetCollectionId);
      const p = new URLSearchParams(searchParams.toString());
      p.set("collection", String(targetCollectionId));
      p.set("root", String(root.id));
      p.delete("tags");
      router.replace("?" + p.toString(), { scroll: false });
    });
  }

  const pct = progress
    ? Math.round((progress.done / progress.total) * 100)
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
          {root.image_count.toLocaleString()} {noun}
        </p>
      </div>

      {/* Active collection's custom prompt preview — click to edit (AI-tagging only) */}
      {showAutoTag && activeCollection?.prompt && (
        <CollectionPromptPreview
          collection={activeCollection}
          onEdit={onEditCollection}
        />
      )}

      {/* Auto-tag progress */}
      {showAutoTag && progress && (
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
      {showAutoTag && summary && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{summary}</p>
      )}

      <div className="border-t border-zinc-200 dark:border-zinc-700" />

      {/* Actions */}
      <div className="flex flex-col gap-0.5">
        {showAutoTag && !isTagging && (
          <button
            onClick={() => setShowModal(true)}
            disabled={pending || root.image_count === 0}
            className="w-full text-left text-xs font-medium px-2 py-2 rounded-lg
                       text-violet-600 hover:bg-violet-50
                       dark:text-violet-400 dark:hover:bg-violet-900/20
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ✦ Auto-tag entire folder
          </button>
        )}

        {showAutoTag && status === "running" && (
          <button
            onClick={pause}
            className="w-full text-left text-xs font-medium px-2 py-2 rounded-lg
                       text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20"
          >
            ⏸ Pause
          </button>
        )}
        {showAutoTag && status === "paused" && (
          <button
            onClick={resume}
            className="w-full text-left text-xs font-medium px-2 py-2 rounded-lg
                       text-violet-600 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-900/20"
          >
            ▶ Resume
          </button>
        )}
        {showAutoTag && isTagging && (
          <button
            onClick={stop}
            className="w-full text-left text-xs font-medium px-2 py-2 rounded-lg
                       text-zinc-600 hover:bg-red-50 dark:text-zinc-300 dark:hover:bg-red-900/20"
          >
            ■ Stop
          </button>
        )}
        {showAutoTag && (
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
        )}
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
          onClick={() => setShowMoveModal(true)}
          disabled={pending || isTagging}
          className="w-full text-left text-xs font-medium px-2 py-2 rounded-lg
                     text-zinc-600 hover:bg-zinc-100
                     dark:text-zinc-300 dark:hover:bg-zinc-800
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ⇄ Move folder
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
            Remove this folder and its {root.image_count.toLocaleString()} {noun} from the
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

      {showModal && (
        <AutoTagModal
          title={`Auto-tag "${root.label}"`}
          description={`${root.image_count.toLocaleString()} ${noun} — tags applied automatically without review.`}
          onConfirm={handleConfirm}
          onClose={() => setShowModal(false)}
          showAngleOptions={isMesh}
        />
      )}

      {showMoveModal && (
        <MoveRootModal
          rootLabel={root.label}
          currentCollectionId={activeCollection?.id ?? null}
          collections={collections}
          onConfirm={doMove}
          onClose={() => setShowMoveModal(false)}
        />
      )}
    </div>
  );
}
