import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, ErrorBox, PageHead } from "@/components/ui";
import { SearchBox } from "@/components/SearchBox";
import { getManifests } from "@/lib/api";
import { liveLoaders } from "@/lib/loaders";
import { search, type SearchResult } from "@/lib/search";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Search" };

const ICON: Record<string, string> = { address: "👤", deal: "🤝", file: "📄", tx: "🧾", provider: "🖥" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim();
  let res: SearchResult | undefined;
  let error: string | undefined;
  if (q) {
    try {
      res = await search(q, liveLoaders);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }
  if (res && res.hits.length === 1 && res.hits[0].exact) redirect(res.hits[0].href);

  const sample = !res?.hits.length && !error ? (await getManifests().catch(() => []))[0] : undefined;
  return (
    <>
      <PageHead title={q ? `Results for “${q}”` : "Search"} sub="Search by wallet address, deal number, file name, file ID or transaction hash." />
      <div style={{ marginBottom: 20 }}>
        <SearchBox big initial={q} autoFocus={!q} />
      </div>
      {error ? <ErrorBox error={error} what="search results" /> : null}
      {res?.hits.length ? (
        <ul className="results" aria-label="Search results">
          {res.hits.map((h) => (
            <li key={h.href}>
              <Link href={h.href}>
                <span aria-hidden="true">{ICON[h.kind]}</span>
                <span>
                  <strong>{h.title}</strong>
                  <small>{h.sub}</small>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      {res && !res.hits.length ? (
        <Card title="No results">
          {res.notes.map((n) => (
            <p key={n}>{n}</p>
          ))}
          <p className="muted">What you can search for:</p>
          <ul>
            <li>
              A wallet address, like <code>vault1…</code> (about 44 characters)
            </li>
            <li>A deal number, like <code>12</code> or <code>#12</code></li>
            <li>The start of a file name, or a file ID (64 characters, or just the first few)</li>
            <li>A transaction hash (64 characters)</li>
          </ul>
          {sample ? (
            <p>
              Not sure where to start? Try the latest file:{" "}
              <Link href={`/files/${sample.root}`}>{sample.name || sample.root.slice(0, 12)}</Link>, or browse <Link href="/files">all files</Link>, <Link href="/deals">deals</Link> and <Link href="/providers">providers</Link>.
            </p>
          ) : null}
        </Card>
      ) : null}
    </>
  );
}
