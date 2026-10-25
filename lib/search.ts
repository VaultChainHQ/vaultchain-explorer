import type { Deal, Manifest, Provider, TxRecord } from "./api";
import { fmtBytes, parseQuery, short } from "./format";

export type HitKind = "address" | "deal" | "file" | "tx" | "provider";
export interface Hit {
  kind: HitKind;
  title: string;
  sub: string;
  href: string;
  /** An exact id/hash/address match (as opposed to a name or prefix match). */
  exact?: boolean;
}
export interface SearchResult {
  hits: Hit[];
  /** Plain-language hints shown when there are few or no results. */
  notes: string[];
}

/** The lookups search needs. Each returns undefined for "does not exist" and throws for a real failure. */
export interface Loaders {
  manifest(root: string): Promise<Manifest | undefined>;
  tx(hash: string): Promise<TxRecord | undefined>;
  deal(id: string): Promise<Deal | undefined>;
  manifests(): Promise<Manifest[]>;
  providers(): Promise<Provider[]>;
  /** Latest deal id, to make "no such deal" messages useful. */
  latestDealId?(): Promise<number | undefined>;
}

const MAX = 8;

export async function search(q: string, L: Loaders): Promise<SearchResult> {
  const p = parseQuery(q);
  const hits: Hit[] = [];
  const notes: string[] = [];

  switch (p.kind) {
    case "empty":
      return { hits, notes: ["Type an address, deal number, file name, file ID or transaction hash."] };

    case "address": {
      hits.push({ kind: "address", title: short(p.value, 12), sub: "Account: balance, files and deals", href: `/account/${p.value}`, exact: true });
      const prov = (await L.providers().catch(() => [])).find((x) => x.address === p.value);
      if (prov) hits.push({ kind: "provider", title: short(p.value, 12), sub: `Storage provider (${prov.status})`, href: `/providers/${p.value}`, exact: true });
      break;
    }

    case "deal": {
      const d = await L.deal(p.value);
      if (d) hits.push({ kind: "deal", title: `Deal #${d.id}`, sub: `${d.status}, ${fmtBytes(d.size)}`, href: `/deals/${d.id}`, exact: true });
      else {
        const latest = await L.latestDealId?.().catch(() => undefined);
        notes.push(`There is no deal #${p.value}.${latest ? ` The newest deal is #${latest}.` : ""}`);
      }
      break;
    }

    case "hex64": {
      const [m, t] = await Promise.all([L.manifest(p.value).catch(() => undefined), L.tx(p.value).catch(() => undefined)]);
      if (m) hits.push(fileHit(m, true));
      if (t) hits.push({ kind: "tx", title: `Transaction ${short(t.hash, 10)}`, sub: `${t.ok ? "Succeeded" : "Failed"} in block ${t.height}`, href: `/tx/${t.hash}`, exact: true });
      if (!hits.length)
        notes.push("That looks like a file ID or transaction hash, but nothing on this devnet matches it. A transaction appears here a few seconds after it is sent. Check you copied all 64 characters, and that you are looking at the right network (the devnet is sometimes reset).");
      break;
    }

    case "hexprefix": {
      const ms = (await L.manifests()).filter((m) => m.root.startsWith(p.value)).slice(0, MAX);
      for (const m of ms) hits.push(fileHit(m, false));
      if (!hits.length) notes.push(`No file ID starts with “${p.value}”. Transaction hashes must be given in full (64 characters).`);
      break;
    }

    case "addressprefix": {
      const [ms, ps] = await Promise.all([L.manifests().catch(() => []), L.providers().catch(() => [])]);
      const seen = new Set<string>();
      for (const a of [...ps.map((x) => x.address), ...ms.map((m) => m.owner)]) {
        if (a.startsWith(p.value) && !seen.has(a) && seen.size < MAX) {
          seen.add(a);
          hits.push({ kind: "address", title: short(a, 12), sub: ps.some((x) => x.address === a) ? "Storage provider" : "File owner", href: `/account/${a}` });
        }
      }
      if (!hits.length) notes.push("That is only part of an address. Paste the whole address (it starts with vault1 and is about 44 characters).");
      break;
    }

    case "text": {
      const needle = p.value.toLowerCase();
      if (needle.startsWith("vault1")) {
        notes.push("That does not look like a valid address. Addresses start with vault1 and use only lowercase letters and digits (no b, i, o or 1 after the prefix).");
        break;
      }
      const [ms, ps] = await Promise.all([L.manifests().catch(() => []), L.providers().catch(() => [])]);
      for (const m of ms) if (hits.length < MAX && (m.name || "").toLowerCase().includes(needle)) hits.push(fileHit(m, false));
      for (const x of ps) if (hits.length < MAX && x.endpoint.toLowerCase().includes(needle)) hits.push({ kind: "provider", title: x.endpoint, sub: `Storage provider ${short(x.address, 8)}`, href: `/providers/${x.address}` });
      if (!hits.length) notes.push(`No file name or provider matches “${p.value}”. File names are searched by the text they contain.`);
      break;
    }
  }
  return { hits, notes };
}

function fileHit(m: Manifest, exact: boolean): Hit {
  return { kind: "file", title: m.name || short(m.root, 12), sub: `File, ${fmtBytes(m.size)}${m.encryption ? ", encrypted" : ""}`, href: `/files/${m.root}`, exact };
}
