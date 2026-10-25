import Link from "next/link";
import { Addr, Badge, Card, Empty, ErrorBox, Root } from "@/components/ui";
import { getManifests, settle } from "@/lib/api";
import { fmtBytes } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Files({ searchParams }: { searchParams: Promise<{ owner?: string }> }) {
  const { owner } = await searchParams;
  const safeOwner = owner && /^vault1[0-9a-z]{20,80}$/.test(owner) ? owner : undefined;
  const r = await settle(getManifests(safeOwner));
  if (!r.ok) return <ErrorBox error={r.error} />;
  const rows = r.value.slice().sort((a, b) => b.height - a.height);
  return (
    <Card title={safeOwner ? "Files owned by this account" : "Files (committed manifests)"}>
      {safeOwner && (
        <p className="muted small">
          Filtered to <Addr a={safeOwner} /> · <Link href="/files">show all</Link>
        </p>
      )}
      {rows.length === 0 ? (
        <Empty>No files.</Empty>
      ) : (
        <table className="t">
          <thead>
            <tr>
              <th>Name</th>
              <th>Root</th>
              <th>Size</th>
              <th>Type</th>
              <th>Owner</th>
              <th>Height</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.root}>
                <td>
                  {m.name || "(unnamed)"} {m.encryption && <Badge status="encrypted" />}
                </td>
                <td>
                  <Root r={m.root} />
                </td>
                <td>{fmtBytes(m.size)}</td>
                <td className="small">{m.mime || "–"}</td>
                <td>
                  <Addr a={m.owner} />
                </td>
                <td className="mono">{m.height}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="muted small">Only metadata is on chain. File contents live with storage providers and need a read token or grant.</p>
    </Card>
  );
}
