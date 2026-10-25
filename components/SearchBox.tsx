"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

interface Hit {
  kind: string;
  title: string;
  sub: string;
  href: string;
}
const ICON: Record<string, string> = { address: "👤", deal: "🤝", file: "📄", tx: "🧾", provider: "🖥" };

/** One box for everything: address, deal number, file name or ID, transaction hash. Suggests as you type. */
export function SearchBox({ initial = "", autoFocus = false, big = false }: { initial?: string; autoFocus?: boolean; big?: boolean }) {
  const router = useRouter();
  const id = useId();
  const [q, setQ] = useState(initial);
  const [rawHits, setHits] = useState<Hit[]>([]);
  const [rawNotes, setNotes] = useState<string[]>([]);
  const ready = q.trim().length >= 2;
  const hits = ready ? rawHits : [];
  const notes = ready ? rawNotes : [];
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(-1);
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) return;
    const ctl = new AbortController();
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(t)}`, { signal: ctl.signal });
        const j = (await r.json()) as { hits: Hit[]; notes: string[] };
        setHits(j.hits ?? []);
        setNotes(j.notes ?? []);
        setActive(-1);
      } catch {
        /* aborted or offline: keep the previous suggestions */
      } finally {
        if (!ctl.signal.aborted) setBusy(false);
      }
    }, 220);
    return () => {
      clearTimeout(timer);
      ctl.abort();
    };
  }, [q]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    const click = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", key);
    window.addEventListener("mousedown", click);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("mousedown", click);
    };
  }, []);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (active >= 0 && hits[active]) return go(hits[active].href);
    const t = q.trim();
    if (t) go(`/search?q=${encodeURIComponent(t)}`);
  }
  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(hits.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(-1, a - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }
  const showList = open && q.trim().length >= 2;
  return (
    <div className={big ? "search big" : "search"} ref={box}>
      <form onSubmit={submit} role="search" aria-label="Search the explorer">
        <label htmlFor={`${id}-q`} className="sr-only">
          Search by address, deal number, file name, file ID or transaction hash
        </label>
        <input
          ref={input}
          id={`${id}-q`}
          name="q"
          type="search"
          autoComplete="off"
          spellCheck={false}
          autoFocus={autoFocus}
          placeholder={big ? "Search an address, deal number, file name, file ID or transaction…" : "Search address, deal, file or tx…  ( / )"}
          value={q}
          role="combobox"
          aria-expanded={showList}
          aria-controls={`${id}-list`}
          aria-activedescendant={active >= 0 ? `${id}-o${active}` : undefined}
          aria-autocomplete="list"
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
        />
        <button className="btn primary" type="submit">
          Search
        </button>
      </form>
      {showList ? (
        <ul className="suggest" id={`${id}-list`} role="listbox" aria-label="Suggestions">
          {hits.map((h, i) => (
            <li key={h.href + i} id={`${id}-o${i}`} role="option" aria-selected={i === active} className={i === active ? "on" : ""} onMouseDown={(e) => e.preventDefault()} onClick={() => go(h.href)}>
              <span aria-hidden="true">{ICON[h.kind] ?? "•"}</span>
              <span>
                <strong>{h.title}</strong>
                <small>{h.sub}</small>
              </span>
            </li>
          ))}
          {!hits.length ? <li className="note">{busy ? "Searching…" : (notes[0] ?? "No matches yet. Press Enter to search everywhere.")}</li> : null}
        </ul>
      ) : null}
    </div>
  );
}
