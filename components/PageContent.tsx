"use client";

import { useState, useCallback, useTransition, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FolderListPanel from "@/components/FolderListPanel";
import DetailsPanel from "@/components/DetailsPanel";
import IconGrid from "@/components/IconGrid";
import CollectionSwitcher from "@/components/CollectionSwitcher";
import CollectionEditor from "@/components/CollectionEditor";
import SearchBar from "@/components/SearchBar";
import ThemeToggle from "@/components/ThemeToggle";
import { removeTag } from "@/lib/actions";
import type { RootWithCount } from "@/app/page";
import type { ImageItem } from "@/components/IconCard";
import type { FileDetailGroup } from "@/components/TagSuggestions";
import type { CollectionItem } from "@/components/CollectionSwitcher";

const MIN_PANEL = 180;
const MAX_PANEL = 560;

function useResize(initial: number, side: "left" | "right") {
  const [width, setWidth] = useState(initial);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    startW.current = width;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [width]);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragging.current) return;
      const delta = side === "left"
        ? e.clientX - startX.current
        : startX.current - e.clientX;
      setWidth(Math.min(MAX_PANEL, Math.max(MIN_PANEL, startW.current + delta)));
    }
    function onUp() {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [side]);

  return { width, onMouseDown };
}

interface PageContentProps {
  roots: RootWithCount[];
  images: ImageItem[];
  vocabulary: string[];
  totalCount: number;
  totalTaggedCount: number;
  suggestions: FileDetailGroup[];
  collections: CollectionItem[];
  activeCollectionId: number;
}

export default function PageContent({
  roots,
  images,
  vocabulary,
  totalCount,
  totalTaggedCount,
  suggestions,
  collections,
  activeCollectionId,
}: PageContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeRootId = searchParams.get("root") ? Number(searchParams.get("root")) : null;
  const activeRoot = roots.find((r) => r.id === activeRootId) ?? null;
  const collectionName =
    collections.find((c) => c.id === activeCollectionId)?.name ?? "All";

  const [editingCollection, setEditingCollection] = useState<CollectionItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [, startTransition] = useTransition();

  // Auto-select first image when folder or collection changes
  const prevCollectionRef = useRef(activeCollectionId);
  const prevRootRef = useRef(activeRootId);
  useEffect(() => {
    if (
      prevCollectionRef.current !== activeCollectionId ||
      prevRootRef.current !== activeRootId
    ) {
      prevCollectionRef.current = activeCollectionId;
      prevRootRef.current = activeRootId;
      setSelectedIds(images.length > 0 ? new Set([images[0].id]) : new Set());
    }
  }, [activeCollectionId, activeRootId, images]);
  const left = useResize(288, "left");
  const right = useResize(288, "right");

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
        <aside
          style={{ width: left.width }}
          className="shrink-0 border-r border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 flex flex-col overflow-y-auto"
        >
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
              Collection folders
            </h2>
            <FolderListPanel
              roots={roots}
              activeCollectionId={activeCollectionId}
              totalCount={totalCount}
              totalTaggedCount={totalTaggedCount}
              activeCollection={collections.find((c) => c.id === activeCollectionId) ?? null}
              onEditCollection={setEditingCollection}
            />
          </div>
        </aside>

        {/* Left resize handle */}
        <div
          onMouseDown={left.onMouseDown}
          className="w-1 shrink-0 cursor-col-resize hover:bg-violet-400 dark:hover:bg-violet-500 transition-colors"
        />

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

        {/* Right resize handle — the details panel is always open ("All" or a folder) */}
        <div
          onMouseDown={right.onMouseDown}
          className="w-1 shrink-0 cursor-col-resize hover:bg-violet-400 dark:hover:bg-violet-500 transition-colors"
        />

        {/* Right details panel — collection info, folder info, or image selection */}
        <DetailsPanel
          activeRoot={activeRoot}
          selectedIds={selectedIds}
          images={images}
          vocabulary={vocabulary}
          suggestions={suggestions}
          onTagClick={handleTagClick}
          collectionId={activeCollectionId}
          collectionName={collectionName}
          totalCount={totalCount}
          width={right.width}
        />
      </div>
    </div>
  );
}
