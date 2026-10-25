import type { Metadata } from "next";
import Link from "next/link";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Addr, Chips, Empty, EncBadge, ErrorBox, Jargon, PageHead, Pager, Root, SortTh } from "@/components/ui";
import { getManifests, getNodeInfo, settle } from "@/lib/api";
import { ADDRESS_RE, fmtAgo, fmtBytes, href, paginate } from "@/lib/format";
import { SITES } from "@/lib/links";
import { listQuery, sortBy } from "@/lib/tables";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Files", description: "Files registered on the VaultChain devnet: name, size, owner and whether they are encrypted." };

const SORTS = ["added", "size", "name"];

export default async function Files({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const q = listQuery(sp, SORTS, "added");
  const owner = sp.owner && ADDRESS_RE.test(sp.owner) ? sp.owner : "";
  const kind = sp.kind === "private" || sp.kind === "public" ? sp.kind : "";
  const text = (sp.q ?? "").trim().slice(0, 80);
  const [r, info] = await Promise.all([settle(getManifests(owner || undefined)), settle(getNodeInfo())]);
  const height = info.ok ? info.value.height : undefined;
  const all = r.ok ? r.value : [];
  const filtered = sortBy(
    all.filter((m) => (kind === "private" ? !!m.encryption : kind === "public" ? !m.encryption : true) && (!text || (m.name || "").toLowerCase().includes(text.toLowerCase()))),
    q,
    (m, c) => (c === "size" ? m.size : c === "name" ? (m.name || "").toLowerCase() : m.height),
  );
  const pg = paginate(filtered, q.page);
  const base = { owner, kind, q: text, sort: q.sort, dir: q.dir };
  return (
    <>
      <PageHead
        title="Files"
        sub={<>Every file registered on the devnet. Only a small public <Jargon k="manifest">file record</Jargon> lives on the chain; the contents are held by storage providers.</>}
        actions={<AutoRefresh seconds={15} />}
      />
      {!r.ok ? <ErrorBox error={r.error} what="files" /> : null}
      {owner ? (
        <p className="callout">
          Showing files owned by <Addr a={owner} /> · <Link href={href("/files", { kind, q: text })}>show all files</Link>
        </p>
      ) : null}
      <form method="get" action="/files" className="row" style={{ marginBottom: 12 }} role="search" aria-label="Filter files by name">
        {owner ? <input type="hidden" name="owner" value={owner} /> : null}
        {kind ? <input type="hidden" name="kind" value={kind} /> : null}
        <label htmlFor="fq" className="sr-only">Filter by file name</label>
        <input id="fq" name="q" defaultValue={text} placeholder="Filter by file name…" style={{ minWidth: 220 }} />
        <button className="btn" type="submit">Filter</button>
        {text ? <Link className="btn sm" href={href("/files", { owner, kind })}>Clear</Link> : null}
      </form>
      <Chips
        label="Filter by privacy"
        items={[
          { label: "All", href: href("/files", { owner, q: text }), on: !kind },
          { label: "🔒 Encrypted", href: href("/files", { owner, q: text, kind: "private" }), on: kind === "private" },
          { label: "Public", href: href("/files", { owner, q: text, kind: "public" }), on: kind === "public" },
        ]}
      />
      {r.ok && !pg.rows.length ? (
        <Empty title={all.length ? "No files match these filters" : "No files yet"}>
          {all.length ? <Link href="/files">Clear filters</Link> : <>Nothing has been uploaded. <a href={SITES.upload}>Upload the first file ↗</a></>}
        </Empty>
      ) : null}
      {pg.rows.length ? (
        <div className="tablewrap">
          <table className="t">
            <caption className="sr-only">Files on the devnet</caption>
            <thead>
              <tr>
                <SortTh label="Name" col="name" {...{ sort: q.sort, dir: q.dir, path: "/files", params: base }} />
                <th>Privacy</th>
                <SortTh label="Size" col="size" num {...{ sort: q.sort, dir: q.dir, path: "/files", params: base }} />
                <th>Owner</th>
                <th><Jargon k="root">File ID</Jargon></th>
                <SortTh label="Added" col="added" {...{ sort: q.sort, dir: q.dir, path: "/files", params: base }} />
              </tr>
            </thead>
            <tbody>
              {pg.rows.map((m) => (
                <tr key={m.root}>
                  <td data-label="Name"><Link href={`/files/${m.root}`}>{m.name || "(unnamed)"}</Link></td>
                  <td data-label="Privacy"><EncBadge enc={m.encryption} /></td>
                  <td className="num" data-label="Size">{fmtBytes(m.size)}</td>
                  <td data-label="Owner"><Addr a={m.owner} n={6} /></td>
                  <td data-label="File ID"><Root r={m.root} n={6} /></td>
                  <td data-label="Added">{height !== undefined ? fmtAgo(height - m.height) : `block ${m.height}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <Pager page={pg} path="/files" params={base} />
    </>
  );
}
