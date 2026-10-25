import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AutoRefresh } from "@/components/AutoRefresh";
import { CopyButton } from "@/components/CopyButton";
import { Card, Empty, EncBadge, ErrorBox, Jargon, PageHead, Root, Stat, StatusBadge } from "@/components/ui";
import { getAccount, getBalances, getDeals, getManifests, getNodeInfo, settle } from "@/lib/api";
import { ADDRESS_RE, fmtAgo, fmtBytes, vault } from "@/lib/format";
import { SITES } from "@/lib/links";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Account" };

export default async function AccountPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  if (!ADDRESS_RE.test(address)) notFound();
  const [bal, acct, files, deals, info] = await Promise.all([settle(getBalances(address)), settle(getAccount(address)), settle(getManifests(address)), settle(getDeals({ owner: address })), settle(getNodeInfo())]);
  const height = info.ok ? info.value.height : undefined;
  const uv = bal.ok ? (bal.value.find((c) => c.denom === "uvault")?.amount ?? "0") : undefined;
  const F = files.ok ? files.value.slice().sort((a, b) => b.height - a.height) : [];
  const D = deals.ok ? deals.value.slice().sort((a, b) => b.id - a.id) : [];
  const unseen = bal.ok && uv === "0" && acct.ok && acct.value.nonce === 0 && !F.length && !D.length;
  return (
    <>
      <PageHead
        crumbs={[["Accounts", "/account"], [address.slice(0, 10) + "…"]]}
        title="Account"
        sub={<span className="idline"><span className="mono">{address}</span><CopyButton value={address} what="address" /></span>}
        actions={<div className="row"><CopyButton page label="Copy link" /><AutoRefresh seconds={15} /></div>}
      />
      {unseen ? (
        <div className="callout">
          <strong>This address has no activity yet.</strong> It has no balance, files or transactions on this devnet. If it is yours, get free test tokens with <a href={SITES.upload}>the upload app</a> or the <a href={SITES.vault}>web vault</a>.
        </div>
      ) : null}
      {!bal.ok ? <ErrorBox error={bal.error} what="the balance" /> : null}
      <div className="grid cols-4" style={{ marginBottom: 18 }}>
        <Stat k={<Jargon k="vault">Balance</Jargon>} v={uv !== undefined ? vault(uv) : "–"} note={uv && uv !== "0" ? `${Number(uv).toLocaleString("en-US")} uvault` : undefined} />
        <Stat k="Files" v={F.length} note={fmtBytes(F.reduce((n, m) => n + m.size, 0))} to={`/files?owner=${address}`} />
        <Stat k="Storage deals" v={D.length} note={`${D.filter((d) => d.status === "open").length} active`} to={`/deals?owner=${address}`} />
        <Stat k={<Jargon k="nonce">Transactions sent</Jargon>} v={acct.ok ? acct.value.nonce : "–"} note={acct.ok && acct.value.pending_nonce !== acct.value.nonce ? `${acct.value.pending_nonce - acct.value.nonce} pending` : undefined} />
      </div>
      <Card title="Files owned" id="files">
        {!files.ok ? <ErrorBox error={files.error} what="files" /> : F.length === 0 ? <Empty title="No files">This account has not uploaded anything.</Empty> : (
          <div className="tablewrap">
            <table className="t">
              <thead><tr><th>Name</th><th>Privacy</th><th>Size</th><th>File ID</th><th>Added</th></tr></thead>
              <tbody>
                {F.map((m) => (
                  <tr key={m.root}>
                    <td data-label="Name"><Link href={`/files/${m.root}`}>{m.name || "(unnamed)"}</Link></td>
                    <td data-label="Privacy"><EncBadge enc={m.encryption} /></td>
                    <td data-label="Size" className="num">{fmtBytes(m.size)}</td>
                    <td data-label="File ID"><Root r={m.root} n={6} /></td>
                    <td data-label="Added">{height !== undefined ? fmtAgo(height - m.height) : m.height}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Card title="Storage deals opened" id="deals">
        {!deals.ok ? <ErrorBox error={deals.error} what="deals" /> : D.length === 0 ? <Empty title="No deals">This account has not paid for storage.</Empty> : (
          <div className="tablewrap">
            <table className="t">
              <thead><tr><th>Deal</th><th>Status</th><th>Size</th><th>Paid</th></tr></thead>
              <tbody>
                {D.map((d) => (
                  <tr key={d.id}>
                    <td data-label="Deal"><Link href={`/deals/${d.id}`}>#{d.id}</Link></td>
                    <td data-label="Status"><StatusBadge status={d.status} /></td>
                    <td data-label="Size" className="num">{fmtBytes(d.size)}</td>
                    <td data-label="Paid" className="num">{vault(d.payment.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
