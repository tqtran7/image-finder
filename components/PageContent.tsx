"use client";

import { useState, useCallback, useTransition, Suspense } from "react";
import RootsManager from "@/components/RootsManager";
import IconGrid from "@/components/IconGrid";
import SelectionToolbar from "@/components/SelectionToolbar";
import SuggestionsPanel from "@/components/SuggestionsPanel";
import SearchBar from "@/components/SearchBar";
import ThemeToggle from "@/components/ThemeToggle";
import { removeTag } from "@/lib/actions";
import type { RootWithCount } from "@/app/page";
import type { ImageItem } from "@/components/IconCard";
import type { SuggestionGroup } from "@/components/SuggestionsPanel";

interface PageContentProps {
  roots: RootWithCount[];
  images: ImageItem[];
  vocabulary: string[];
  totalCount: number;
  suggestions: SuggestionGroup[];
}

export default function PageContent({
  roots,
  images,
  vocabulary,
  totalCount,
  suggestions,
}: PageContentProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [lastSelectedIdx, setLastSelectedIdx] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  const handleCardClick = useCallback(
    (id: number, shiftKey: boolean) => {
      const idx = images.findIndex((img) => img.id === id);

      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (shiftKey && lastSelectedIdx !== null) {
          const lo = Math.min(lastSelectedIdx, idx);
          const hi = Math.max(lastSelectedIdx, idx);
          for (let i = lo; i <= hi; i++) next.add(images[i].id);
        } else {
          if (next.has(id)) next.delete(id);
          else next.add(id);
        }
        return next;
      });

      if (!shiftKey) setLastSelectedIdx(idx);
    },
    [images, lastSelectedIdx],
  );

  const handleRemoveTag = useCallback((imageId: number, tagName: string) => {
    startTransition(async () => {
      await removeTag(imageId, tagName);
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setLastSelectedIdx(null);
  }, []);

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
          {/* Folders section */}
          <div className="px-4 py-4">
            <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
              Folders
            </h2>
            <RootsManager roots={roots} />
          </div>

          {/* Tag panel — shown when items are selected */}
          {selectedIds.size > 0 && (
            <SelectionToolbar
              selectedIds={selectedIds}
              images={images}
              vocabulary={vocabulary}
              onClearSelection={handleClearSelection}
            />
          )}

          {/* AI suggestion review panel */}
          <SuggestionsPanel groups={suggestions} />
        </aside>

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
          />
        </main>
      </div>
    </div>
  );
}
