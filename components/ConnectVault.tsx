"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { ADDRESS_RE } from "@/lib/format";
import { SITES } from "@/lib/links";

const KEY = "vaultchain-explorer:my-address";
const subs = new Set<() => void>();
const read = () => {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
};

/** Remembers one public address in this browser so "My account" is one click away. Never asks for a key. */
export function ConnectVault() {
  const mine = useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    read,
    () => "",
  );
  const [val, setVal] = useState("");
  const [err, setErr] = useState("");

  function save(e: React.FormEvent) {
    e.preventDefault();
    const a = val.trim();
    if (!ADDRESS_RE.test(a)) return setErr("That is not a valid address. It starts with vault1 and is about 44 characters.");
    try {
      localStorage.setItem(KEY, a);
    } catch {
      /* ignore */
    }
    setErr("");
    setVal("");
    subs.forEach((s) => s());
  }
  function forget() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    subs.forEach((s) => s());
  }
  return (
    <details className="connect">
      <summary className="btn sm">{mine ? `My vault · ${mine.slice(0, 9)}…` : "Connect your vault"}</summary>
      <div className="pop">
        {mine ? (
          <>
            <p className="small muted">Showing links for your address. It is stored only in this browser.</p>
            <p>
              <Link className="btn sm primary" href={`/account/${mine}`}>
                My account &amp; files
              </Link>
            </p>
            <p>
              <button type="button" className="btn sm" onClick={forget}>
                Disconnect
              </button>
            </p>
          </>
        ) : (
          <form onSubmit={save}>
            <p className="small">Paste your vault address to jump to your files and deals. This only remembers the (public) address in this browser; it never asks for a key.</p>
            <label className="sr-only" htmlFor="my-address">
              Your vault address
            </label>
            <input id="my-address" value={val} onChange={(e) => setVal(e.target.value)} placeholder="vault1…" spellCheck={false} autoComplete="off" />
            {err ? <p className="small bad-text">{err}</p> : null}
            <p>
              <button className="btn sm primary" type="submit">
                Connect
              </button>
            </p>
          </form>
        )}
        <hr />
        <p className="small muted">Don&apos;t have a vault yet?</p>
        <p className="row">
          <a className="btn sm" href={SITES.upload} target="_blank" rel="noopener noreferrer">
            Upload app ↗
          </a>
          <a className="btn sm" href={SITES.vault} target="_blank" rel="noopener noreferrer">
            Web vault ↗
          </a>
        </p>
      </div>
    </details>
  );
}
