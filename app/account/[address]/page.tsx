import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, Empty, ErrorBox, Root } from "@/components/ui";
import { getAccount, getBalances, getDeals, getManifests, settle } from "@/lib/api";
import { fmtBytes, fmtVault } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AccountPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  if (!/^vault1[0-9a-z]{20,80}$/.test(address)) notFound();
  const [bal, acct, files, deals] = await Promise.all([settle(getBalances(address)), settle(getAccount(address)), settle(getManifests(address)), settle(getDeals({ owner: address }))]);
  return (
    <>
      <Card title="Account">
        <p className="mono wrap-any">{address}</p>
        {!bal.ok ? (
          <ErrorBox error={bal.error} />
        ) : bal.value.length === 0 ? (
          <p>
            <span className="muted">Balance</span> <b>0 VAULT</b> <span className="muted small">(no funds, or the address has never been used)</span>
          </p>
        ) : (
          bal.value.map((c) => (
            <p key={c.denom}>
              <span className="muted">Balance</span> <b>{c.denom === "uvault" ? `${fmtVault(c.amount)} VAULT` : `${c.amount} ${c.denom}`}</b>{" "}
              <span className="muted small">({c.amount} {c.denom})</span>
            </p>
          ))
        )}
        {acct.ok && (
          <p className="muted">
            nonce {acct.value.nonce}
            {acct.value.pending_nonce !== acct.value.nonce ? ` (${acct.value.pending_nonce} with pending txs)` : ""}
          </p>
        )}
      </Card>
      <Card title="Files owned">
        {!files.ok ? (
          <ErrorBox error={files.error} />
        ) : files.value.length === 0 ? (
          <Empty>None.</Empty>
        ) : (
          <ul>
            {files.value.map((m) => (
              <li key={m.root}>
                {m.name || "(unnamed)"} · {fmtBytes(m.size)} · <Root r={m.root} /> {m.encryption && <Badge status="encrypted" />}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="Deals opened">
        {!deals.ok ? (
          <ErrorBox error={deals.error} />
        ) : deals.value.length === 0 ? (
          <Empty>None.</Empty>
        ) : (
          <ul>
            {deals.value.map((d) => (
              <li key={d.id}>
                <Link href={`/deals/${d.id}`}>deal #{d.id}</Link> <Badge status={d.status} /> {fmtBytes(d.size)} · {fmtVault(d.payment.amount)} VAULT
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
