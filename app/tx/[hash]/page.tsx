import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/CopyButton";
import { Card, ErrorBox, PageHead } from "@/components/ui";
import { SearchBox } from "@/components/SearchBox";
import { NotFound, getNodeInfo, getTx, settle } from "@/lib/api";
import { fmtAgo } from "@/lib/format";
import { describeTx } from "@/lib/tx";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Transaction" };

export default async function TxPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  if (!/^[0-9a-fA-F]{64}$/.test(hash)) notFound();
  let tx;
  try {
    tx = await getTx(hash.toLowerCase());
  } catch (e) {
    if (e instanceof NotFound)
      return (
        <>
          <PageHead title="Transaction not found" crumbs={[["Explorer", "/"], ["Transaction"]]} />
          <Card>
            <p>No transaction with this hash is known to the node.</p>
            <ul>
              <li>If you just sent it, wait a few seconds (a block takes about 3 seconds) and reload.</li>
              <li>The node only keeps recent transactions, so older ones may have been pruned.</li>
              <li>If the devnet was reset, transactions from before the reset are gone.</li>
            </ul>
            <p className="mono small" style={{ overflowWrap: "anywhere" }}>{hash}</p>
            <SearchBox />
          </Card>
        </>
      );
    return <ErrorBox error={e instanceof Error ? e.message : String(e)} what="this transaction" />;
  }
  const info = await settle(getNodeInfo());
  const height = info.ok ? info.value.height : undefined;
  const msgs = describeTx(tx.raw);
  let pretty = tx.raw;
  try {
    pretty = JSON.stringify(JSON.parse(tx.raw), null, 2);
  } catch {
    /* keep raw */
  }
  return (
    <>
      <PageHead
        crumbs={[["Explorer", "/"], ["Transaction"]]}
        title={<>Transaction <span className={`pill ${tx.ok ? "ok" : "bad"}`}>{tx.ok ? "Succeeded" : "Failed"}</span></>}
        sub={`Included in block ${tx.height.toLocaleString("en-US")}${height !== undefined ? `, ${fmtAgo(height - tx.height)}` : ""}.`}
        actions={<CopyButton page label="Copy link" />}
      />
      <Card title="Summary">
        <dl className="kv">
          <dt>Hash</dt>
          <dd><span className="idline"><span className="mono">{tx.hash}</span><CopyButton value={tx.hash} what="hash" /></span></dd>
          <dt>What it did</dt>
          <dd>{msgs.length ? <ul style={{ margin: 0, paddingLeft: 18 }}>{msgs.map((m, i) => <li key={i}>{m.label}{m.detail ? ` — ${m.detail}` : ""}</li>)}</ul> : "See the technical details below."}</dd>
          <dt>Result</dt>
          <dd>{tx.result || (tx.ok ? "ok" : "failed")}</dd>
          <dt>Position</dt>
          <dd>block {tx.height.toLocaleString("en-US")}, transaction #{tx.index}</dd>
        </dl>
      </Card>
      <Card title="Technical details">
        <details>
          <summary style={{ cursor: "pointer" }}>Show the raw transaction</summary>
          <p><CopyButton value={pretty} label="Copy JSON" what="" /></p>
          <pre className="json">{pretty}</pre>
        </details>
      </Card>
    </>
  );
}
