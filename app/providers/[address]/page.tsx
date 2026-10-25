import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/CopyButton";
import { Card, Empty, ErrorBox, HealthPill, Jargon, PageHead, StatusBadge } from "@/components/ui";
import { NotFound, getDeals, getNodeInfo, getParams, getProvider, getProviderStatus, settle } from "@/lib/api";
import { fmtBytes, vault } from "@/lib/format";
import { replicaHealth } from "@/lib/health";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Storage provider" };

export default async function ProviderPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  if (!/^vault1[0-9a-z]{20,80}$/.test(address)) notFound();
  let p;
  try {
    p = await getProvider(address);
  } catch (e) {
    if (e instanceof NotFound) notFound();
    return <ErrorBox error={e instanceof Error ? e.message : String(e)} what="this provider" />;
  }
  const [deals, live, info, prm] = await Promise.all([settle(getDeals({ provider: address })), getProviderStatus(), settle(getNodeInfo()), settle(getParams())]);
  const height = info.ok ? info.value.height : undefined;
  const sp = prm.ok ? prm.value : { proof_interval_blocks: 10, max_missed_proofs: 3, accept_timeout_blocks: 20, price_per_gb_uvault: 0, max_object_bytes: 0, payment_denom_whitelist: [] };
  const isThis = live && live.address === address;
  const used = Math.max(0, p.capacity - p.free_bytes);
  const pct = p.capacity ? Math.round((used / p.capacity) * 100) : 0;
  const D = deals.ok ? deals.value.slice().sort((a, b) => b.id - a.id) : [];
  return (
    <>
      <PageHead crumbs={[["Providers", "/providers"], [address.slice(0, 10) + "…"]]} title={<>Storage provider <StatusBadge status={p.status} /></>} sub={<span className="idline"><span className="mono">{p.address}</span><CopyButton value={p.address} what="address" /></span>} />
      <div className="grid cols-2">
        <Card title="Capacity">
          <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Share of capacity in use"><span style={{ width: `${pct}%` }} /></div>
          <p className="muted small" style={{ marginTop: 6 }}>{fmtBytes(used)} used of {fmtBytes(p.capacity)} ({fmtBytes(p.free_bytes)} free)</p>
          <dl className="kv">
            <dt><Jargon k="collateral">Collateral</Jargon></dt><dd>{p.collateral ? vault(p.collateral.amount) : "–"}</dd>
            <dt>Endpoint</dt><dd className="mono small">{p.endpoint}</dd>
            {isThis && live ? (<><dt>Live check</dt><dd>{live.status} · version {live.version} · {live.objects} object{live.objects === 1 ? "" : "s"} stored</dd></>) : null}
          </dl>
        </Card>
        <Card title="Why this matters">
          <p className="muted">A provider only earns payment for the copies it keeps proving. If it stops answering, those copies are marked failed and other providers can take over.</p>
        </Card>
      </div>
      <Card title="Deals this provider holds" id="deals">
        {!deals.ok ? <ErrorBox error={deals.error} what="deals" /> : D.length === 0 ? <Empty title="No deals">This provider is not storing anything yet.</Empty> : (
          <div className="tablewrap">
            <table className="t">
              <thead><tr><th>Deal</th><th>Status</th><th>Size</th><th>This copy</th></tr></thead>
              <tbody>
                {D.map((d) => {
                  const r = (d.replicas ?? []).find((x) => x.provider === address);
                  return (
                    <tr key={d.id}>
                      <td data-label="Deal"><Link href={`/deals/${d.id}`}>#{d.id}</Link></td>
                      <td data-label="Status"><StatusBadge status={d.status} /></td>
                      <td data-label="Size">{fmtBytes(d.size)}</td>
                      <td data-label="This copy">{r ? <HealthPill h={replicaHealth(r, height, sp)} /> : "–"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
