"use client";

import { useRef, useState, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import IconCard, { CARD_W, CARD_H, type ImageItem } from "@/components/IconCard";

const GAP = 8;

interface IconGridProps {
  images: ImageItem[];
  selectedIds: Set<number>;
  onCardClick: (id: number) => void;
  onRemoveTag: (imageId: number, tagName: string) => void;
  onTagClick: (tagName: string) => void;
}

export default function IconGrid({
  images,
  selectedIds,
  onCardClick,
  onRemoveTag,
  onTagClick,
}: IconGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    ro.observe(el);
    setContainerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const cols = Math.max(1, Math.floor((containerWidth + GAP) / (CARD_W + GAP)));
  const rowCount = Math.ceil(images.length / cols);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => containerRef.current,
    estimateSize: () => CARD_H + GAP,
    overscan: 4,
  });

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto"
      style={{ padding: GAP }}
    >
      {images.length === 0 ? (
        <p className="text-sm text-zinc-400 dark:text-zinc-500 text-center py-16">
          No images found. Add a folder to get started.
        </p>
      ) : (
        <>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-3">
            {images.length.toLocaleString()} images
          </p>
          <div
            style={{
              height: rowVirtualizer.getTotalSize(),
              width: "100%",
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const startIdx = virtualRow.index * cols;
              const rowImages = images.slice(startIdx, startIdx + cols);

              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: virtualRow.start,
                    left: 0,
                    width: "100%",
                    display: "flex",
                    gap: GAP,
                  }}
                >
                  {rowImages.map((img) => (
                    <IconCard
                      key={img.id}
                      image={img}
                      selected={selectedIds.has(img.id)}
                      onCardClick={onCardClick}
                      onRemoveTag={onRemoveTag}
                      onTagClick={onTagClick}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
