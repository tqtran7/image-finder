"use client";

import { useTransition } from "react";
import TagEditor from "@/components/TagEditor";
import { removeTag } from "@/lib/actions";
import type { ImageItem } from "@/components/IconCard";

interface SelectionToolbarProps {
  selectedIds: Set<number>;
  images: ImageItem[];
  vocabulary: string[];
  onClearSelection: () => void;
}

export default function SelectionToolbar({
  selectedIds,
  images,
  vocabulary,
  onClearSelection,
}: SelectionToolbarProps) {
  const [isPending, startTransition] = useTransition();

  const selectedList = images.filter((img) => selectedIds.has(img.id));
  const count = selectedList.length;

  const commonTags =
    count === 0
      ? []
      : selectedList[0].tags.filter((tag) =>
          selectedList.every((img) => img.tags.includes(tag)),
        );

  function handleRemoveCommonTag(tagName: string) {
    startTransition(async () => {
      await Promise.all(
        Array.from(selectedIds).map((id) => removeTag(id, tagName)),
      );
    });
  }

  return (
    <div className="border-b border-zinc-200 dark:border-zinc-700 px-4 py-4">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
          {count} selected
        </span>
        <button
          onClick={onClearSelection}
          className="text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          Clear
        </button>
      </div>

      {/* Tag editor */}
      <TagEditor
        selectedIds={Array.from(selectedIds)}
        commonTags={commonTags}
        vocabulary={vocabulary}
        onRemoveCommonTag={handleRemoveCommonTag}
      />

      {isPending && (
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">
          Saving…
        </p>
      )}
    </div>
  );
}
