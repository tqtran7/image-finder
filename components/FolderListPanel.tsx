"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FolderPicker from "@/components/FolderPicker";
import type { RootWithCount } from "@/app/page";

export default function FolderListPanel({
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

  function handleFolderClick(rootId: number) {
    const p = new URLSearchParams(searchParams.toString());
    if (activeRootId === rootId) {
      p.delete("root");
    } else {
      p.set("root", String(rootId));
    }
    router.replace("?" + p.toString(), { scroll: false });
  }

  return (
    <div>
      {roots.length === 0 ? (
        <p className="text-xs text-zinc-400 dark:text-zinc-500 py-2">
          No folders added yet.
        </p>
      ) : (
        <ul className="space-y-1 mb-4">
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
                  {root.image_count.toLocaleString()}
                </span>
              </div>
            </li>
          ))}
        </ul>
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
