import Link from "next/link";
import { LiveHeight } from "@/components/LiveHeight";
import { Addr, Badge, Card, Empty, ErrorBox, Root } from "@/components/ui";
import { getDeals, getManifests, getNodeInfo, getParams, getProofs, getProviderStatus, getProviders, settle } from "@/lib/api";
import { fmtBytes, fmtVault } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [info, params, providers, deals, manifests, proofs, pstat] = await Promise.all([
    settle(getNodeInfo()),
    settle(getParams()),
    settle(getProviders()),
    settle(getDeals()),
    settle(getManifests()),
    settle(getProofs()),
    getProviderStatus(),
  ]);

  if (!info.ok) return <ErrorBox error={info.error} />;
  const height = info.value.height;

  // The node has no block-listing endpoint, so "recent activity" is derived from on-chain records.
  type Ev = { height: number; kind: string; node: React.ReactNode };
  const events: Ev[] = [];
  if (manifests.ok)
    for (const m of manifests.value)
      events.push({ height: m.height, kind: "manifest", node: <>{m.name || "(unnamed)"} committed ({fmtBytes(m.size)}) <Root r={m.root} /></> });
  if (deals.ok)
    for (const d of deals.value)
      events.push({ height: d.start_height, kind: "deal", node: <>deal <Link href={`/deals/${d.id}`}>#{d.id}</Link> opened by <Addr a={d.owner} /></> });
  if (proofs.ok)
    for (const p of proofs.value)
      events.push({ height: p.height, kind: "proof", node: <>proof for deal <Link href={`/deals/${p.deal_id}`}>#{p.deal_id}</Link> from <Addr a={p.provider} /> (chunk {p.chunk_index})</> });
  events.sort((a, b) => b.height - a.height);

  return (
    <>
      <div className="grid">
        <Card title="Chain">
          <p>
            <span className="muted">Chain id</span> <b className="mono">{info.value.chainId}</b>
          </p>
          <p>
            <span className="muted">Software</span> <span className="mono">vaultd {info.value.appVersion}</span> (timer consensus, devnet)
          </p>
          <LiveHeight initial={height} />
        </Card>
        <Card title="Network">
          <p>
            <span className="muted">Providers</span> <b>{providers.ok ? providers.value.length : "?"}</b> ({providers.ok ? providers.value.filter((p) => p.status === "active").length : "?"} active)
          </p>
          <p>
            <span className="muted">Deals</span> <b>{deals.ok ? deals.value.length : "?"}</b> ({deals.ok ? deals.value.filter((d) => d.status === "open").length : "?"} open)
          </p>
          <p>
            <span className="muted">Files (manifests)</span> <b>{manifests.ok ? manifests.value.length : "?"}</b>
          </p>
          <p>
            <span className="muted">Proofs recorded</span> <b>{proofs.ok ? proofs.value.length : "?"}</b>
          </p>
          {params.ok && (
            <p className="muted small">
              price {fmtVault(String(params.value.price_per_gb_uvault))} VAULT per GB · proof every {params.value.proof_interval_blocks} blocks · accept within {params.value.accept_timeout_blocks} blocks
            </p>
          )}
          <p className="muted small">
            provider endpoint: {pstat ? `${pstat.status}, ${pstat.version}, holds ${pstat.objects} object(s)` : "unreachable"}
          </p>
        </Card>
      </div>
      <Card title="Recent on-chain activity">
        {events.length === 0 ? (
          <Empty>No activity yet.</Empty>
        ) : (
          <table className="t">
            <thead>
              <tr>
                <th>Height</th>
                <th>Kind</th>
                <th>What</th>
              </tr>
            </thead>
            <tbody>
              {events.slice(0, 15).map((e, i) => (
                <tr key={i}>
                  <td className="mono">{e.height}</td>
                  <td>
                    <Badge status={e.kind} />
                  </td>
                  <td>{e.node}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="muted small">The node exposes no block-listing endpoint, so this feed is built from manifests, deals and storage proofs, newest first.</p>
      </Card>
    </>
  );
}
