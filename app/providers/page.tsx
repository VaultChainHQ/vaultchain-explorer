import Link from "next/link";
import { Badge, Card, Empty, ErrorBox } from "@/components/ui";
import { getProviders, settle } from "@/lib/api";
import { fmtBytes, fmtVault } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Providers() {
  const r = await settle(getProviders());
  if (!r.ok) return <ErrorBox error={r.error} />;
  return (
    <Card title="Storage providers">
      {r.value.length === 0 ? (
        <Empty>No providers registered.</Empty>
      ) : (
        <table className="t">
          <thead>
            <tr>
              <th>Address</th>
              <th>Status</th>
              <th>Endpoint</th>
              <th>Free / capacity</th>
              <th>Collateral</th>
            </tr>
          </thead>
          <tbody>
            {r.value.map((p) => (
              <tr key={p.address}>
                <td>
                  <Link href={`/providers/${p.address}`} className="mono" title={p.address}>
                    {p.address.slice(0, 12)}…{p.address.slice(-6)}
                  </Link>
                </td>
                <td>
                  <Badge status={p.status} />
                </td>
                <td className="mono small">{p.endpoint}</td>
                <td>
                  {fmtBytes(p.free_bytes)} / {fmtBytes(p.capacity)}
                </td>
                <td>{p.collateral ? `${fmtVault(p.collateral.amount)} VAULT` : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
