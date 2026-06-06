"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { addTags } from "@/lib/actions";

interface TagEditorProps {
  selectedIds: number[];
  /** Tags shared by ALL selected images — shown as removable chips */
  commonTags: string[];
  vocabulary: string[];
  onRemoveCommonTag: (tagName: string) => void;
}

export default function TagEditor({
  selectedIds,
  commonTags,
  vocabulary,
  onRemoveCommonTag,
}: TagEditorProps) {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const query = input.trim().toLowerCase();
  const suggestions = query
    ? vocabulary.filter(
        (v) => v.includes(query) && !commonTags.includes(v),
      ).slice(0, 8)
    : [];

  // Close dropdown when clicking outside
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function applyTag(name: string) {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed || selectedIds.length === 0) return;
    startTransition(async () => {
      await addTags(selectedIds, [trimmed]);
    });
    setInput("");
    setOpen(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault();
      applyTag(input);
    } else if (e.key === "Escape") {
      setOpen(false);
      setInput("");
    }
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-2 w-full">
      {/* Common tags row */}
      {commonTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {commonTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-0.5 text-xs
                         bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300
                         rounded-full px-2 py-0.5"
            >
              {tag}
              <button
                onClick={() => onRemoveCommonTag(tag)}
                className="hover:text-red-500 leading-none ml-0.5"
                aria-label={`Remove tag ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="relative">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => { setInput(e.target.value); setOpen(true); }}
          onKeyDown={handleKeyDown}
          onFocus={() => setOpen(true)}
          placeholder={
            isPending
              ? "Saving…"
              : selectedIds.length > 1
                ? `Add tag to ${selectedIds.length} images…`
                : "Add tag… (Enter to apply)"
          }
          disabled={isPending}
          className="w-full text-xs rounded-lg px-3 py-2
                     bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600
                     text-zinc-800 dark:text-zinc-200 placeholder-zinc-400
                     focus:outline-none focus:ring-2 focus:ring-blue-500
                     disabled:opacity-50"
        />

        {/* Autocomplete dropdown */}
        {open && suggestions.length > 0 && (
          <ul className="absolute z-20 left-0 right-0 top-full mt-1
                         bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600
                         rounded-lg shadow-lg overflow-hidden">
            {suggestions.map((s) => (
              <li key={s}>
                <button
                  onPointerDown={(e) => {
                    e.preventDefault(); // keep focus on input
                    applyTag(s);
                  }}
                  className="w-full text-left text-xs px-3 py-2
                             hover:bg-zinc-100 dark:hover:bg-zinc-600
                             text-zinc-700 dark:text-zinc-300"
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
