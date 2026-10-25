import Link from "next/link";
import { notFound } from "next/navigation";
import { Addr, Badge, Card, Empty, ErrorBox, Root } from "@/components/ui";
import { NotFound, getDeal, getManifest, getNodeInfo, getParams, getProofs, settle } from "@/lib/api";
import { fmtBytes, fmtVault } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d{1,12}$/.test(id)) notFound();
  let d;
  try {
    d = await getDeal(id);
  } catch (e) {
    if (e instanceof NotFound) notFound();
    return <ErrorBox error={e instanceof Error ? e.message : String(e)} />;
  }
  const [info, prm, proofs, man] = await Promise.all([settle(getNodeInfo()), settle(getParams()), settle(getProofs()), settle(getManifest(d.cid))]);
  const height = info.ok ? info.value.height : undefined;
  const interval = prm.ok ? prm.value.proof_interval_blocks : undefined;
  const dealProofs = proofs.ok ? proofs.value.filter((p) => p.deal_id === d.id).sort((a, b) => b.height - a.height) : [];
  const replicas = d.replicas ?? [];

  return (
    <>
      <Card title={`Deal #${d.id}`}>
        <p>
          <Badge status={d.status} /> <span className="muted">class</span> {d.class}
        </p>
        <p>
          <span className="muted">File</span> <Root r={d.cid} n={16} />
          {man.ok && <> · {man.value.name || "(unnamed)"}</>} · {fmtBytes(d.size)}
        </p>
        <p>
          <span className="muted">Owner</span> <Addr a={d.owner} /> · <span className="muted">Payment</span> {fmtVault(d.payment.amount)} VAULT
          {d.per_replica_payment ? ` (${fmtVault(d.per_replica_payment.amount)} per replica)` : ""}
        </p>
        <p>
          <span className="muted">Heights</span> start {d.start_height} · expires {d.expire_height}
          {height !== undefined && <> · now {height}</>} · <span className="muted">replication</span> {d.replication} (min {d.min_replicas})
        </p>
      </Card>
      <Card title="Replicas and proof status">
        {replicas.length === 0 ? (
          <Empty>No replicas assigned yet.</Empty>
        ) : (
          <table className="t">
            <thead>
              <tr>
                <th>Slot</th>
                <th>Provider</th>
                <th>Status</th>
                <th>Accepted</th>
                <th>Last proven</th>
                <th>Missed</th>
              </tr>
            </thead>
            <tbody>
              {replicas.map((r) => {
                const since = height !== undefined && r.last_proven_height ? height - r.last_proven_height : undefined;
                return (
                  <tr key={r.slot}>
                    <td>{r.slot}</td>
                    <td>
                      <Link href={`/providers/${r.provider}`} className="mono" title={r.provider}>
                        {r.provider.slice(0, 10)}…{r.provider.slice(-6)}
                      </Link>
                    </td>
                    <td>
                      <Badge status={r.status} />
                    </td>
                    <td className="mono">{r.accepted_height ?? "–"}</td>
                    <td className="mono">
                      {r.last_proven_height ? r.last_proven_height : "never"}
                      {since !== undefined && <span className="muted small"> ({since} blocks ago{interval ? `, interval ${interval}` : ""})</span>}
                    </td>
                    <td>{r.missed_proofs ?? 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
      <Card title={`Recent proofs (${dealProofs.length} total)`}>
        {dealProofs.length === 0 ? (
          <Empty>No proofs recorded for this deal yet.</Empty>
        ) : (
          <table className="t">
            <thead>
              <tr>
                <th>Height</th>
                <th>Epoch</th>
                <th>Provider</th>
                <th>Chunk</th>
              </tr>
            </thead>
            <tbody>
              {dealProofs.slice(0, 15).map((p) => (
                <tr key={p.id}>
                  <td className="mono">{p.height}</td>
                  <td>{p.epoch}</td>
                  <td>
                    <Addr a={p.provider} />
                  </td>
                  <td>{p.chunk_index}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
