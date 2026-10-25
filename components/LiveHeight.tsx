"use client";
import { useEffect, useState } from "react";

interface Seen {
  height: number;
  at: number;
}

/** Polls the node (via the read-only proxy) and lists the heights it has observed in this tab. */
export function LiveHeight({ initial }: { initial: number }) {
  const [seen, setSeen] = useState<Seen[]>([{ height: initial, at: 0 }]);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch("/api/node/cosmos/base/tendermint/v1beta1/node_info", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = (await res.json()) as { height: number };
        if (!alive) return;
        setError(undefined);
        setSeen((s) => (s[s.length - 1].height === j.height ? s : [...s, { height: j.height, at: Date.now() }].slice(-12)));
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      }
    };
    const t = setInterval(() => void tick(), 3000);
    void tick();
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const last = seen[seen.length - 1];
  return (
    <div>
      <div className="big">{last.height}</div>
      <div className="muted small">live height (refreshes every 3 s{error ? `, last poll failed: ${error}` : ""})</div>
      <table className="t">
        <thead>
          <tr>
            <th>Height seen</th>
            <th>Seen at (your local time)</th>
          </tr>
        </thead>
        <tbody>
          {[...seen].reverse().map((s) => (
            <tr key={s.height}>
              <td className="mono">{s.height}</td>
              <td>{s.at ? new Date(s.at).toLocaleTimeString() : "page load"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
