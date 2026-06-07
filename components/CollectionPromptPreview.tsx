"use client";

import type { CollectionItem } from "@/components/CollectionSwitcher";

export default function CollectionPromptPreview({
  collection,
  onEdit,
}: {
  collection: CollectionItem | null;
  onEdit: (collection: CollectionItem) => void;
}) {
  if (!collection?.prompt) return null;

  return (
    <button
      type="button"
      onClick={() => onEdit(collection)}
      className="px-0.5 text-left w-full group"
    >
      <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-relaxed line-clamp-3
                    group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
        <span className="font-semibold text-zinc-500 dark:text-zinc-400
                         group-hover:text-zinc-700 dark:group-hover:text-zinc-200">Prompt:</span>{" "}
        {collection.prompt}
      </p>
    </button>
  );
}
