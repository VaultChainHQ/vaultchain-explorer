import type { Metadata } from "next";
import Link from "next/link";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Addr, Empty, ErrorBox, Jargon, PageHead, StatusBadge } from "@/components/ui";
import { getDeals, getProviders, settle } from "@/lib/api";
import { fmtBytes, vault } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Storage providers", description: "The servers that store files on the VaultChain devnet." };

export default async function Providers() {
  const [r, deals] = await Promise.all([settle(getProviders()), settle(getDeals())]);
  const D = deals.ok ? deals.value : [];
  const mine = (a: string) => D.filter((d) => d.status === "open" && (d.replicas ?? []).some((x) => x.provider === a)).length;
  return (
    <>
      <PageHead
        title="Storage providers"
        sub={<>A <Jargon k="provider">provider</Jargon> keeps files on its disks and earns VAULT by proving it still has them. More providers means files survive more failures.</>}
        actions={<AutoRefresh seconds={20} />}
      />
      {!r.ok ? <ErrorBox error={r.error} what="providers" /> : null}
      {r.ok && r.value.length === 0 ? <Empty title="No providers yet">When a provider registers it will show up here.</Empty> : null}
      {r.ok && r.value.length ? (
        <div className="tablewrap">
          <table className="t">
            <caption className="sr-only">Storage providers</caption>
            <thead>
              <tr><th>Provider</th><th>Status</th><th>Space used</th><th>Active deals</th><th><Jargon k="collateral">Collateral</Jargon></th><th>Endpoint</th></tr>
            </thead>
            <tbody>
              {r.value.map((p) => {
                const used = Math.max(0, p.capacity - p.free_bytes);
                const pct = p.capacity ? Math.round((used / p.capacity) * 100) : 0;
                return (
                  <tr key={p.address}>
                    <td data-label="Provider"><Addr a={p.address} n={8} link={false} /> <Link href={`/providers/${p.address}`} className="small">Details</Link></td>
                    <td data-label="Status"><StatusBadge status={p.status} /></td>
                    <td data-label="Space used">{fmtBytes(used)} of {fmtBytes(p.capacity)} <span className="muted">({pct}%)</span></td>
                    <td data-label="Active deals">{deals.ok ? mine(p.address) : "–"}</td>
                    <td data-label="Collateral">{p.collateral ? vault(p.collateral.amount) : "–"}</td>
                    <td data-label="Endpoint" className="mono small">{p.endpoint}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}
