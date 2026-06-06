"use client";

export interface ImageItem {
  id: number;
  filename: string;
  ext: string;
  tags: string[];
}

export const CARD_W = 128;
export const CARD_H = 184; // img box + filename + tags area

interface IconCardProps {
  image: ImageItem;
  selected: boolean;
  onCardClick: (id: number, shiftKey: boolean) => void;
  onRemoveTag: (imageId: number, tagName: string) => void;
}

export default function IconCard({
  image,
  selected,
  onCardClick,
  onRemoveTag,
}: IconCardProps) {
  const visibleTags = image.tags.slice(0, 2);
  const overflowCount = image.tags.length - visibleTags.length;

  return (
    <div
      style={{ width: CARD_W }}
      className="flex flex-col items-center shrink-0 cursor-pointer select-none"
      onClick={(e) => onCardClick(image.id, e.shiftKey)}
    >
      {/* Image box */}
      <div
        style={{ width: CARD_W, height: CARD_W }}
        className={`relative flex items-center justify-center rounded-lg overflow-hidden
                    bg-zinc-200 dark:bg-zinc-700 transition-all
                    ${selected ? "ring-2 ring-blue-500 ring-offset-1 ring-offset-zinc-50 dark:ring-offset-zinc-900" : ""}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          loading="lazy"
          src={`/api/file?id=${image.id}`}
          alt={image.filename}
          style={{ maxWidth: CARD_W - 16, maxHeight: CARD_W - 16 }}
          className="object-contain"
          draggable={false}
        />
        {/* Tag count badge — shown when not selected and has tags */}
        {!selected && image.tags.length > 0 && (
          <span className="absolute bottom-1 right-1 text-xs bg-blue-500 text-white
                           rounded-full w-4 h-4 flex items-center justify-center leading-none">
            {image.tags.length > 9 ? "9+" : image.tags.length}
          </span>
        )}
      </div>

      {/* Filename */}
      <p
        style={{ width: CARD_W }}
        className="text-xs text-zinc-500 dark:text-zinc-400 truncate text-center mt-1 px-1"
        title={image.filename}
      >
        {image.filename}
      </p>

      {/* Tag chips */}
      <div
        style={{ width: CARD_W, minHeight: 24 }}
        className="flex flex-wrap gap-0.5 justify-center mt-0.5 px-0.5"
        onClick={(e) => e.stopPropagation()} // don't toggle selection when clicking chips
      >
        {visibleTags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-0.5 text-xs bg-zinc-200 dark:bg-zinc-600
                       text-zinc-600 dark:text-zinc-300 rounded px-1 py-0.5 max-w-full"
          >
            <span className="truncate max-w-[56px]">{tag}</span>
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
