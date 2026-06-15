"use client";

import { useEffect, useState, useTransition } from "react";
import { acceptSuggestions, rejectSuggestions } from "@/lib/actions";
import { renderThumbnail } from "@/lib/three/thumbnailRenderer";

export interface FileDetailGroup {
  imageId: number;
  filename: string;
  tags: string[];
}

interface FileDetailsProps {
  groups: FileDetailGroup[];
}

export default function TagSuggestions({ groups }: FileDetailsProps) {
  if (groups.length === 0) return null;

  return (
    <div className="border-b border-zinc-200 dark:border-zinc-700 px-4 py-4">
      <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
        AI suggestions ({groups.length})
      </h2>
      <div className="flex flex-col gap-3">
        {groups.map((g) => (
          <FileDetailRow key={g.imageId} group={g} />
        ))}
      </div>
    </div>
  );
}

/**
 * Small preview for a suggestion row. FBX meshes can't be shown via /api/file (it
 * serves the raw 3D file), so we render the cached three.js snapshot for those and
 * fall back to a plain <img> for ordinary images.
 */
function SuggestionPreview({ imageId, filename }: { imageId: number; filename: string }) {
  const isMesh = filename.toLowerCase().endsWith(".fbx");
  const [snapshot, setSnapshot] = useState<string | null>(null);

  useEffect(() => {
    if (!isMesh) return;
    let active = true;
    renderThumbnail(imageId, `/api/file?id=${imageId}`)
      .then((url) => active && setSnapshot(url))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isMesh, imageId]);

  const className = "w-8 h-8 object-contain rounded bg-zinc-200 dark:bg-zinc-700 shrink-0";
  const src = isMesh ? snapshot : `/api/file?id=${imageId}`;
  if (!src) return <div className={className} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={filename} className={className} />;
}

function FileDetailRow({ group }: { group: FileDetailGroup }) {
  const [isPending, startTransition] = useTransition();

  function accept() {
    startTransition(async () => {
      await acceptSuggestions(group.imageId);
    });
  }

  function reject() {
    startTransition(async () => {
      await rejectSuggestions(group.imageId);
    });
  }

  return (
    <div className={`rounded-lg border border-zinc-200 dark:border-zinc-600 p-2.5 ${isPending ? "opacity-50" : ""}`}>
      {/* Image preview + filename */}
      <div className="flex items-center gap-2 mb-2">
        <SuggestionPreview imageId={group.imageId} filename={group.filename} />
        <span className="text-xs text-zinc-600 dark:text-zinc-300 truncate min-w-0">
          {group.filename}
        </span>
      </div>

      {/* Tag chips */}
      <div className="flex flex-wrap gap-1 mb-2.5">
        {group.tags.map((tag) => (
          <span
            key={tag}
            className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300
                       rounded-full px-2 py-0.5"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Accept / Reject */}
      <div className="flex gap-2">
        <button
          onClick={accept}
          disabled={isPending}
          className="flex-1 text-xs py-1 rounded-md
                     bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300
                     hover:bg-green-200 dark:hover:bg-green-800/40 disabled:opacity-50"
        >
          ✓ Accept
        </button>
        <button
          onClick={reject}
          disabled={isPending}
          className="flex-1 text-xs py-1 rounded-md
                     bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300
                     hover:bg-red-200 dark:hover:bg-red-800/40 disabled:opacity-50"
        >
          ✕ Reject
        </button>
      </div>
    </div>
  );
}
