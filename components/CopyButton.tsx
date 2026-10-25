"use client";

import { useRef, useState } from "react";

/** Copies `value` (or this page's address when `page` is set) and says so. */
export function CopyButton({ value, page, label = "Copy", what }: { value?: string; page?: boolean; label?: string; what?: string }) {
  const [state, setState] = useState<"idle" | "done" | "fail">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  async function copy() {
    const text = page ? window.location.href : (value ?? "");
    try {
      await navigator.clipboard.writeText(text);
      setState("done");
    } catch {
      // Clipboard API unavailable (http, old browser): fall back to a selection.
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        setState(document.execCommand("copy") ? "done" : "fail");
      } catch {
        setState("fail");
      }
      ta.remove();
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 1800);
  }
  return (
    <button type="button" className="copy" onClick={copy} aria-label={`${label}${what ? ` ${what}` : ""}`} title={`${label}${what ? ` ${what}` : ""}`}>
      <span aria-hidden="true">{state === "done" ? "✓" : state === "fail" ? "!" : "⧉"}</span>
      <span className="copy-text">{state === "done" ? "Copied" : state === "fail" ? "Press Ctrl+C" : page ? "Copy link" : ""}</span>
      <span className="sr-only" role="status">
        {state === "done" ? "Copied to clipboard" : ""}
      </span>
    </button>
  );
}
