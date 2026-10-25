import Link from "next/link";
import { Addr, Badge, Card, Empty, ErrorBox, Root } from "@/components/ui";
import { getDeals, getNodeInfo, settle } from "@/lib/api";
import { fmtBytes, fmtVault } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Deals({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const [r, info] = await Promise.all([settle(getDeals()), settle(getNodeInfo())]);
  if (!r.ok) return <ErrorBox error={r.error} />;
  const statuses = [...new Set(r.value.map((d) => d.status))].sort();
  const rows = (status ? r.value.filter((d) => d.status === status) : r.value).slice().sort((a, b) => b.id - a.id);
  const height = info.ok ? info.value.height : undefined;
  return (
    <Card title="Storage deals">
      <p className="filters">
        <Link href="/deals" className={!status ? "on" : ""}>
          all ({r.value.length})
        </Link>
        {statuses.map((s) => (
          <Link key={s} href={`/deals?status=${s}`} className={status === s ? "on" : ""}>
            {s}
          </Link>
        ))}
      </p>
      {rows.length === 0 ? (
        <Empty>No deals.</Empty>
      ) : (
        <table className="t">
          <thead>
            <tr>
              <th>Id</th>
              <th>Status</th>
              <th>File</th>
              <th>Owner</th>
              <th>Size</th>
              <th>Payment</th>
              <th>Replicas</th>
              <th>Expires</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id}>
                <td>
                  <Link href={`/deals/${d.id}`}>#{d.id}</Link>
                </td>
                <td>
                  <Badge status={d.status} />
                </td>
                <td>
                  <Root r={d.cid} />
                </td>
                <td>
                  <Addr a={d.owner} />
                </td>
                <td>{fmtBytes(d.size)}</td>
                <td>{fmtVault(d.payment.amount)} VAULT</td>
                <td>
                  {(d.replicas ?? []).filter((x) => x.status === "active").length}/{d.replication}
                </td>
                <td className="mono">
                  {d.expire_height}
                  {height !== undefined && d.expire_height > height ? <span className="muted small"> (in {d.expire_height - height})</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
