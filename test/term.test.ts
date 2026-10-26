import { describe, expect, it } from "vitest";
import type { Deal } from "../lib/api";
import { SHORT_TERM_BLOCKS, dealHealth, networkHealth, termNote } from "../lib/health";

const P = { proof_interval_blocks: 10, max_missed_proofs: 3, accept_timeout_blocks: 20 };
const rep = { slot: 0, provider: "p", status: "active", last_proven_height: 98, missed_proofs: 0 };
const deal = (p: Partial<Deal>): Deal =>
  ({ id: 1, class: "", owner: "o", cid: "c", size: 1, start_height: 0, expire_height: 1000, payment: { denom: "uvault", amount: "1" }, replication: 1, min_replicas: 1, replicas: [rep], status: "open", ...p }) as unknown as Deal;

describe("short term notes", () => {
  it("is neutral information for short running deals", () => {
    const n = termNote(deal({ expire_height: 1000 }));
    expect(n?.level).toBe("info");
    expect(n?.label).toBe("Short test term");
    expect(n?.why).toMatch(/not a fault/);
  });
  it("is absent for normal terms and for finished deals", () => {
    expect(termNote(deal({ expire_height: SHORT_TERM_BLOCKS + 1 }))).toBeUndefined();
    expect(termNote(deal({ status: "closed" }))).toBeUndefined();
    expect(termNote(deal({ status: "failed" }))).toBeUndefined();
  });
  it("does not change how healthy the deal is", () => {
    expect(dealHealth(deal({ expire_height: 1000 }), 100, P).level).toBe("ok");
  });
  it("never makes the network look unhealthy", () => {
    const h = networkHealth({ nodeUp: true, providers: [{ status: "active" } as never], deals: [deal({ expire_height: 1000 })], height: 100, params: P });
    expect(h.level).toBe("ok");
  });
});
