"use client";

import type { AutoTagFilter } from "@/lib/actions";

export const DEFAULT_AUTOTAG_FILTER: AutoTagFilter = {
  skipTagged: true,
  retagIfDifferentModel: false,
  retagOlderThanDays: null,
};

export default function AutoTagOptions({
  value,
  onChange,
  disabled,
}: {
  value: AutoTagFilter;
  onChange: (next: AutoTagFilter) => void;
  disabled?: boolean;
}) {
  const set = (patch: Partial<AutoTagFilter>) => onChange({ ...value, ...patch });

  return (
    <div className="flex flex-col gap-2 text-xs text-zinc-600 dark:text-zinc-400">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={value.skipTagged}
          disabled={disabled}
          onChange={(e) => set({ skipTagged: e.target.checked })}
          className="accent-violet-500"
        />
        Skip already-tagged images
      </label>

      {/* Re-tag exceptions only apply when skipping. */}
      <label
        className={`flex items-center gap-2 pl-5 ${
          value.skipTagged ? "" : "opacity-40"
        }`}
      >
        <input
          type="checkbox"
          checked={value.retagIfDifferentModel}
          disabled={disabled || !value.skipTagged}
          onChange={(e) => set({ retagIfDifferentModel: e.target.checked })}
          className="accent-violet-500"
        />
        Re-tag if a different model
      </label>

      <label
        className={`flex items-center gap-2 pl-5 ${
          value.skipTagged ? "" : "opacity-40"
        }`}
      >
        <input
          type="checkbox"
          checked={value.retagOlderThanDays != null}
          disabled={disabled || !value.skipTagged}
          onChange={(e) =>
            set({ retagOlderThanDays: e.target.checked ? 30 : null })
          }
          className="accent-violet-500"
        />
        Re-tag if older than
        <input
          type="number"
          min={0}
          value={value.retagOlderThanDays ?? 30}
          disabled={disabled || !value.skipTagged || value.retagOlderThanDays == null}
          onChange={(e) =>
            set({ retagOlderThanDays: Math.max(0, Number(e.target.value) || 0) })
          }
          className="w-12 rounded border border-zinc-300 dark:border-zinc-600 bg-transparent px-1 py-0.5
                     disabled:opacity-40"
        />
        days
      </label>
    </div>
  );
}
