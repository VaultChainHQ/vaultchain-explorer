import Link from "next/link";
import { redirect } from "next/navigation";
import { classifyQuery } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Search({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const t = classifyQuery(q);
  if ("href" in t) redirect(t.href);
  return (
    <div className="card">
      <h2>Search</h2>
      <p className="err">{t.error}</p>
      <Link href="/">Back home</Link>
    </div>
  );
}
