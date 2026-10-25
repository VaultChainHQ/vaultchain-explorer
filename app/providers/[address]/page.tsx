import { notFound } from "next/navigation";
import { Badge, Card, Empty, ErrorBox } from "@/components/ui";
import Link from "next/link";
import { NotFound, getDeals, getProvider, getProviderStatus, settle } from "@/lib/api";
import { fmtBytes, fmtVault } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProviderPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  let p;
  try {
    p = await getProvider(address);
  } catch (e) {
    if (e instanceof NotFound) notFound();
    return <ErrorBox error={e instanceof Error ? e.message : String(e)} />;
  }
  const [deals, live] = await Promise.all([settle(getDeals({ provider: address })), getProviderStatus()]);
  const isThis = live && live.address === address;
  return (
    <>
      <Card title="Provider">
        <p className="mono wrap-any">{p.address}</p>
        <p>
          <Badge status={p.status} /> <span className="muted">endpoint</span> <span className="mono">{p.endpoint}</span>
        </p>
        <p>
          <span className="muted">Free / capacity</span> {fmtBytes(p.free_bytes)} / {fmtBytes(p.capacity)} · <span className="muted">Collateral</span>{" "}
          {p.collateral ? `${fmtVault(p.collateral.amount)} VAULT` : "–"}
        </p>
        {isThis && live && (
          <p className="muted small">
            Live endpoint check: {live.status}, {live.version}, {live.objects} object(s) stored.
          </p>
        )}
      </Card>
      <Card title="Deals with this provider">
        {!deals.ok ? (
          <ErrorBox error={deals.error} />
        ) : deals.value.length === 0 ? (
          <Empty>None.</Empty>
        ) : (
          <ul>
            {deals.value.map((d) => (
              <li key={d.id}>
                <Link href={`/deals/${d.id}`}>deal #{d.id}</Link> <Badge status={d.status} /> {fmtBytes(d.size)}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
