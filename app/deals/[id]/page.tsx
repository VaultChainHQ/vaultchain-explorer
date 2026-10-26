import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AutoRefresh } from "@/components/AutoRefresh";
import { CopyButton } from "@/components/CopyButton";
import { Addr, Card, Empty, EncBadge, ErrorBox, HealthPill, Jargon, TermNote, PageHead, Root, StatusBadge } from "@/components/ui";
import { NotFound, getDeal, getManifest, getNodeInfo, getParams, getProofs, settle } from "@/lib/api";
import { fmtAgo, fmtBytes, fmtDuration, fmtWhen, vault } from "@/lib/format";
import { dealHealth, replicaHealth } from "@/lib/health";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  return { title: `Deal #${(await params).id}` };
}

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d{1,12}$/.test(id)) notFound();
  let d;
  try {
    d = await getDeal(id);
  } catch (e) {
    if (e instanceof NotFound) notFound();
    return (
      <>
        <PageHead title={`Deal #${id}`} crumbs={[["Deals", "/deals"], [`#${id}`]]} />
        <ErrorBox error={e instanceof Error ? e.message : String(e)} what="this deal" />
      </>
    );
  }
  const [info, prm, proofs, man] = await Promise.all([settle(getNodeInfo()), settle(getParams()), settle(getProofs()), settle(getManifest(d.cid))]);
  const height = info.ok ? info.value.height : undefined;
  const sp = prm.ok ? prm.value : { proof_interval_blocks: 10, max_missed_proofs: 3, accept_timeout_blocks: 20, price_per_gb_uvault: 0, max_object_bytes: 0, payment_denom_whitelist: [] };
  const dealProofs = proofs.ok ? proofs.value.filter((p) => p.deal_id === d.id).sort((a, b) => b.height - a.height) : [];
  const replicas = d.replicas ?? [];
  const health = dealHealth(d, height, sp);
  const ended = ["closed", "failed", "cancelled"].includes(d.status);
  const span = Math.max(1, d.expire_height - d.start_height);
  const pct = ended ? 100 : height === undefined ? 0 : Math.min(100, Math.max(0, Math.round(((height - d.start_height) / span) * 100)));
  const accepted = replicas.map((r) => r.accepted_height).filter((x): x is number => !!x);
  const lastProof = Math.max(0, ...replicas.map((r) => r.last_proven_height ?? 0));
  const name = man.ok ? man.value.name : "";

  return (
    <>
      <PageHead
        crumbs={[["Deals", "/deals"], [`#${d.id}`]]}
        title={
          <>
            Deal #{d.id} <StatusBadge status={d.status} />
          </>
        }
        sub={<>Keeps {name ? <Link href={`/files/${d.cid}`}>{name}</Link> : <Link href={`/files/${d.cid}`}>a file</Link>} ({fmtBytes(d.size)}) stored by {d.replication} {d.replication === 1 ? "provider" : "providers"}.</>}
        actions={
          <div className="row">
            <CopyButton page label="Copy link" />
            <AutoRefresh seconds={10} />
          </div>
        }
      />

      <div className={`health ${health.level}`} role="status">
        <span className="ico" aria-hidden="true">{{ ok: "✅", warn: "⚠️", bad: "⛔", idle: "ℹ️", info: "ℹ️" }[health.level]}</span>
        <div>
          <strong>{health.label}</strong>
          <p>{health.why}</p>
        </div>
      </div>

      <div className="grid cols-2">
        <Card title="Summary">
          <dl className="kv">
            <dt>File</dt>
            <dd>
              <Root r={d.cid} n={14} /> {man.ok ? <EncBadge enc={man.value.encryption} /> : null}
            </dd>
            <dt>Owner</dt>
            <dd><Addr a={d.owner} n={12} /></dd>
            <dt><Jargon k="escrow">Total paid</Jargon></dt>
            <dd>
              {vault(d.payment.amount)}
              {d.per_replica_payment ? <span className="muted"> ({vault(d.per_replica_payment.amount)} per copy)</span> : null}
            </dd>
            <dt><Jargon k="replica">Copies</Jargon></dt>
            <dd>
              {d.replication} requested, at least {d.min_replicas} must stay healthy
            </dd>
            <dt>Term</dt>
            <dd>{fmtDuration(span)} (blocks {d.start_height.toLocaleString("en-US")} – {d.expire_height.toLocaleString("en-US")}) <TermNote d={d} /></dd>
            <dt>Type</dt>
            <dd>{d.class}</dd>
          </dl>
        </Card>
        <Card title="Timeline">
          <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Share of the storage term that has passed">
            <span style={{ width: `${pct}%` }} />
          </div>
          <p className="muted small" style={{ marginTop: 6 }}>{ended ? "The storage term is over." : `${pct}% of the term has passed${height !== undefined ? `, ${fmtWhen(d.expire_height, height).replace(/^in /, "")} to go` : ""}.`}</p>
          <ol className="timeline">
            <li className="done">
              <strong>Deal opened</strong>
              <small>{height !== undefined ? fmtAgo(height - d.start_height) : `block ${d.start_height}`}</small>
            </li>
            <li className={accepted.length ? "done" : "warn"}>
              <strong>{accepted.length ? `${accepted.length} of ${d.replication} providers confirmed` : "Waiting for providers to confirm"}</strong>
              <small>{accepted.length && height !== undefined ? `first one ${fmtAgo(height - Math.min(...accepted))}` : "A provider must fetch and confirm the file first"}</small>
            </li>
            <li className={lastProof ? "done" : "warn"}>
              <strong>{lastProof ? "Latest storage proof" : "No proof yet"}</strong>
              <small>{lastProof && height !== undefined ? fmtAgo(height - lastProof) : "Proofs start once a provider has confirmed"}</small>
            </li>
            <li className={ended ? "done" : ""}>
              <strong>{ended ? "Ended" : "Storage ends"}</strong>
              <small>{ended ? "Providers were paid for the proofs they delivered" : fmtWhen(d.expire_height, height)}</small>
            </li>
          </ol>
        </Card>
      </div>

      <Card title={<>Copies and <Jargon k="proof">proof</Jargon> status</>} id="copies">
        {replicas.length === 0 ? (
          <Empty title="No copies yet">The chain has not assigned a provider to this deal.</Empty>
        ) : (
          <div className="tablewrap">
            <table className="t">
              <caption className="sr-only">Copies of the file and their latest proofs</caption>
              <thead>
                <tr>
                  <th>Copy</th>
                  <th><Jargon k="provider">Provider</Jargon></th>
                  <th>Status</th>
                  <th>Health</th>
                  <th>Latest proof</th>
                  <th>Missed</th>
                </tr>
              </thead>
              <tbody>
                {replicas.map((r) => {
                  const h = replicaHealth(r, height, sp);
                  return (
                    <tr key={r.slot}>
                      <td data-label="Copy">#{r.slot + 1}</td>
                      <td data-label="Provider"><Link href={`/providers/${r.provider}`} className="mono" title={r.provider}>{r.provider.slice(0, 10)}…{r.provider.slice(-6)}</Link></td>
                      <td data-label="Status"><StatusBadge status={r.status} /></td>
                      <td data-label="Health"><HealthPill h={h} /></td>
                      <td data-label="Latest proof">{r.last_proven_height && height !== undefined ? fmtAgo(height - r.last_proven_height) : "none yet"}</td>
                      <td data-label="Missed">{r.missed_proofs ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title={`Recent proofs (${dealProofs.length} in total)`} id="proofs">
        {dealProofs.length === 0 ? (
          <Empty title="No proofs yet">Providers prove they hold the file every {fmtDuration(sp.proof_interval_blocks)}. The first one appears shortly after a provider confirms.</Empty>
        ) : (
          <div className="tablewrap">
            <table className="t">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Block</th>
                  <th><Jargon k="epoch">Round</Jargon></th>
                  <th>Provider</th>
                  <th><Jargon k="chunk">Piece checked</Jargon></th>
                </tr>
              </thead>
              <tbody>
                {dealProofs.slice(0, 15).map((p) => (
                  <tr key={p.id}>
                    <td data-label="When">{height !== undefined ? fmtAgo(height - p.height) : "–"}</td>
                    <td data-label="Block" className="mono">{p.height.toLocaleString("en-US")}</td>
                    <td data-label="Round">{p.epoch}</td>
                    <td data-label="Provider"><Addr a={p.provider} n={6} /></td>
                    <td data-label="Piece checked">#{p.chunk_index}</td>
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
