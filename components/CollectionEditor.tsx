"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { renameCollection, updateCollectionPrompt, deleteCollection } from "@/lib/actions";
import { DEFAULT_TAG_PROMPT } from "@/lib/taggers/prompts";
import type { CollectionItem } from "@/components/CollectionSwitcher";

interface CollectionEditorProps {
  collection: CollectionItem;
  isDefault: boolean;
  onClose: () => void;
}

export default function CollectionEditor({ collection, isDefault, onClose }: CollectionEditorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [name, setName] = useState(collection.name);
  const [prompt, setPrompt] = useState(collection.prompt ?? "");
  const [isSaving, startSave] = useTransition();
  const [isDeleting, startDelete] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    startSave(async () => {
      try {
        if (trimmedName !== collection.name) {
          await renameCollection(collection.id, trimmedName);
        }
        await updateCollectionPrompt(collection.id, prompt);
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  function handleDelete() {
    if (!confirm(`Delete "${collection.name}"? Its folders will be moved to the Default collection.`)) return;
    startDelete(async () => {
      try {
        await deleteCollection(collection.id);
        const p = new URLSearchParams(searchParams.toString());
        if (p.get("collection") === String(collection.id)) {
          p.delete("collection");
          p.delete("tags");
          router.replace(p.toString() ? "?" + p.toString() : "/", { scroll: false });
        }
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-2xl w-[480px] flex flex-col overflow-hidden border border-zinc-200 dark:border-zinc-700">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">
            Edit collection
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} className="px-5 py-4 flex flex-col gap-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg
                         bg-zinc-100 dark:bg-zinc-700 border border-transparent
                         focus:border-zinc-300 dark:focus:border-zinc-500 focus:outline-none
                         text-zinc-800 dark:text-zinc-200"
            />
          </div>

          {/* Tagging prompt */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
              Auto-tag prompt
              <span className="font-normal ml-1 text-zinc-400 dark:text-zinc-500">
                (leave blank to use the default)
              </span>
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              placeholder={DEFAULT_TAG_PROMPT}
              className="w-full text-sm px-3 py-2 rounded-lg resize-y
                         bg-zinc-100 dark:bg-zinc-700 border border-transparent
                         focus:border-zinc-300 dark:focus:border-zinc-500 focus:outline-none
                         text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500"
            />
            {prompt.trim() && (
              <button
                type="button"
                onClick={() => setPrompt("")}
                className="mt-1 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                Reset to default
              </button>
            )}
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          {/* Footer row */}
          <div className="flex items-center justify-between pt-1">
            {isDefault ? (
              <span className="text-xs text-zinc-400 dark:text-zinc-500 italic">
                Default collection cannot be deleted
              </span>
            ) : (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-xs text-red-400 hover:text-red-500 disabled:opacity-40"
              >
                {isDeleting ? "Deleting…" : "Delete collection"}
              </button>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg text-xs text-zinc-600 dark:text-zinc-400
                           hover:bg-zinc-100 dark:hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || !name.trim()}
                className="px-3 py-1.5 rounded-lg text-xs bg-zinc-900 dark:bg-zinc-100
                           text-white dark:text-zinc-900 disabled:opacity-40"
              >
                {isSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
