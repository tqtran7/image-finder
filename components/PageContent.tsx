"use client";

import { useState, useCallback, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import RootsManager from "@/components/RootsManager";
import IconGrid from "@/components/IconGrid";
import SelectionToolbar from "@/components/SelectionToolbar";
import SuggestionsPanel from "@/components/SuggestionsPanel";
import CollectionSwitcher from "@/components/CollectionSwitcher";
import CollectionEditor from "@/components/CollectionEditor";
import SearchBar from "@/components/SearchBar";
import ThemeToggle from "@/components/ThemeToggle";
import { removeTag } from "@/lib/actions";
import type { RootWithCount } from "@/app/page";
import type { ImageItem } from "@/components/IconCard";
import type { SuggestionGroup } from "@/components/SuggestionsPanel";
import type { CollectionItem } from "@/components/CollectionSwitcher";

interface PageContentProps {
  roots: RootWithCount[];
  images: ImageItem[];
  vocabulary: string[];
  totalCount: number;
  suggestions: SuggestionGroup[];
  collections: CollectionItem[];
  activeCollectionId: number;
}

export default function PageContent({
  roots,
  images,
  vocabulary,
  totalCount,
  suggestions,
  collections,
  activeCollectionId,
}: PageContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [editingCollection, setEditingCollection] = useState<CollectionItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [, startTransition] = useTransition();

  const handleCardClick = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else { next.clear(); next.add(id); }
      return next;
    });
  }, []);

  const handleRemoveTag = useCallback((imageId: number, tagName: string) => {
    startTransition(async () => {
      await removeTag(imageId, tagName);
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleTagClick = useCallback((tagName: string) => {
    const p = new URLSearchParams(searchParams.toString());
    const existing = p.get("tags")?.split(",").filter(Boolean) ?? [];
    if (!existing.includes(tagName)) {
      p.set("tags", [...existing, tagName].join(","));
      router.replace("?" + p.toString(), { scroll: false });
    }
  }, [router, searchParams]);

  return (
    <div className="h-screen flex flex-col font-sans bg-zinc-50 dark:bg-zinc-900">
      {/* Header */}
      <header className="shrink-0 bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 px-6 py-3 flex items-center justify-between">
        <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Icon Finder
        </h1>
        <ThemeToggle />
      </header>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 shrink-0 border-r border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 flex flex-col overflow-y-auto">
          {/* Collection switcher */}
          <Suspense>
            <CollectionSwitcher
              collections={collections}
              activeCollectionId={activeCollectionId}
              onEditCollection={setEditingCollection}
            />
          </Suspense>

          {/* Folders section */}
          <div className="px-4 py-4">
            <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
              Folders
            </h2>
            <RootsManager roots={roots} activeCollectionId={activeCollectionId} />
          </div>

          {/* Tag panel — shown when items are selected */}
          {selectedIds.size > 0 && (
            <SelectionToolbar
              selectedIds={selectedIds}
              images={images}
              vocabulary={vocabulary}
              onClearSelection={handleClearSelection}
              onTagClick={handleTagClick}
            />
          )}

          {/* AI suggestion review panel */}
          <SuggestionsPanel groups={suggestions} />
        </aside>

        {editingCollection && (
          <CollectionEditor
            collection={editingCollection}
            isDefault={editingCollection.id === collections[0]?.id}
            onClose={() => setEditingCollection(null)}
          />
        )}

        {/* Main — search bar + icon grid */}
        <main className="flex-1 flex flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-900">
          <Suspense>
            <SearchBar
              vocabulary={vocabulary}
              totalCount={totalCount}
              filteredCount={images.length}
            />
          </Suspense>
          <IconGrid
            images={images}
            selectedIds={selectedIds}
            onCardClick={handleCardClick}
            onRemoveTag={handleRemoveTag}
            onTagClick={handleTagClick}
          />
        </main>
      </div>
    </div>
  );
}
