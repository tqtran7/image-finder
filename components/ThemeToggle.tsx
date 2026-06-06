"use client";

import { useTheme } from "@/components/ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="w-8 h-8 flex items-center justify-center rounded-lg text-base
                 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100
                 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-700
                 transition-colors"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
