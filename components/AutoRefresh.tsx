"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** Re-fetches the page's data on a timer, with a visible pause button. Pauses itself in background tabs. */
export function AutoRefresh({ seconds = 10 }: { seconds?: number }) {
  const router = useRouter();
  const [paused, setPaused] = useState(false);
  const [ago, setAgo] = useState(0);

  useEffect(() => {
    const tick = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      setAgo((a) => {
        if (!paused && a + 1 >= seconds) {
          router.refresh();
          return 0;
        }
        return a + 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [paused, seconds, router]);

  return (
    <div className="refresh" aria-live="off">
      <span className={paused ? "dot paused" : "dot live"} aria-hidden="true" />
      <span className="muted small">{paused ? "Auto-refresh paused" : `Live · updated ${ago}s ago`}</span>
      <button
        type="button"
        className="btn sm"
        onClick={() => {
          if (paused) {
            router.refresh();
            setAgo(0);
          }
          setPaused(!paused);
        }}
      >
        {paused ? "Resume" : "Pause"}
      </button>
      <button
        type="button"
        className="btn sm"
        onClick={() => {
          router.refresh();
          setAgo(0);
        }}
        aria-label="Refresh now"
      >
        Refresh
      </button>
    </div>
  );
}
