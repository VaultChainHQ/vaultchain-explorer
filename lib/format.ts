/** Seconds per block on the public devnet. Only used to turn block counts into rough durations. */
export const BLOCK_SECONDS = 3;
const UVAULT = 1_000_000n;

/** "1950", "0.0015": a bare amount without a unit or grouping (6 decimals max). */
export function fmtVault(amount: string | bigint): string {
  const u = typeof amount === "bigint" ? amount : BigInt(amount || "0");
  const whole = u / UVAULT;
  const frac = (u % UVAULT).toString().padStart(6, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : `${whole}`;
}

/** "1,950 VAULT" / "0.0015 VAULT": what people should see instead of raw uvault. */
export function vault(amount: string | bigint): string {
  const u = typeof amount === "bigint" ? amount : BigInt(amount || "0");
  const whole = (u / UVAULT).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const frac = (u % UVAULT).toString().padStart(6, "0").replace(/0+$/, "");
  return `${frac ? `${whole}.${frac}` : whole} VAULT`;
}

export function fmtBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "–";
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

/** A span of blocks as a rough human duration: "about 8 hours". */
export function fmtDuration(blocks: number): string {
  const s = Math.max(0, Math.round(blocks * BLOCK_SECONDS));
  if (s < 5) return "a moment";
  if (s < 60) return `about ${s} seconds`;
  const m = Math.round(s / 60);
  if (m < 90) return `about ${m} minute${m === 1 ? "" : "s"}`;
  const h = Math.round(s / 3600);
  if (h < 36) return `about ${h} hour${h === 1 ? "" : "s"}`;
  const d = Math.round(s / 86400);
  return `about ${d} day${d === 1 ? "" : "s"}`;
}

/** "just now" / "about 2 minutes ago", given how many blocks ago something happened. */
export function fmtAgo(blocksAgo: number): string {
  if (blocksAgo <= 1) return "just now";
  return `${fmtDuration(blocksAgo)} ago`;
}

/** "in about 8 hours" / "ended about 2 hours ago" for a target height. */
export function fmtWhen(target: number, now: number | undefined): string {
  if (now === undefined) return `at block ${target}`;
  if (target > now) return `in ${fmtDuration(target - now)}`;
  return fmtAgo(now - target);
}

export const ADDRESS_RE = /^vault1[02-9ac-hj-np-z]{20,80}$/;
export const HEX64_RE = /^[0-9a-fA-F]{64}$/;

export type ParsedQuery =
  | { kind: "empty" }
  | { kind: "address"; value: string }
  | { kind: "deal"; value: string }
  | { kind: "hex64"; value: string }
  | { kind: "hexprefix"; value: string }
  | { kind: "addressprefix"; value: string }
  | { kind: "text"; value: string };

/** Works out what a user typed into the search box. It never decides whether the thing exists. */
export function parseQuery(q: string): ParsedQuery {
  let s = q.trim();
  if (!s) return { kind: "empty" };
  const deal = /^(?:deal\s*)?#\s*(\d{1,12})$/i.exec(s) ?? /^deal\s+(\d{1,12})$/i.exec(s);
  if (deal) return { kind: "deal", value: String(Number(deal[1])) };
  s = s.replace(/^0x/i, "");
  if (ADDRESS_RE.test(s)) return { kind: "address", value: s };
  if (/^\d{1,12}$/.test(s)) return { kind: "deal", value: String(Number(s)) };
  if (HEX64_RE.test(s)) return { kind: "hex64", value: s.toLowerCase() };
  if (/^[0-9a-fA-F]{6,63}$/.test(s)) return { kind: "hexprefix", value: s.toLowerCase() };
  if (/^vault1[02-9ac-hj-np-z]{1,19}$/.test(s)) return { kind: "addressprefix", value: s };
  return { kind: "text", value: q.trim().slice(0, 80) };
}

/** Builds "/path?a=1&b=2", skipping empty values. */
export function href(path: string, params: Record<string, string | number | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  const q = sp.toString();
  return q ? `${path}?${q}` : path;
}

export interface Page<T> {
  rows: T[];
  page: number;
  pages: number;
  total: number;
  from: number;
  to: number;
}

export function paginate<T>(all: T[], page: number, size = 20): Page<T> {
  const pages = Math.max(1, Math.ceil(all.length / size));
  const p = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  const start = (p - 1) * size;
  const rows = all.slice(start, start + size);
  return { rows, page: p, pages, total: all.length, from: all.length ? start + 1 : 0, to: start + rows.length };
}
