"use client";

import { CARD_W, type ImageItem } from "@/components/IconCard";

/**
 * Preview box for a mesh file. Today it renders a placeholder 3D-cube icon plus
 * the filename. This is the single extension point for 3D previews: replace the
 * body with a three.js <canvas> that loads `/api/file?id={image.id}` via FBXLoader
 * to render a real thumbnail — no other component needs to change.
 */
function MeshThumbnail({ image }: { image: ImageItem }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 px-2 text-center">
      <svg
        width="44"
        height="44"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-zinc-400 dark:text-zinc-500"
        aria-hidden="true"
      >
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
      </svg>
      <span className="text-[10px] leading-tight text-zinc-500 dark:text-zinc-400 line-clamp-2 break-all">
        {image.filename}
      </span>
    </div>
  );
}

interface MeshCardProps {
  image: ImageItem;
  selected: boolean;
  onCardClick: (id: number) => void;
  onRemoveTag: (imageId: number, tagName: string) => void;
  onTagClick: (tagName: string) => void;
}

export default function MeshCard({
  image,
  selected,
  onCardClick,
  onRemoveTag,
  onTagClick,
}: MeshCardProps) {
  const visibleTags = image.tags.slice(0, 2);
  const overflowCount = image.tags.length - visibleTags.length;

  return (
    <div
      style={{ width: CARD_W }}
      className="flex flex-col items-center shrink-0 cursor-pointer select-none"
      onClick={() => onCardClick(image.id)}
    >
      {/* Preview box */}
      <div
        style={{ width: CARD_W, height: CARD_W }}
        className={`relative flex items-center justify-center rounded-lg overflow-hidden
                    bg-zinc-200 dark:bg-zinc-700 transition-all
                    ${selected ? "ring-2 ring-blue-500 ring-offset-1 ring-offset-zinc-50 dark:ring-offset-zinc-900" : ""}`}
      >
        <MeshThumbnail image={image} />
        {/* Tag count badge — shown when not selected and has tags */}
        {!selected && image.tags.length > 0 && (
          <span className="absolute bottom-1 right-1 text-xs bg-blue-500 text-white
                           rounded-full w-4 h-4 flex items-center justify-center leading-none">
            {image.tags.length > 9 ? "9+" : image.tags.length}
          </span>
        )}
      </div>

      {/* Tag chips */}
      <div
        style={{ width: CARD_W, minHeight: 24 }}
        className="flex flex-wrap gap-0.5 justify-center mt-0.5 px-0.5"
        onClick={(e) => e.stopPropagation()} // don't toggle selection when clicking chips
      >
        {visibleTags.map((tag) => (
          <span
            key={tag}
            className={`inline-flex items-center gap-0.5 text-xs rounded px-1 py-0.5 max-w-full ${
              image.aiTags.includes(tag)
                ? "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300"
                : "bg-zinc-200 dark:bg-zinc-600 text-zinc-600 dark:text-zinc-300"
            }`}
          >
            <button
              onClick={() => onTagClick(tag)}
              className="truncate max-w-[56px] hover:text-blue-600 dark:hover:text-blue-400"
              aria-label={`Search for ${tag}`}
            >
              {tag}
            </button>
            <button
              onClick={() => onRemoveTag(image.id, tag)}
              className="text-zinc-400 dark:text-zinc-400 hover:text-red-500 leading-none shrink-0"
              aria-label={`Remove tag ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
        {overflowCount > 0 && (
          <span className="text-xs text-zinc-400 dark:text-zinc-500 px-1 py-0.5">
            +{overflowCount}
          </span>
        )}
      </div>
    </div>
  );
}
