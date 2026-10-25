import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AutoRefresh } from "@/components/AutoRefresh";
import { CopyButton } from "@/components/CopyButton";
import { Addr, Card, Empty, EncBadge, ErrorBox, HealthPill, Jargon, PageHead, StatusBadge } from "@/components/ui";
import { NotFound, getDeals, getGrants, getManifest, getNodeInfo, getParams, getTx, settle } from "@/lib/api";
import { fmtAgo, fmtBytes, fmtWhen, vault } from "@/lib/format";
import { dealHealth } from "@/lib/health";
import { SITES, uploadFileUrl } from "@/lib/links";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ root: string }> }): Promise<Metadata> {
  const { root } = await params;
  return { title: `File ${root.slice(0, 10)}…` };
}

export default async function FilePage({ params }: { params: Promise<{ root: string }> }) {
  const { root } = await params;
  if (!/^[0-9a-f]{64}$/.test(root)) notFound();
  let m;
  try {
    m = await getManifest(root);
  } catch (e) {
    if (e instanceof NotFound) {
      // A 64-hex address can also be a transaction hash.
      const tx = await settle(getTx(root).catch((x) => (x instanceof NotFound ? null : Promise.reject(x))));
      if (tx.ok && tx.value) redirect(`/tx/${root}`);
      notFound();
    }
    return (
      <>
        <PageHead title="File" crumbs={[["Files", "/files"], [root.slice(0, 10) + "…"]]} />
        <ErrorBox error={e instanceof Error ? e.message : String(e)} what="this file" />
      </>
    );
  }
  const [deals, grants, info, prm] = await Promise.all([settle(getDeals({ cid: root })), settle(getGrants(root)), settle(getNodeInfo()), settle(getParams())]);
  const height = info.ok ? info.value.height : undefined;
  const sp = prm.ok ? prm.value : { proof_interval_blocks: 10, max_missed_proofs: 3, accept_timeout_blocks: 20, price_per_gb_uvault: 0, max_object_bytes: 0, payment_denom_whitelist: [] };
  const D = deals.ok ? deals.value.slice().sort((a, b) => b.id - a.id) : [];
  const live = D.filter((d) => d.status === "open" || d.status === "pending");
  const replicas = live.flatMap((d) => d.replicas ?? []);
  const copies = replicas.filter((r) => r.status === "active").length;
  const everyone = grants.ok && grants.value.some((g) => g.grantee === "*");
  const headline = live.length ? dealHealth(live[0], height, sp) : undefined;

  return (
    <>
      <PageHead
        crumbs={[["Files", "/files"], [m.name || m.root.slice(0, 10) + "…"]]}
        title={<>{m.name || "Unnamed file"} <EncBadge enc={m.encryption} /></>}
        sub={`${fmtBytes(m.size)} · ${m.mime || "unknown type"} · added ${height !== undefined ? fmtAgo(height - m.height) : `at block ${m.height}`}`}
        actions={
          <div className="row">
            <CopyButton page label="Copy link" />
            <AutoRefresh seconds={15} />
          </div>
        }
      />

      {headline ? (
        <div className={`health ${headline.level}`} role="status">
          <span className="ico" aria-hidden="true">{{ ok: "✅", warn: "⚠️", bad: "⛔", idle: "ℹ️" }[headline.level]}</span>
          <div>
            <strong>{headline.level === "ok" ? "This file is safely stored" : headline.label}</strong>
            <p>{copies} healthy {copies === 1 ? "copy" : "copies"} held by storage providers. {headline.why}</p>
          </div>
        </div>
      ) : (
        <div className="health warn" role="status">
          <span className="ico" aria-hidden="true">⚠️</span>
          <div>
            <strong>Nobody is currently paid to store this file</strong>
            <p>The file record exists on the chain, but there is no active storage deal. Its bytes may no longer be available.</p>
          </div>
        </div>
      )}

      <div className="grid cols-2">
        <Card title="Details">
          <dl className="kv">
            <dt><Jargon k="root">File ID</Jargon></dt>
            <dd><span className="idline"><span className="mono">{m.root}</span><CopyButton value={m.root} what="file ID" /></span></dd>
            <dt>Owner</dt>
            <dd><Addr a={m.owner} n={12} /></dd>
            <dt>Size</dt>
            <dd>{fmtBytes(m.size)} <span className="muted">({m.size.toLocaleString("en-US")} bytes, {Math.ceil(m.size / m.chunk_size)} <Jargon k="chunk">{Math.ceil(m.size / m.chunk_size) === 1 ? "chunk" : "chunks"}</Jargon>)</span></dd>
            <dt><Jargon k="mime">File type</Jargon></dt>
            <dd>{m.mime || "–"}</dd>
            <dt><Jargon k="encryption">Privacy</Jargon></dt>
            <dd>{m.encryption ? <>Encrypted in the owner&apos;s browser <span className="muted">({m.encryption}{m.key_envelope ? ", with an owner key" : ""})</span></> : "Public: not encrypted"}</dd>
            <dt>Registered</dt>
            <dd>block {m.height.toLocaleString("en-US")}</dd>
          </dl>
        </Card>
        <Card title="How to download this file">
          <p>
            The explorer shows what is on the chain. To get the file itself you need a vault: downloads are authorised by a signature from your key, which never leaves your browser.
          </p>
          <ol className="step-list">
            <li>Open the upload app and unlock your profile.</li>
            <li>
              {m.owner ? "If you own the file, find it under " : "Find it under "}<strong>My files</strong>; if someone shared it with you, look under <strong>Shared with me</strong>.
            </li>
            <li>Press <strong>Download</strong>{m.encryption ? " (it is decrypted for you in the browser)" : ""}.</li>
          </ol>
          {m.encryption && !everyone ? <p className="muted small" style={{ marginTop: 10 }}>This file is encrypted and not shared with everyone, so only its owner and the addresses listed below can read it.</p> : null}
          <p className="row" style={{ marginTop: 12 }}>
            <a className="btn primary" href={uploadFileUrl(m.root)} target="_blank" rel="noopener noreferrer">Open in the upload app ↗</a>
            <a className="btn" href={SITES.vault} target="_blank" rel="noopener noreferrer">Open the web vault ↗</a>
          </p>
        </Card>
      </div>

      <Card title="Storage deals" id="deals" aside={<span className="muted small">{D.length} in total</span>}>
        {!deals.ok ? (
          <ErrorBox error={deals.error} what="deals" />
        ) : D.length === 0 ? (
          <Empty title="No storage deals">Nobody is paid to store this file.</Empty>
        ) : (
          <div className="tablewrap">
            <table className="t">
              <thead>
                <tr><th>Deal</th><th>Status</th><th>Health</th><th>Paid</th><th>Copies</th><th>Ends</th></tr>
              </thead>
              <tbody>
                {D.map((d) => (
                  <tr key={d.id}>
                    <td data-label="Deal"><Link href={`/deals/${d.id}`}>#{d.id}</Link></td>
                    <td data-label="Status"><StatusBadge status={d.status} /></td>
                    <td data-label="Health"><HealthPill h={dealHealth(d, height, sp)} /></td>
                    <td data-label="Paid">{vault(d.payment.amount)}</td>
                    <td data-label="Copies">{(d.replicas ?? []).filter((r) => r.status === "active").length} of {d.replication}</td>
                    <td data-label="Ends">{["closed", "failed", "cancelled"].includes(d.status) ? "Ended" : fmtWhen(d.expire_height, height)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title={<>Who can read it</>} id="grants">
        {!grants.ok ? (
          <ErrorBox error={grants.error} what="sharing information" />
        ) : (
          <>
            <p>
              <Addr a={m.owner} n={10} /> <span className="pill idle nodot">Owner</span>
            </p>
            {grants.value.length === 0 ? (
              <p className="muted">{m.encryption ? "Not shared with anyone else." : "Nobody else has been given access."}</p>
            ) : (
              <ul className="results">
                {grants.value.map((g) => (
                  <li key={g.id}>
                    <span className="row" style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12, padding: "10px 14px" }}>
                      {g.grantee === "*" ? <strong>Everyone</strong> : <Addr a={g.grantee} n={10} />}
                      <span className="pill info nodot">{g.capability}</span>
                      <span className="muted small">{g.expiry_height && height !== undefined ? `expires ${fmtWhen(g.expiry_height, height)}` : "no expiry"}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Card>
    </>
  );
}
