"use client";

import { useState, useTransition } from "react";
import TagEditor from "@/components/TagEditor";
import AutoTagModal from "@/components/AutoTagModal";
import { removeTag, autoTagImages, clearGeneratedTags } from "@/lib/actions";
import type { AutoTagFilter } from "@/lib/actions";
import type { ImageItem } from "@/components/IconCard";

interface FileDetailsProps {
  selectedIds: Set<number>;
  images: ImageItem[];
  vocabulary: string[];
  onTagClick: (tagName: string) => void;
  kind?: "image" | "mesh";
}

export default function FileDetails({
  selectedIds,
  images,
  vocabulary,
  onTagClick,
  kind = "image",
}: FileDetailsProps) {
  // AI vision tagging can't read raw 3D files, so it's hidden for meshes (v1).
  const showAutoTag = kind !== "mesh";
  const [isPending, startTransition] = useTransition();
  const [isAutoTagging, startAutoTag] = useTransition();
  const [isClearing, startClear] = useTransition();
  const [showAutoTagModal, setShowAutoTagModal] = useState(false);

  function handleAutoTagConfirm(filter: AutoTagFilter) {
    startAutoTag(async () => {
      await autoTagImages(Array.from(selectedIds), filter.invert, filter.addBlackBackground);
    });
  }

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
      {showAutoTag && (
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAutoTagModal(true)}
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
            {isClearing ? "Clearing…" : "Clear AI tags"}
          </button>
        </div>
      </div>
      )}

      {/* File name + path — only when exactly one image is selected */}
      {count === 1 && (
        <div className="mb-3">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200 truncate">
            {selectedList[0].abs_path.split(/[\\/]/).pop()}
          </p>
          <p
            className="mt-2 text-xs text-zinc-400 dark:text-zinc-500 break-all leading-relaxed"
            title={selectedList[0].abs_path}
          >
            {selectedList[0].abs_path}
          </p>
        </div>
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

      {showAutoTagModal && (
        <AutoTagModal
          title={`Auto-tag ${count} ${count === 1 ? "image" : "images"}`}
          description="Suggestions are added for review — existing tags are not changed."
          onConfirm={handleAutoTagConfirm}
          onClose={() => setShowAutoTagModal(false)}
          showSkipOptions={false}
        />
      )}
    </div>
  );
}
