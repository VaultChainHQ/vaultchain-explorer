import { describe, expect, it } from "vitest";
import { classifyQuery, fmtBytes, fmtVault, short } from "../lib/format";
import { isAllowedNodePath } from "../lib/proxy";

const addr = "vault1vg7lkgnkt0exarksu3a7wv0rxc374rhuj30ug2";
const hex = "ab".repeat(32);

describe("format", () => {
  it("formats VAULT amounts (6 decimals)", () => {
    expect(fmtVault("10000000")).toBe("10");
    expect(fmtVault("1950000000")).toBe("1950");
    expect(fmtVault("1500")).toBe("0.0015");
    expect(fmtVault("0")).toBe("0");
    expect(fmtVault("")).toBe("0");
  });
  it("formats bytes and shortens ids", () => {
    expect(fmtBytes(10)).toBe("10 B");
    expect(fmtBytes(3145728)).toBe("3.00 MiB");
    expect(short("abcdefghijklmnopqrstuvwxyz", 4)).toBe("abcd…wxyz");
    expect(short("abc", 4)).toBe("abc");
  });
});

describe("search routing", () => {
  it("routes addresses, deal ids and roots", () => {
    expect(classifyQuery(` ${addr} `)).toEqual({ href: `/account/${addr}` });
    expect(classifyQuery("12")).toEqual({ href: "/deals/12" });
    expect(classifyQuery(hex.toUpperCase())).toEqual({ href: `/files/${hex}` });
  });
  it("rejects junk", () => {
    for (const q of ["", "hello", "vault1", "../x", hex + "0"]) expect("error" in classifyQuery(q)).toBe(true);
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
