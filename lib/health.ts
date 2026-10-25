import type { Deal, Provider, Replica, StorageParams } from "./api";
import { fmtAgo, fmtDuration } from "./format";

export type Level = "ok" | "warn" | "bad" | "idle";
export interface Health {
  level: Level;
  label: string;
  why: string;
}

type P = Pick<StorageParams, "proof_interval_blocks" | "max_missed_proofs" | "accept_timeout_blocks">;

/** Is this copy of the file being proven recently? Blocks since the last proof are compared with the proof interval. */
export function replicaHealth(r: Replica, height: number | undefined, p: P): Health {
  switch (r.status) {
    case "assigned": {
      const left = r.accept_deadline_height && height ? r.accept_deadline_height - height : undefined;
      return {
        level: "warn",
        label: "Waiting for provider",
        why: `The chain picked this provider but it has not confirmed it holds the file yet.${left !== undefined ? (left > 0 ? ` It has ${fmtDuration(left)} left to accept.` : " Its time to accept has run out.") : ""}`,
      };
    }
    case "declined":
      return { level: "bad", label: "Declined", why: "The provider did not accept in time, so another provider can take this slot." };
    case "failed":
      return { level: "bad", label: "Failed", why: "This provider missed too many storage proofs (or never proved), so it was penalised and no longer counts as a copy." };
    case "active":
      break;
    default:
      return { level: "idle", label: r.status, why: "Status reported by the chain." };
  }
  const missed = r.missed_proofs ?? 0;
  if (r.last_proven_height === undefined || r.last_proven_height === 0)
    return { level: "warn", label: "No proof yet", why: "The provider accepted the file but has not yet shown a storage proof. The first one is due within one proof interval." };
  const lag = height !== undefined ? height - r.last_proven_height : 0;
  const slow = p.proof_interval_blocks * 3;
  if (missed >= Math.max(1, p.max_missed_proofs - 1))
    return { level: "bad", label: "At risk", why: `The provider has missed ${missed} proofs; at ${p.max_missed_proofs} it is penalised and loses the copy.` };
  if (lag > slow * 3) return { level: "bad", label: "Overdue", why: `The last proof was ${fmtAgo(lag)}, much longer than the expected interval (every ${fmtDuration(p.proof_interval_blocks)}).` };
  if (missed > 0 || lag > slow) return { level: "warn", label: "Slow", why: `Last proof ${fmtAgo(lag)}${missed ? `; ${missed} proof${missed === 1 ? "" : "s"} missed so far` : ""}. Proofs are expected every ${fmtDuration(p.proof_interval_blocks)}.` };
  return { level: "ok", label: "Healthy", why: `The provider proved it still holds the file ${fmtAgo(lag)}.` };
}

const rank: Record<Level, number> = { ok: 0, idle: 1, warn: 2, bad: 3 };

export function dealHealth(d: Deal, height: number | undefined, p: P): Health {
  switch (d.status) {
    case "pending":
      return { level: "warn", label: "Waiting to start", why: "The deal is open but no provider has confirmed storing the file yet." };
    case "closed":
      return { level: "idle", label: "Completed", why: "The storage term ended and the providers were paid." };
    case "failed":
      return { level: "bad", label: "Failed", why: "The term ended and no provider earned payment (nobody proved they stored the file)." };
    case "cancelled":
      return { level: "idle", label: "Cancelled", why: "The owner cancelled this deal before it finished." };
  }
  const reps = (d.replicas ?? []).map((r) => replicaHealth(r, height, p));
  const good = reps.filter((r) => r.level === "ok").length;
  if (!reps.length) return { level: "warn", label: "No copies yet", why: "No provider has been assigned to store this file yet." };
  if (good < d.min_replicas) {
    const worst = reps.reduce((a, b) => (rank[b.level] > rank[a.level] ? b : a));
    return {
      level: worst.level === "bad" ? "bad" : "warn",
      label: good === 0 ? "No healthy copy" : "Fewer copies than wanted",
      why: `${good} of ${d.replication} copies are proven healthy; the deal wants at least ${d.min_replicas}.`,
    };
  }
  const slow = reps.some((r) => r.level !== "ok");
  return { level: slow ? "warn" : "ok", label: slow ? "Healthy, one copy slow" : "Healthy", why: `${good} of ${d.replication} copies are proven healthy (at least ${d.min_replicas} needed).` };
}

export interface NetworkHealth {
  level: Level;
  headline: string;
  details: string[];
}

export function networkHealth(i: { nodeUp: boolean; providers: Provider[]; deals: Deal[]; height?: number; params?: P }): NetworkHealth {
  if (!i.nodeUp) return { level: "bad", headline: "The network node is not reachable", details: ["This explorer cannot reach the devnet node right now. The devnet may be restarting; it will reconnect on its own."] };
  const details: string[] = [];
  const active = i.providers.filter((p) => p.status === "active").length;
  if (!active) details.push("No storage provider is active, so new files cannot be stored.");
  let atRisk = 0;
  if (i.params) {
    for (const d of i.deals) if (d.status === "open" && dealHealth(d, i.height, i.params).level === "bad") atRisk++;
    if (atRisk) details.push(`${atRisk} open deal${atRisk === 1 ? " has" : "s have"} no healthy copy.`);
  }
  if (!active || atRisk) return { level: active ? "warn" : "bad", headline: "Some things need attention", details };
  return { level: "ok", headline: "Everything looks healthy", details: [`${active} storage provider${active === 1 ? " is" : "s are"} online and the chain is producing blocks.`] };
}
