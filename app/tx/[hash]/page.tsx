import { notFound } from "next/navigation";
import { Badge, Card, ErrorBox } from "@/components/ui";
import { NotFound, getTx } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function TxPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  if (!/^[0-9a-fA-F]{64}$/.test(hash)) notFound();
  let tx;
  try {
    tx = await getTx(hash.toLowerCase());
  } catch (e) {
    if (e instanceof NotFound) notFound();
    return <ErrorBox error={e instanceof Error ? e.message : String(e)} />;
  }
  let pretty = tx.raw;
  try {
    pretty = JSON.stringify(JSON.parse(tx.raw), null, 2);
  } catch {
    /* keep raw */
  }
  return (
    <Card title="Transaction">
      <p className="mono wrap-any">{tx.hash}</p>
      <p>
        <Badge status={tx.ok ? "ok" : "failed"} /> height {tx.height} · index {tx.index} · result: {tx.result || "–"}
      </p>
      <pre className="pre">{pretty}</pre>
    </Card>
  );
}
