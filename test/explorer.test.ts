import { describe, expect, it } from "vitest";
import type { Deal, Manifest, Provider, Replica } from "../lib/api";
import { fmtAgo, fmtBytes, fmtDuration, fmtVault, fmtWhen, href, paginate, parseQuery, short, vault } from "../lib/format";
import { dealHealth, networkHealth, replicaHealth } from "../lib/health";
import { isAllowedNodePath } from "../lib/proxy";
import { type Loaders, search } from "../lib/search";
import { listQuery, sortBy } from "../lib/tables";
import { describeTx } from "../lib/tx";

const addr = "vault1vg7lkgnkt0exarksu3a7wv0rxc374rhuj30ug2";
const hex = "ab".repeat(32);
const P = { proof_interval_blocks: 10, max_missed_proofs: 3, accept_timeout_blocks: 20 };

describe("amount and size formatting", () => {
  it("formats VAULT amounts (6 decimals)", () => {
    expect(fmtVault("10000000")).toBe("10");
    expect(fmtVault("1500")).toBe("0.0015");
    expect(fmtVault("0")).toBe("0");
    expect(fmtVault("")).toBe("0");
    expect(vault("1950000000")).toBe("1,950 VAULT");
    expect(vault("1500")).toBe("0.0015 VAULT");
    expect(vault(1_234_567_890n)).toBe("1,234.56789 VAULT");
  });
  it("formats bytes and shortens ids", () => {
    expect(fmtBytes(10)).toBe("10 B");
    expect(fmtBytes(3145728)).toBe("3.00 MiB");
    expect(fmtBytes(-1)).toBe("–");
    expect(short("abcdefghijklmnopqrstuvwxyz", 4)).toBe("abcd…wxyz");
    expect(short("abc", 4)).toBe("abc");
  });
});

describe("block heights as time", () => {
  it("turns blocks into rough durations (3 s per block)", () => {
    expect(fmtDuration(0)).toBe("a moment");
    expect(fmtDuration(10)).toBe("about 30 seconds");
    expect(fmtDuration(1000)).toBe("about 50 minutes");
    expect(fmtDuration(10_000)).toBe("about 8 hours");
    expect(fmtDuration(100_000)).toBe("about 3 days");
    expect(fmtDuration(20)).toBe("about 1 minute");
  });
  it("describes past and future heights", () => {
    expect(fmtAgo(1)).toBe("just now");
    expect(fmtAgo(1000)).toBe("about 50 minutes ago");
    expect(fmtWhen(1100, 100)).toBe("in about 50 minutes");
    expect(fmtWhen(100, 1100)).toBe("about 50 minutes ago");
    expect(fmtWhen(500, undefined)).toBe("at block 500");
  });
});

describe("parseQuery", () => {
  it("recognises addresses, deal ids, roots and prefixes", () => {
    expect(parseQuery(` ${addr} `)).toEqual({ kind: "address", value: addr });
    expect(parseQuery("12")).toEqual({ kind: "deal", value: "12" });
    expect(parseQuery("#12")).toEqual({ kind: "deal", value: "12" });
    expect(parseQuery("Deal 7")).toEqual({ kind: "deal", value: "7" });
    expect(parseQuery(hex.toUpperCase())).toEqual({ kind: "hex64", value: hex });
    expect(parseQuery("0x" + hex)).toEqual({ kind: "hex64", value: hex });
    expect(parseQuery("c1a894")).toEqual({ kind: "hexprefix", value: "c1a894" });
    expect(parseQuery("vault1vg7l")).toEqual({ kind: "addressprefix", value: "vault1vg7l" });
    expect(parseQuery("")).toEqual({ kind: "empty" });
    expect(parseQuery("holiday photo.png")).toEqual({ kind: "text", value: "holiday photo.png" });
  });
  it("does not treat over-long hex or malformed addresses as ids", () => {
    expect(parseQuery(hex + "0").kind).toBe("text");
    expect(parseQuery("../x").kind).toBe("text");
  });
});

const man = (over: Partial<Manifest> = {}): Manifest => ({ root: hex, name: "holiday.png", size: 2048, chunk_size: 1024, mime: "image/png", owner: addr, height: 5, ...over }) as Manifest;
const deal = (over: Partial<Deal> = {}): Deal =>
  ({ id: 3, status: "open", owner: addr, cid: hex, size: 2048, start_height: 10, expire_height: 1010, replication: 1, min_replicas: 1, replicas: [], payment: { denom: "uvault", amount: "1000000" }, ...over }) as Deal;

function loaders(over: Partial<Loaders> = {}): Loaders {
  return {
    manifest: async (r) => (r === hex ? man() : undefined),
    tx: async () => undefined,
    deal: async (id) => (id === "3" ? deal() : undefined),
    manifests: async () => [man(), man({ root: "cd".repeat(32), name: "Contract.pdf", encryption: "xchacha" })],
    providers: async () => [{ address: "vault1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqx", status: "active", endpoint: "https://p1.example", capacity: 1, free_bytes: 1 } as Provider],
    latestDealId: async () => 9,
    ...over,
  };
}

describe("search()", () => {
  it("finds an address, a deal and a file", async () => {
    expect((await search(addr, loaders())).hits[0].href).toBe(`/account/${addr}`);
    expect((await search("3", loaders())).hits[0]).toMatchObject({ kind: "deal", href: "/deals/3", exact: true });
    expect((await search(hex, loaders())).hits[0]).toMatchObject({ kind: "file", href: `/files/${hex}` });
  });
  it("resolves a 64-hex query to a transaction when it is not a file", async () => {
    const r = await search("ef".repeat(32), loaders({ tx: async (h) => ({ hash: h, height: 4, index: 0, ok: true, result: "", raw: "{}" }) }));
    expect(r.hits[0]).toMatchObject({ kind: "tx", href: `/tx/${"ef".repeat(32)}` });
  });
  it("matches file names and root prefixes", async () => {
    expect((await search("contract", loaders())).hits.map((h) => h.title)).toEqual(["Contract.pdf"]);
    expect((await search("cdcdcd", loaders())).hits).toHaveLength(1);
  });
  it("gives helpful notes when nothing matches", async () => {
    const d = await search("99", loaders());
    expect(d.hits).toHaveLength(0);
    expect(d.notes[0]).toContain("newest deal is #9");
    expect((await search("ef".repeat(32), loaders())).notes[0]).toContain("64 characters");
    expect((await search("nonsense-xyz", loaders())).notes[0]).toContain("No file name");
    expect((await search("vault1BAD", loaders())).notes[0]).toContain("does not look like a valid address");
    expect((await search("", loaders())).notes[0]).toContain("Type an address");
  });
  it("adds the provider hit when the address is a provider", async () => {
    const r = await search("vault1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqx", loaders());
    expect(r.hits.map((h) => h.kind)).toEqual(["address", "provider"]);
  });
});

describe("health", () => {
  const rep = (over: Partial<Replica>): Replica => ({ slot: 0, provider: "p", status: "active", last_proven_height: 100, missed_proofs: 0, ...over }) as Replica;
  it("rates a recently proven copy as healthy", () => {
    expect(replicaHealth(rep({}), 105, P).level).toBe("ok");
  });
  it("flags slow, overdue and at-risk copies", () => {
    expect(replicaHealth(rep({}), 140, P).label).toBe("Slow");
    expect(replicaHealth(rep({}), 400, P).label).toBe("Overdue");
    expect(replicaHealth(rep({ missed_proofs: 2 }), 105, P).label).toBe("At risk");
  });
  it("explains waiting, no-proof and failed copies", () => {
    expect(replicaHealth(rep({ status: "assigned" }), 100, P).label).toBe("Waiting for provider");
    expect(replicaHealth(rep({ last_proven_height: 0 }), 100, P).label).toBe("No proof yet");
    expect(replicaHealth(rep({ status: "failed" }), 100, P).level).toBe("bad");
  });
  it("summarises deals", () => {
    expect(dealHealth(deal({ status: "closed" }), 5000, P).label).toBe("Completed");
    expect(dealHealth(deal({ status: "failed" }), 5000, P).level).toBe("bad");
    expect(dealHealth(deal({ replicas: [] }), 100, P).label).toBe("No copies yet");
    expect(dealHealth(deal({ replicas: [rep({})] }), 105, P).level).toBe("ok");
    expect(dealHealth(deal({ replicas: [rep({ status: "failed" })] }), 105, P).level).toBe("bad");
  });
  it("summarises the network", () => {
    const pr = [{ address: "a", status: "active" }] as Provider[];
    expect(networkHealth({ nodeUp: false, providers: [], deals: [] }).level).toBe("bad");
    expect(networkHealth({ nodeUp: true, providers: [], deals: [] }).level).toBe("bad");
    expect(networkHealth({ nodeUp: true, providers: pr, deals: [], params: P }).level).toBe("ok");
    expect(networkHealth({ nodeUp: true, providers: pr, deals: [deal({ replicas: [rep({ status: "failed" })] })], height: 100, params: P }).level).toBe("warn");
  });
});

describe("list helpers", () => {
  it("paginates safely", () => {
    const rows = Array.from({ length: 45 }, (_, i) => i);
    expect(paginate(rows, 1).rows).toHaveLength(20);
    expect(paginate(rows, 3)).toMatchObject({ pages: 3, from: 41, to: 45 });
    expect(paginate(rows, 99).page).toBe(3);
    expect(paginate([], 1)).toMatchObject({ pages: 1, from: 0, to: 0 });
  });
  it("parses and applies sorting", () => {
    expect(listQuery({ sort: "evil", dir: "asc", page: "-3" }, ["size"], "size")).toEqual({ sort: "size", dir: "asc", page: 1 });
    const q = listQuery({ sort: "size", dir: "asc" }, ["size"], "size");
    expect(sortBy([{ s: 3 }, { s: 1 }, { s: 2 }], q, (r) => r.s).map((r) => r.s)).toEqual([1, 2, 3]);
  });
  it("builds hrefs without empty params", () => {
    expect(href("/files", { a: "1", b: "", c: undefined, d: 2 })).toBe("/files?a=1&d=2");
    expect(href("/files", {})).toBe("/files");
  });
});

describe("describeTx", () => {
  it("summarises known messages and ignores unknown shapes", () => {
    const raw = JSON.stringify({ msgs: [{ type: "bank/Send", to: addr, amount: [{ denom: "uvault", amount: "2500000" }] }, { type: "storage/OpenDeal" }] });
    const m = describeTx(raw);
    expect(m[0].label).toBe("Transfer");
    expect(m[0].detail).toContain("2.5 VAULT");
    expect(m[1].label).toBe("Open a storage deal");
    expect(describeTx("not json")).toEqual([]);
    expect(describeTx("{}")).toEqual([]);
  });
});

describe("node proxy whitelist", () => {
  it("allows read-only explorer queries", () => {
    for (const p of [
      "cosmos/base/tendermint/v1beta1/node_info",
      `cosmos/bank/v1beta1/balances/${addr}`,
      "vaultchain/storage/deals",
      "vaultchain/storage/deals/3",
      `vaultchain/storage/manifests/${hex}`,
      `vaultchain/auth/accounts/${addr}`,
      `vaultchain/txs/${hex}`,
    ])
      expect(isAllowedNodePath(p), p).toBe(true);
  });
  it("blocks tx submission paths and traversal", () => {
    for (const p of ["vaultchain/txs", "vaultchain/admin/x", "../etc/passwd", "vaultchain/storage/deals/abc", `vaultchain/auth/pubkeys/${addr}x/y`, ""])
      expect(isAllowedNodePath(p), p).toBe(false);
  });
});
