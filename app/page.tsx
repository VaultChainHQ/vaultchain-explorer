import Link from "next/link";
import { AutoRefresh } from "@/components/AutoRefresh";
import { SearchBox } from "@/components/SearchBox";
import { Addr, Card, ErrorBox, Jargon, Stat } from "@/components/ui";
import { getDeals, getManifests, getNodeInfo, getParams, getProofs, getProviderStatus, getProviders, settle } from "@/lib/api";
import { fmtAgo, fmtBytes, vault } from "@/lib/format";
import { networkHealth } from "@/lib/health";
import { SITES } from "@/lib/links";

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
  const height = info.ok ? info.value.height : undefined;
  const P = providers.ok ? providers.value : [];
  const D = deals.ok ? deals.value : [];
  const M = manifests.ok ? manifests.value : [];
  const PR = proofs.ok ? proofs.value : [];
  const health = networkHealth({ nodeUp: info.ok, providers: P, deals: D, height, params: params.ok ? params.value : undefined });
  const open = D.filter((d) => d.status === "open").length;
  const stored = M.reduce((n, m) => n + m.size, 0);

  type Ev = { h: number; text: React.ReactNode; to: string };
  const events: Ev[] = [
    ...M.map((m) => ({ h: m.height, to: `/files/${m.root}`, text: <>File added: <strong>{m.name || "unnamed file"}</strong> ({fmtBytes(m.size)})</> })),
    ...D.map((d) => ({ h: d.start_height, to: `/deals/${d.id}`, text: <>Storage deal #{d.id} opened for {fmtBytes(d.size)}, paid {vault(d.payment.amount)}</> })),
    ...PR.map((p) => ({ h: p.height, to: `/deals/${p.deal_id}`, text: <>A provider proved it still stores the file in deal #{p.deal_id}</> })),
  ]
    .sort((a, b) => b.h - a.h)
    .slice(0, 8);

  const icon = { ok: "✅", warn: "⚠️", bad: "⛔", idle: "•" }[health.level];
  return (
    <>
      <section className="hero">
        <p className="eyebrow">VaultChain explorer</p>
        <h1>Check that your files are safely stored.</h1>
        <p className="lead">
          Look up any file, storage deal, provider or wallet on the VaultChain devnet. Everything here is public and read-only, so you don&apos;t need to sign in.
        </p>
        <SearchBox big />
        <p className="muted small" style={{ marginTop: 10 }}>
          Try a wallet address (<code>vault1…</code>), a deal number (<code>3</code>), a file name or a file ID. Press <kbd>/</kbd> anywhere to jump to search.
        </p>
      </section>

      <div className="page-head" style={{ marginTop: 26, marginBottom: 10 }}>
        <h2 style={{ margin: 0 }}>Network health</h2>
        <AutoRefresh seconds={10} />
      </div>
      <div className={`health ${health.level}`} role="status">
        <span className="ico" aria-hidden="true">{icon}</span>
        <div>
          <strong>{health.headline}</strong>
          {health.details.map((d) => (
            <p key={d}>{d}</p>
          ))}
        </div>
      </div>
      {!info.ok ? <ErrorBox error={info.error} what="the latest block" /> : null}
      <div className="grid cols-4" style={{ marginBottom: 18 }}>
        <Stat k={<Jargon k="height">Latest block</Jargon>} v={height !== undefined ? height.toLocaleString("en-US") : "–"} note={info.ok ? `Network ${info.value.chainId}` : undefined} />
        <Stat k={<Jargon k="provider">Storage providers</Jargon>} v={P.filter((p) => p.status === "active").length} note={`${P.length} registered`} to="/providers" />
        <Stat k="Files stored" v={M.length} note={fmtBytes(stored)} to="/files" />
        <Stat k={<Jargon k="deal">Active deals</Jargon>} v={open} note={`${D.length} in total`} to="/deals" />
      </div>
      {pstat ? null : <p className="muted small">The reference storage provider is not answering right now, so downloads may be unavailable for a moment.</p>}

      <h2>What you can do here</h2>
      <div className="grid cols-4" style={{ marginBottom: 22 }}>
        <Link className="tile" href="/files">
          <span className="e" aria-hidden="true">📄</span>
          <span className="t">Find a file</span>
          <span className="d">Browse uploads, see who owns them, their size and whether they are encrypted.</span>
        </Link>
        <Link className="tile" href="/deals">
          <span className="e" aria-hidden="true">🤝</span>
          <span className="t">Check a file&apos;s health</span>
          <span className="d">Open a storage deal to see its copies, recent proofs and when it expires.</span>
        </Link>
        <Link className="tile" href="/providers">
          <span className="e" aria-hidden="true">🖥</span>
          <span className="t">See who stores files</span>
          <span className="d">Compare storage providers by capacity, status and the deals they hold.</span>
        </Link>
        <Link className="tile" href="/account">
          <span className="e" aria-hidden="true">👤</span>
          <span className="t">Look up a wallet</span>
          <span className="d">Balance, files and deals for any address.</span>
        </Link>
      </div>

      <div className="grid cols-2">
        <Card title="Recent activity" id="recent">
          {events.length ? (
            <ul className="results">
              {events.map((e, i) => (
                <li key={i}>
                  <Link href={e.to}>
                    <span>
                      {e.text}
                      <small>{height !== undefined ? fmtAgo(height - e.h) : `block ${e.h}`}</small>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Nothing has happened on the devnet yet. <a href={SITES.upload}>Upload the first file</a>.</p>
          )}
          <p className="muted small" style={{ marginTop: 10 }}>The node has no block list, so this is built from the newest files, deals and proofs.</p>
        </Card>
        <Card title="Want to store a file yourself?" id="start">
          <ol className="step-list">
            <li>
              <a href={SITES.upload}>Open the upload app</a> and create a profile (keys stay in your browser).
            </li>
            <li>Get free devnet VAULT with one click.</li>
            <li>Drop a file, choose private or public, and confirm.</li>
            <li>Come back here to watch your file&apos;s <Jargon k="proof">storage proofs</Jargon> roll in.</li>
          </ol>
          <p className="row" style={{ marginTop: 14 }}>
            <a className="btn primary" href={SITES.upload}>Start uploading ↗</a>
            <a className="btn" href={SITES.vault}>Open the web vault ↗</a>
          </p>
          {params.ok ? (
            <p className="muted small" style={{ marginTop: 12 }}>
              Pricing: {vault(String(params.value.price_per_gb_uvault))} per GiB per 1,000 blocks (about 50 minutes). Proofs are due every {params.value.proof_interval_blocks} blocks.{" "}
              <Link href="/glossary">What do these words mean?</Link>
            </p>
          ) : null}
          <p className="muted small">Providers online: {P.filter((p) => p.status === "active").length ? <>{P.filter((p) => p.status === "active").slice(0, 3).map((p) => <span key={p.address}><Addr a={p.address} link={false} n={6} />{" "}</span>)}</> : "none"}</p>
        </Card>
      </div>
    </>
  );
}
