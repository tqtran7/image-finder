"use client";

import FileDetails from "@/components/FileDetails";
import FolderDetails from "@/components/FolderDetails";
import TagSuggestions from "@/components/TagSuggestions";
import type { FileDetailGroup } from "@/components/TagSuggestions";
import type { RootWithCount } from "@/app/page";
import type { ImageItem } from "@/components/IconCard";

interface DetailsPanelProps {
  activeRoot: RootWithCount | null;
  selectedIds: Set<number>;
  images: ImageItem[];
  vocabulary: string[];
  suggestions: FileDetailGroup[];
  onTagClick: (tagName: string) => void;
  width?: number;
}

export default function DetailsPanel({
  activeRoot,
  selectedIds,
  images,
  vocabulary,
  suggestions,
  onTagClick,
  width,
}: DetailsPanelProps) {
  const hasSelection = selectedIds.size > 0;
  const hasFolder = activeRoot !== null;
  const hasSuggestions = suggestions.length > 0;

  if (!hasSelection && !hasFolder && !hasSuggestions) return null;

  return (
    <aside
      style={width !== undefined ? { width } : undefined}
      className="shrink-0 border-l border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 flex flex-col overflow-y-auto"
    >
      {hasFolder && <FolderDetails root={activeRoot!} />}
      {hasSelection && (
        <FileDetails
          selectedIds={selectedIds}
          images={images}
          vocabulary={vocabulary}
          onTagClick={onTagClick}
        />
      )}
      {hasSuggestions && <TagSuggestions groups={suggestions} />}
    </aside>
  );
}
