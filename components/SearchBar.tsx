"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";

interface SearchBarProps {
  vocabulary: string[];
  totalCount: number;
  filteredCount: number;
}

export default function SearchBar({
  vocabulary,
  totalCount,
  filteredCount,
}: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeTags = searchParams.get("tags")?.split(",").filter(Boolean) ?? [];

  const [input, setInput] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: PointerEvent) {
      if (!dropdownRef.current?.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, []);

  function updateParam(key: string, value: string | null) {
    const p = new URLSearchParams(searchParams.toString());
    if (!value) p.delete(key);
    else p.set(key, value);
    router.replace("?" + p.toString(), { scroll: false });
  }

  function addTag(tag: string) {
    const t = tag.trim().toLowerCase();
    if (!t || activeTags.includes(t)) return;
    updateParam("tags", [...activeTags, t].join(","));
    setInput("");
    setDropdownOpen(false);
    inputRef.current?.focus();
  }

  function removeTag(tag: string) {
    const next = activeTags.filter((t) => t !== tag);
    updateParam("tags", next.length ? next.join(",") : null);
  }

  function clearAll() {
    const p = new URLSearchParams(searchParams.toString());
    p.delete("tags");
    const qs = p.toString();
    router.replace(qs ? "?" + qs : "/", { scroll: false });
    setInput("");
  }

  const suggestions = input.trim()
    ? vocabulary
        .filter(
          (v) =>
            v.includes(input.trim().toLowerCase()) && !activeTags.includes(v),
        )
        .slice(0, 8)
    : [];

  const hasFilters = activeTags.length > 0;

  return (
    <div className="shrink-0 border-b border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5">
      {/* Row 1: full-width input + count/clear */}
      <div className="flex items-center gap-2">
        {/* Tag input with autocomplete — stretches to fill */}
        <div ref={dropdownRef} className="relative flex-1">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setDropdownOpen(true);
            }}
            onFocus={() => setDropdownOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && input.trim()) {
                e.preventDefault();
                addTag(input);
              } else if (e.key === "Escape") {
                setDropdownOpen(false);
                setInput("");
              } else if (
                e.key === "Backspace" &&
                !input &&
                activeTags.length > 0
              ) {
                removeTag(activeTags[activeTags.length - 1]);
              }
            }}
            placeholder={
              activeTags.length === 0 ? "Search by tag…" : "Add another tag…"
            }
            className="w-full text-sm px-3 py-1.5 rounded-lg
                       bg-zinc-100 dark:bg-zinc-700 border border-transparent
                       focus:border-zinc-300 dark:focus:border-zinc-500 focus:outline-none
                       text-zinc-800 dark:text-zinc-200 placeholder-zinc-400"
          />

          {dropdownOpen && suggestions.length > 0 && (
            <ul
              className="absolute z-20 left-0 top-full mt-1 min-w-[180px]
                         bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600
                         rounded-lg shadow-lg overflow-hidden"
            >
              {suggestions.map((s) => (
                <li key={s}>
                  <button
                    onPointerDown={(e) => {
                      e.preventDefault();
                      addTag(s);
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

        {/* Result count + clear */}
        {hasFilters && (
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              {filteredCount.toLocaleString()} / {totalCount.toLocaleString()}
            </span>
            <button
              onClick={clearAll}
              className="text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Row 2: active tag chips (only when tags are selected) */}
      {activeTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {activeTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-0.5 text-xs
                         bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300
                         rounded-full px-2.5 py-1"
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="hover:text-red-500 leading-none ml-1"
                aria-label={`Remove ${tag} filter`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
