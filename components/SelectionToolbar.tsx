"use client";

import { useTransition } from "react";
import TagEditor from "@/components/TagEditor";
import { removeTag, autoTagImages, clearGeneratedTags } from "@/lib/actions";
import type { ImageItem } from "@/components/IconCard";

interface SelectionToolbarProps {
  selectedIds: Set<number>;
  images: ImageItem[];
  vocabulary: string[];
  onTagClick: (tagName: string) => void;
}

export default function SelectionToolbar({
  selectedIds,
  images,
  vocabulary,
  onTagClick,
}: SelectionToolbarProps) {
  const [isPending, startTransition] = useTransition();
  const [isAutoTagging, startAutoTag] = useTransition();
  const [isClearing, startClear] = useTransition();

  const selectedList = images.filter((img) => selectedIds.has(img.id));
  const count = selectedList.length;

  const commonTags =
    count === 0
      ? []
      : selectedList[0].tags.filter((tag) =>
          selectedList.every((img) => img.tags.includes(tag)),
        );

  const commonAiTags =
    count === 0
      ? []
      : commonTags.filter((tag) =>
          selectedList.every((img) => img.aiTags.includes(tag)),
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              startAutoTag(async () => {
                await autoTagImages(Array.from(selectedIds));
              });
            }}
            disabled={isAutoTagging || count === 0}
            title="Auto-tag with AI"
            className="text-xs px-2 py-0.5 rounded-md
                       bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300
                       hover:bg-violet-200 dark:hover:bg-violet-800/40 disabled:opacity-50"
          >
            {isAutoTagging ? "Tagging…" : "✦ Auto-tag"}
          </button>
          <button
            onClick={() => {
              startClear(async () => {
                await clearGeneratedTags(Array.from(selectedIds));
              });
            }}
            disabled={isClearing || count === 0}
            title="Clear AI-generated tags (manual tags are kept)"
            className="text-xs px-2 py-0.5 rounded-md
                       bg-zinc-100 dark:bg-zinc-700/50 text-zinc-600 dark:text-zinc-300
                       hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50"
          >
            {isClearing ? "Clearing…" : "Clear generated tags"}
          </button>
        </div>
      </div>

      {/* Absolute path — only when exactly one image is selected */}
      {count === 1 && (
        <p
          className="text-[11px] text-zinc-400 dark:text-zinc-500 break-all leading-relaxed mb-3"
          title={selectedList[0].abs_path}
        >
          {selectedList[0].abs_path}
        </p>
      )}

      {/* Tag editor */}
      <TagEditor
        selectedIds={Array.from(selectedIds)}
        commonTags={commonTags}
        commonAiTags={commonAiTags}
        vocabulary={vocabulary}
        onRemoveCommonTag={handleRemoveCommonTag}
        onTagClick={onTagClick}
      />

      {isPending && (
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">
          Saving…
        </p>
      )}
    </div>
  );
}
