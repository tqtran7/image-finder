"use client";

import type { AutoTagFilter } from "@/lib/actions";

export const DEFAULT_AUTOTAG_FILTER: AutoTagFilter = {
  skipTagged: true,
  retagIfDifferentModel: false,
  retagOlderThanDays: null,
  invert: false,
  addBlackBackground: false,
  meshAngles: 1,
};

const ANGLE_CHOICES: { value: number; label: string }[] = [
  { value: 1, label: "Single" },
  { value: 2, label: "2" },
  { value: 4, label: "4" },
  { value: 6, label: "6" },
];

export default function AutoTagOptions({
  value,
  onChange,
  disabled,
  showSkipOptions = true,
  showAngleOptions = false,
}: {
  value: AutoTagFilter;
  onChange: (next: AutoTagFilter) => void;
  disabled?: boolean;
  showSkipOptions?: boolean;
  showAngleOptions?: boolean;
}) {
  const set = (patch: Partial<AutoTagFilter>) => onChange({ ...value, ...patch });

  return (
    <div className="flex flex-col gap-2 text-xs text-zinc-600 dark:text-zinc-400">
      {showAngleOptions && (
        <div className="flex flex-col gap-1">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Angles per mesh</span>
          <div className="flex gap-1">
            {ANGLE_CHOICES.map((choice) => (
              <button
                key={choice.value}
                type="button"
                disabled={disabled}
                onClick={() => set({ meshAngles: choice.value })}
                className={`flex-1 rounded-md px-2 py-1 border ${
                  value.meshAngles === choice.value
                    ? "border-violet-500 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300"
                    : "border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                } disabled:opacity-40`}
              >
                {choice.label}
              </button>
            ))}
          </div>
          <p className="mt-0.5 text-[11px] leading-snug text-zinc-500 dark:text-zinc-500">
            Renders the mesh from this many angles and sends them all to the model. More
            angles capture hidden features but are slower and cost more per mesh.
          </p>
        </div>
      )}

      {showAngleOptions && showSkipOptions && (
        <div className="border-t border-zinc-200 dark:border-zinc-700" />
      )}

      {showSkipOptions && (
        <>
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
        </>
      )}

      {/* Independent of the skip rules — per-run image preprocessing options. */}
      <div className="mt-1 border-t border-zinc-200 dark:border-zinc-700 pt-2 flex flex-col gap-2">
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={value.addBlackBackground}
              disabled={disabled}
              onChange={(e) => set({ addBlackBackground: e.target.checked })}
              className="accent-violet-500"
            />
            Add black background
          </label>
          <p className="pl-6 mt-0.5 text-[11px] leading-snug text-zinc-500 dark:text-zinc-500">
            Layers the image over a solid black background. White or light artwork on a
            transparent background shows up clearly instead of blending into white.
          </p>
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={value.invert}
              disabled={disabled}
              onChange={(e) => set({ invert: e.target.checked })}
              className="accent-violet-500"
            />
            Invert image colors
          </label>
          <p className="pl-6 mt-0.5 text-[11px] leading-snug text-zinc-500 dark:text-zinc-500">
            Flips colors before sending to the model. Helps it see white or light
            artwork on a transparent background, which otherwise looks blank.
          </p>
        </div>
      </div>
    </div>
  );
}
