"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { autoTagAndAcceptImage, type AutoTagFilter } from "@/lib/actions";

export type { AutoTagFilter };

export interface TagProgress {
  done: number;
  total: number;
  errors: number;
}

export type BatchStatus = "idle" | "running" | "paused";

/** Fetches the candidate image IDs for a run, given the chosen filter. */
type FetchIds = (filter: AutoTagFilter) => Promise<{ id: number }[]>;

/**
 * Drives a client-side, DB-resumable auto-tag batch.
 *
 * The loop calls `autoTagAndAcceptImage` per image (each call stamps the image as
 * tagged in the DB). Pausing breaks the loop after the in-flight image; resuming
 * re-fetches candidates (now smaller, since tagged ones are skipped) and continues
 * — which is also why reopening the tab and starting again "resumes" from the DB.
 */
export function useAutoTagBatch() {
  const router = useRouter();
  const [status, setStatus] = useState<BatchStatus>("idle");
  const [progress, setProgress] = useState<TagProgress | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  const pausedRef = useRef(false);
  const stoppedRef = useRef(false);
  const lastRunRef = useRef<{ fetchIds: FetchIds; filter: AutoTagFilter } | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const acquireWakeLock = useCallback(async () => {
    try {
      if ("wakeLock" in navigator && !wakeLockRef.current) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
      }
    } catch {
      // Unsupported or denied — non-fatal, the run still works.
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    try {
      await wakeLockRef.current?.release();
    } catch {
      /* ignore */
    }
    wakeLockRef.current = null;
  }, []);

  const runBatch = useCallback(
    async (fetchIds: FetchIds, filter: AutoTagFilter) => {
      lastRunRef.current = { fetchIds, filter };
      pausedRef.current = false;
      stoppedRef.current = false;
      setSummary(null);

      const imgs = await fetchIds(filter);
      if (imgs.length === 0) {
        setStatus("idle");
        setProgress(null);
        setSummary("Nothing to tag — all images match the skip rules.");
        return;
      }

      setStatus("running");
      setProgress({ done: 0, total: imgs.length, errors: 0 });
      await acquireWakeLock();

      let tagged = 0;
      let errors = 0;
      let processed = 0;

      for (const img of imgs) {
        if (stoppedRef.current) break;
        if (pausedRef.current) {
          setStatus("paused");
          await releaseWakeLock();
          return;
        }

        const result = await autoTagAndAcceptImage(img.id);
        processed++;
        if (result.tagged) tagged++;
        if (result.error) errors++;
        setProgress({ done: processed, total: imgs.length, errors });
      }

      await releaseWakeLock();
      setProgress(null);
      setStatus("idle");
      router.refresh();

      const parts = [`${tagged}/${processed} tagged`];
      if (errors > 0) parts.push(`${errors} errors`);
      if (stoppedRef.current) parts.unshift("Stopped:");
      setSummary(parts.join(" "));
    },
    [acquireWakeLock, releaseWakeLock, router],
  );

  const start = useCallback(
    (fetchIds: FetchIds, filter: AutoTagFilter) => runBatch(fetchIds, filter),
    [runBatch],
  );

  const pause = useCallback(() => {
    pausedRef.current = true;
  }, []);

  const resume = useCallback(() => {
    const last = lastRunRef.current;
    if (last) void runBatch(last.fetchIds, last.filter);
  }, [runBatch]);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    pausedRef.current = false;
    // If currently paused, the loop isn't running to observe the flag — finalize here.
    if (status === "paused") {
      setStatus("idle");
      setProgress(null);
      setSummary("Stopped.");
      void releaseWakeLock();
      router.refresh();
    }
  }, [status, releaseWakeLock, router]);

  return { status, progress, summary, start, pause, resume, stop };
}
