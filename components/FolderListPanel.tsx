"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FolderPicker from "@/components/FolderPicker";
import type { RootWithCount } from "@/app/page";

export default function FolderListPanel({
  roots,
  activeCollectionId,
  totalCount,
  totalTaggedCount,
}: {
  roots: RootWithCount[];
  activeCollectionId: number;
  totalCount: number;
  totalTaggedCount: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeRootId = searchParams.get("root") ? Number(searchParams.get("root")) : null;
  const [pickerOpen, setPickerOpen] = useState(false);

  function handleAllClick() {
    const p = new URLSearchParams(searchParams.toString());
    p.delete("root");
    router.replace("?" + p.toString(), { scroll: false });
  }

  function handleFolderClick(rootId: number) {
    if (activeRootId === rootId) return;
    const p = new URLSearchParams(searchParams.toString());
    p.set("root", String(rootId));
    router.replace("?" + p.toString(), { scroll: false });
  }

  const isAll = activeRootId === null;

  return (
    <div>
      <ul className="space-y-1 mb-4">
        {/* "All" virtual folder */}
        <li>
          <div
            onClick={handleAllClick}
            className={`rounded-lg border px-3 py-1.5 flex items-center gap-2
                        cursor-pointer transition-colors
                        ${
                          isAll
                            ? "border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                            : "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-600"
                        }`}
          >
            <p
              className={`text-xs font-medium truncate min-w-0 flex-1 ${
                isAll ? "text-blue-700 dark:text-blue-300" : "text-zinc-800 dark:text-zinc-200"
              }`}
            >
              All
            </p>
            <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full">
              {totalTaggedCount.toLocaleString()}/{totalCount.toLocaleString()}
            </span>
          </div>
        </li>

        {roots.map((root) => (
          <li key={root.id}>
            <div
              onClick={() => handleFolderClick(root.id)}
              className={`rounded-lg border px-3 py-1.5 flex items-center gap-2
                          cursor-pointer transition-colors
                          ${
                            activeRootId === root.id
                              ? "border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                              : "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-600"
                          }`}
            >
              <p
                className={`text-xs font-medium truncate min-w-0 flex-1 ${
                  activeRootId === root.id
                    ? "text-blue-700 dark:text-blue-300"
                    : "text-zinc-800 dark:text-zinc-200"
                }`}
              >
                {root.label}
              </p>
              <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full">
                {root.tagged_count.toLocaleString()}/{root.image_count.toLocaleString()}
              </span>
            </div>
          </li>
        ))}
      </ul>

      {roots.length === 0 && (
        <p className="text-xs text-zinc-400 dark:text-zinc-500 pb-2">
          No folders added yet.
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
