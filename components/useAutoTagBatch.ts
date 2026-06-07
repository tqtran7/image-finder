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
  const runIdRef = useRef(0);
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
      const myRunId = ++runIdRef.current;
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
        // Bail if this run was superseded by a stop (pause/stop bump runIdRef
        // and update the UI optimistically — don't clobber that state here).
        if (runIdRef.current !== myRunId || stoppedRef.current) break;
        if (pausedRef.current) {
          // pause() already flipped the UI to "paused" and released the lock.
          return;
        }

        const result = await autoTagAndAcceptImage(img.id);
        if (runIdRef.current !== myRunId) return;
        processed++;
        if (result.tagged) tagged++;
        if (result.error) errors++;
        setProgress({ done: processed, total: imgs.length, errors });
      }

      if (runIdRef.current !== myRunId) return;

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
    // Flip the UI immediately — don't wait for the in-flight image to finish.
    // The in-flight call still completes server-side; its result is discarded
    // via the run-id guard. Resume re-fetches from the DB, so nothing is lost.
    setStatus("paused");
    void releaseWakeLock();
  }, [releaseWakeLock]);

  const resume = useCallback(() => {
    const last = lastRunRef.current;
    if (last) void runBatch(last.fetchIds, last.filter);
  }, [runBatch]);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    pausedRef.current = false;
    // Supersede the active run so any in-flight iteration's post-await writes
    // are ignored, then finalize the UI immediately regardless of run state.
    runIdRef.current++;
    setStatus("idle");
    setProgress(null);
    setSummary("Stopped.");
    void releaseWakeLock();
    router.refresh();
  }, [releaseWakeLock, router]);

  return { status, progress, summary, start, pause, resume, stop };
}
