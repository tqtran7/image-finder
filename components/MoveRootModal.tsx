"use client";

import { useState } from "react";
import type { CollectionItem } from "@/components/CollectionSwitcher";

export default function MoveRootModal({
  rootLabel,
  currentCollectionId,
  collections,
  onConfirm,
  onClose,
}: {
  rootLabel: string;
  currentCollectionId: number | null;
  collections: CollectionItem[];
  onConfirm: (targetCollectionId: number) => void;
  onClose: () => void;
}) {
  const targets = collections.filter((c) => c.id !== currentCollectionId);
  const [targetId, setTargetId] = useState<number | null>(targets[0]?.id ?? null);

  function handleConfirm() {
    if (targetId === null) return;
    onConfirm(targetId);
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
          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            Move &ldquo;{rootLabel}&rdquo;
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Reassign this folder to another collection. Its images and tags are kept.
          </p>
        </div>

        <div className="border-t border-zinc-200 dark:border-zinc-700" />

        {targets.length === 0 ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            There are no other collections to move this folder to.
          </p>
        ) : (
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Destination collection
            </span>
            <select
              value={targetId ?? ""}
              onChange={(e) => setTargetId(Number(e.target.value))}
              className="text-xs rounded-lg border border-zinc-200 dark:border-zinc-700
                         bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200
                         px-2 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {targets.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}

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
            disabled={targetId === null}
            className="flex-1 text-xs px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-700
                       text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ⇄ Move folder
          </button>
        </div>
      </div>
    </div>
  );
}
