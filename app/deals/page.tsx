import type { Metadata } from "next";
import Link from "next/link";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Addr, Chips, Empty, ErrorBox, HealthPill, Jargon, TermNote, PageHead, Pager, SortTh, StatusBadge } from "@/components/ui";
import { getDeals, getManifests, getNodeInfo, getParams, settle } from "@/lib/api";
import { fmtBytes, fmtWhen, href, paginate, vault } from "@/lib/format";
import { dealHealth } from "@/lib/health";
import { listQuery, sortBy } from "@/lib/tables";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Storage deals", description: "Every storage deal on the VaultChain devnet: who pays, how big, how many copies, and when it ends." };

const SORTS = ["id", "size", "payment", "expires"];

export default async function Deals({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const q = listQuery(sp, SORTS, "id");
  const status = sp.status || "";
  const owner = sp.owner || "";
  const [r, info, params, manifests] = await Promise.all([settle(getDeals(owner ? { owner } : {})), settle(getNodeInfo()), settle(getParams()), settle(getManifests())]);
  const height = info.ok ? info.value.height : undefined;
  const names = new Map((manifests.ok ? manifests.value : []).map((m) => [m.root, m.name]));
  const all = r.ok ? r.value : [];
  const statuses = ["open", "pending", "closed", "failed", "cancelled"].filter((s) => all.some((d) => d.status === s));
  const filtered = sortBy(status ? all.filter((d) => d.status === status) : all, q, (d, c) => (c === "size" ? d.size : c === "payment" ? Number(d.payment.amount) : c === "expires" ? d.expire_height : d.id));
  const pg = paginate(filtered, q.page);
  const base = { status, owner, sort: q.sort, dir: q.dir };
  return (
    <>
      <PageHead
        title="Storage deals"
        sub={<>A <Jargon k="deal">deal</Jargon> is an agreement to keep one file stored for a set time. Open one to see its copies and recent proofs.</>}
        actions={<AutoRefresh seconds={15} />}
      />
      {!r.ok ? <ErrorBox error={r.error} what="deals" /> : null}
      {owner ? (
        <p className="callout">
          Showing deals owned by <Addr a={owner} /> · <Link href={href("/deals", { status })}>show all deals</Link>
        </p>
      ) : null}
      {r.ok ? (
        <Chips
          label="Filter by status"
          items={[{ label: "All", href: href("/deals", { owner }), on: !status, count: all.length }, ...statuses.map((s) => ({ label: s === "open" ? "Active" : s[0].toUpperCase() + s.slice(1), href: href("/deals", { status: s, owner }), on: status === s, count: all.filter((d) => d.status === s).length }))]}
        />
      ) : null}
      {r.ok && pg.rows.length === 0 ? (
        <Empty title="No deals match">{status || owner ? <Link href="/deals">Clear filters</Link> : "Nothing has been uploaded yet."}</Empty>
      ) : null}
      {pg.rows.length ? (
        <div className="tablewrap">
          <table className="t">
            <caption className="sr-only">Storage deals</caption>
            <thead>
              <tr>
                <SortTh label="Deal" col="id" {...{ sort: q.sort, dir: q.dir, path: "/deals", params: base }} />
                <th>Status</th>
                <th>File</th>
                <th>Owner</th>
                <SortTh label="Size" col="size" num {...{ sort: q.sort, dir: q.dir, path: "/deals", params: base }} />
                <SortTh label="Paid" col="payment" num {...{ sort: q.sort, dir: q.dir, path: "/deals", params: base }} />
                <th>Copies</th>
                <th>Health</th>
                <SortTh label="Ends" col="expires" {...{ sort: q.sort, dir: q.dir, path: "/deals", params: base }} />
              </tr>
            </thead>
            <tbody>
              {pg.rows.map((d) => {
                const live = (d.replicas ?? []).filter((x) => x.status === "active").length;
                return (
                  <tr key={d.id}>
                    <td data-label="Deal"><Link href={`/deals/${d.id}`}>#{d.id}</Link></td>
                    <td data-label="Status"><StatusBadge status={d.status} /></td>
                    <td data-label="File"><Link href={`/files/${d.cid}`}>{names.get(d.cid) || `${d.cid.slice(0, 10)}…`}</Link></td>
                    <td data-label="Owner"><Addr a={d.owner} n={6} /></td>
                    <td className="num" data-label="Size">{fmtBytes(d.size)}</td>
                    <td className="num" data-label="Paid">{vault(d.payment.amount)}</td>
                    <td data-label="Copies">{live} of {d.replication}</td>
                    <td data-label="Health">{params.ok ? <HealthPill h={dealHealth(d, height, params.value)} /> : "–"}</td>
                    <td data-label="Ends">{["closed", "failed", "cancelled"].includes(d.status) ? "Ended" : <>{fmtWhen(d.expire_height, height)} <TermNote d={d} /></>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
      <Pager page={pg} path="/deals" params={base} />
    </>
  );
}
