"use client";

import FileDetails from "@/components/FileDetails";
import FolderDetails from "@/components/FolderDetails";
import AllDetails from "@/components/AllDetails";
import TagSuggestions from "@/components/TagSuggestions";
import type { FileDetailGroup } from "@/components/TagSuggestions";
import type { RootWithCount } from "@/app/page";
import type { ImageItem } from "@/components/IconCard";
import type { CollectionItem } from "@/components/CollectionSwitcher";

interface DetailsPanelProps {
  activeRoot: RootWithCount | null;
  selectedIds: Set<number>;
  images: ImageItem[];
  vocabulary: string[];
  suggestions: FileDetailGroup[];
  onTagClick: (tagName: string) => void;
  collectionId: number;
  collectionName: string;
  totalCount: number;
  activeCollection: CollectionItem | null;
  collections: CollectionItem[];
  onEditCollection: (collection: CollectionItem) => void;
  width?: number;
  kind?: "image" | "mesh";
}

export default function DetailsPanel({
  activeRoot,
  selectedIds,
  images,
  vocabulary,
  suggestions,
  onTagClick,
  collectionId,
  collectionName,
  totalCount,
  activeCollection,
  collections,
  onEditCollection,
  width,
  kind = "image",
}: DetailsPanelProps) {
  const hasSelection = selectedIds.size > 0;
  const hasFolder = activeRoot !== null;
  const isAll = activeRoot === null;
  const hasSuggestions = suggestions.length > 0;

  if (!isAll && !hasSelection && !hasFolder && !hasSuggestions) return null;

  return (
    <aside
      style={width !== undefined ? { width } : undefined}
      className="shrink-0 border-l border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 flex flex-col overflow-y-auto"
    >
      {isAll && (
        <AllDetails
          collectionId={collectionId}
          collectionName={collectionName}
          totalCount={totalCount}
          activeCollection={activeCollection}
          onEditCollection={onEditCollection}
          kind={kind}
        />
      )}
      {hasFolder && (
        <FolderDetails
          root={activeRoot!}
          activeCollection={activeCollection}
          collections={collections}
          onEditCollection={onEditCollection}
          kind={kind}
        />
      )}
      {hasSelection && (
        <FileDetails
          selectedIds={selectedIds}
          images={images}
          vocabulary={vocabulary}
          onTagClick={onTagClick}
          kind={kind}
        />
      )}
      {hasSuggestions && <TagSuggestions groups={suggestions} />}
    </aside>
  );
}
