import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Addr, Badge, Card, Empty, ErrorBox } from "@/components/ui";
import { NotFound, getDeals, getGrants, getManifest, getTx, settle } from "@/lib/api";
import { fmtBytes, fmtVault } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function FilePage({ params }: { params: Promise<{ root: string }> }) {
  const { root } = await params;
  if (!/^[0-9a-f]{64}$/.test(root)) notFound();
  let m;
  try {
    m = await getManifest(root);
  } catch (e) {
    if (e instanceof NotFound) {
      // A 64-hex search term may be a transaction hash instead.
      const tx = await settle(getTx(root).catch((x) => (x instanceof NotFound ? null : Promise.reject(x))));
      if (tx.ok && tx.value) redirect(`/tx/${root}`);
      notFound();
    }
    return <ErrorBox error={e instanceof Error ? e.message : String(e)} />;
  }
  const [deals, grants] = await Promise.all([settle(getDeals({ cid: root })), settle(getGrants(root))]);
  return (
    <>
      <Card title={m.name || "(unnamed file)"}>
        <p>
          <span className="muted">Root</span> <span className="mono wrap-any">{m.root}</span>
        </p>
        <p>
          <span className="muted">Size</span> {fmtBytes(m.size)} ({m.size} bytes) · <span className="muted">chunk size</span> {fmtBytes(m.chunk_size)} · <span className="muted">chunks</span>{" "}
          {Math.ceil(m.size / m.chunk_size)}
        </p>
        <p>
          <span className="muted">Type</span> {m.mime || "–"} · <span className="muted">owner</span> <Addr a={m.owner} /> · <span className="muted">committed at height</span> {m.height}
        </p>
        <p>
          <span className="muted">Encryption</span> {m.encryption ? <Badge status={m.encryption} /> : "none (plaintext)"}
          {m.key_envelope ? " · has an owner key envelope" : ""}
        </p>
      </Card>
      <Card title="Deals">
        {!deals.ok ? (
          <ErrorBox error={deals.error} />
        ) : deals.value.length === 0 ? (
          <Empty>No deals: nobody is paid to store this file.</Empty>
        ) : (
          <ul>
            {deals.value.map((d) => (
              <li key={d.id}>
                <Link href={`/deals/${d.id}`}>deal #{d.id}</Link> <Badge status={d.status} /> {fmtVault(d.payment.amount)} VAULT, expires at height {d.expire_height}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="Access grants">
        {!grants.ok ? (
          <ErrorBox error={grants.error} />
        ) : grants.value.length === 0 ? (
          <Empty>No grants: only the owner can read this file.</Empty>
        ) : (
          <ul>
            {grants.value.map((g) => (
              <li key={g.id}>
                {g.grantee === "*" ? "everyone" : <Addr a={g.grantee} />} · {g.capability}
                {g.expiry_height ? ` · until height ${g.expiry_height}` : " · no expiry"}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
