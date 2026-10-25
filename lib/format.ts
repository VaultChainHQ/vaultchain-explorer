export function fmtVault(amount: string | bigint): string {
  const u = typeof amount === "bigint" ? amount : BigInt(amount || "0");
  const whole = u / 1_000_000n;
  const frac = (u % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : `${whole}`;
}

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ["KiB", "MiB", "GiB", "TiB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 ? 2 : 1)} ${units[i]}`;
}

export function short(s: string, n = 8): string {
  return s.length > 2 * n + 1 ? `${s.slice(0, n)}…${s.slice(-n)}` : s;
}

export type SearchTarget = { href: string } | { error: string };

/** Turns what a user typed in the search box into a page. */
export function classifyQuery(q: string): SearchTarget {
  const s = q.trim();
  if (!s) return { error: "Type an address (vault1…), a manifest root / tx hash (64 hex) or a deal id." };
  if (/^vault1[02-9ac-hj-np-z]{20,80}$/.test(s)) return { href: `/account/${s}` };
  if (/^\d{1,12}$/.test(s)) return { href: `/deals/${s}` };
  if (/^[0-9a-fA-F]{64}$/.test(s)) return { href: `/files/${s.toLowerCase()}` };
  return { error: `Not recognised: ${s.slice(0, 80)}` };
}
