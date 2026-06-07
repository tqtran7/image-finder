"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, useState } from "react";
import { createCollection } from "@/lib/actions";

export interface CollectionItem {
  id: number;
  name: string;
  prompt: string | null;
}

interface CollectionSwitcherProps {
  collections: CollectionItem[];
  activeCollectionId: number;
  onEditCollection: (collection: CollectionItem) => void;
}

export default function CollectionSwitcher({
  collections,
  activeCollectionId,
  onEditCollection,
}: CollectionSwitcherProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isCreating, startCreate] = useTransition();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  function switchTo(id: number) {
    const p = new URLSearchParams(searchParams.toString());
    p.set("collection", String(id));
    p.delete("tags");
    p.delete("root");
    router.replace("?" + p.toString(), { scroll: false });
  }

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    startCreate(async () => {
      const id = await createCollection(name);
      setCreating(false);
      setNewName("");
      // Switch to the new collection
      const p = new URLSearchParams(searchParams.toString());
      p.set("collection", String(id));
      p.delete("tags");
      router.replace("?" + p.toString(), { scroll: false });
    });
  }

  const active = collections.find((c) => c.id === activeCollectionId);

  return (
    <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
          Collection
        </span>
        {active && (
          <button
            onClick={() => onEditCollection(active)}
            className="text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            title="Edit collection"
          >
            Edit
          </button>
        )}
      </div>

      {/* Collection tabs */}
      <div className="flex flex-col gap-1 mb-2">
        {collections.map((c) => (
          <button
            key={c.id}
            onClick={() => switchTo(c.id)}
            className={`text-left text-xs px-2.5 py-1.5 rounded-md truncate transition-colors ${
              c.id === activeCollectionId
                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Create new collection */}
      {creating ? (
        <form onSubmit={handleCreateSubmit} className="flex gap-1.5">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && (setCreating(false), setNewName(""))}
            placeholder="Collection name…"
            className="flex-1 min-w-0 text-xs px-2 py-1 rounded-md
                       bg-zinc-100 dark:bg-zinc-700 border border-transparent
                       focus:border-zinc-300 dark:focus:border-zinc-500 focus:outline-none
                       text-zinc-800 dark:text-zinc-200 placeholder-zinc-400"
          />
          <button
            type="submit"
            disabled={isCreating || !newName.trim()}
            className="text-xs px-2 py-1 rounded-md bg-zinc-900 dark:bg-zinc-100
                       text-white dark:text-zinc-900 disabled:opacity-40"
          >
            {isCreating ? "…" : "Add"}
          </button>
          <button
            type="button"
            onClick={() => { setCreating(false); setNewName(""); }}
            className="text-xs px-2 py-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            ✕
          </button>
        </form>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="w-full text-left text-xs text-zinc-400 dark:text-zinc-500
                     hover:text-zinc-700 dark:hover:text-zinc-300 py-0.5"
        >
          + New collection
        </button>
      )}
    </div>
  );
}
