import { fmtVault } from "./format";

const NAMES: Record<string, string> = {
  "bank/Send": "Transfer",
  "storage/CommitManifest": "Register a file",
  "storage/OpenDeal": "Open a storage deal",
  "access/GrantAccess": "Share a file",
  "access/RevokeAccess": "Stop sharing a file",
};

export interface TxMsg {
  type: string;
  label: string;
  detail: string;
}

/** Best-effort plain-language summary of a transaction's messages. Unknown shapes just return nothing. */
export function describeTx(raw: string): TxMsg[] {
  let j: unknown;
  try {
    j = JSON.parse(raw);
  } catch {
    return [];
  }
  const root = j as { msgs?: unknown; tx?: { msgs?: unknown }; body?: { msgs?: unknown } };
  const msgs = root.msgs ?? root.tx?.msgs ?? root.body?.msgs;
  if (!Array.isArray(msgs)) return [];
  return msgs
    .filter((m): m is Record<string, unknown> => !!m && typeof m === "object" && typeof (m as { type?: unknown }).type === "string")
    .map((m) => {
      const type = String(m.type);
      let detail = "";
      if (type === "bank/Send") {
        const amt = Array.isArray(m.amount) ? (m.amount as { denom?: string; amount?: string }[]) : [];
        const a = amt.find((c) => c.denom === "uvault");
        detail = `${a ? `${fmtVault(a.amount ?? "0")} VAULT` : "tokens"} to ${String(m.to ?? "").slice(0, 14)}…`;
      }
      return { type, label: NAMES[type] ?? type, detail };
    });
}
