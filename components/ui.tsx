import Link from "next/link";
import type { ReactNode } from "react";
import type { Health, Level } from "@/lib/health";
import { href as mkHref, short, type Page } from "@/lib/format";
import { CopyButton } from "./CopyButton";
import { Term } from "./Term";

const STATUS: Record<string, { level: Level; label: string; why: string }> = {
  open: { level: "ok", label: "Active", why: "The deal is running: providers are storing the file and proving it." },
  pending: { level: "warn", label: "Pending", why: "Waiting for a provider to confirm it has the file." },
  closed: { level: "idle", label: "Completed", why: "The term ended and providers were paid." },
  failed: { level: "bad", label: "Failed", why: "The term ended and nobody earned payment." },
  cancelled: { level: "idle", label: "Cancelled", why: "The owner cancelled the deal." },
  active: { level: "ok", label: "Active", why: "Online and accepting or holding files." },
  assigned: { level: "warn", label: "Assigned", why: "Chosen by the chain; has not confirmed yet." },
  declined: { level: "bad", label: "Declined", why: "Did not accept in time." },
};

/** A status word in plain language with its explanation on hover/focus and for screen readers. */
export function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? { level: "idle" as Level, label: status, why: "" };
  return (
    <span className={`pill ${s.level}`} title={s.why}>
      {s.label}
      {s.why ? <span className="sr-only">: {s.why}</span> : null}
    </span>
  );
}

export function HealthPill({ h }: { h: Health }) {
  return (
    <span className={`pill ${h.level}`} title={h.why}>
      {h.label}
      <span className="sr-only">: {h.why}</span>
    </span>
  );
}

export function ErrorBox({ error, what = "data" }: { error: string; what?: string }) {
  return (
    <div className="err" role="alert">
      <strong>We could not load {what} from the network.</strong>
      <div className="small muted">The devnet node may be restarting or slow. This page retries on its own; you can also reload. (Details: {error})</div>
    </div>
  );
}

/** Long ids: shortened for scanning, full text on hover/copy. */
function Id({ full, n, to, what }: { full: string; n: number; to?: string; what: string }) {
  const text = <span className="mono">{short(full, n)}</span>;
  return (
    <span className="idline" title={full}>
      {to ? <Link href={to}>{text}</Link> : text}
      <CopyButton value={full} what={what} />
    </span>
  );
}
export const Addr = ({ a, n = 8, link = true }: { a: string; n?: number; link?: boolean }) => <Id full={a} n={n} to={link ? `/account/${a}` : undefined} what="address" />;
export const Root = ({ r, n = 8 }: { r: string; n?: number }) => <Id full={r} n={n} to={`/files/${r}`} what="file ID" />;
export const Hash = ({ h, n = 10, to }: { h: string; n?: number; to?: string }) => <Id full={h} n={n} to={to} what="hash" />;

export function Card({ title, children, id, aside }: { title?: ReactNode; children: ReactNode; id?: string; aside?: ReactNode }) {
  return (
    <section className="card" id={id} aria-labelledby={id && title ? `${id}-h` : undefined}>
      {title ? (
        <div className="page-head" style={{ marginBottom: 12 }}>
          <h2 id={id ? `${id}-h` : undefined} style={{ margin: 0 }}>
            {title}
          </h2>
          {aside}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Empty({ title, children }: { title?: string; children?: ReactNode }) {
  return (
    <div className="empty">
      {title ? <strong>{title}</strong> : null}
      {children}
    </div>
  );
}

export function PageHead({ title, sub, crumbs, actions }: { title: ReactNode; sub?: ReactNode; crumbs?: [string, string?][]; actions?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        {crumbs ? (
          <nav className="crumbs" aria-label="Breadcrumb">
            {crumbs.map(([label, to], i) => (
              <span key={label}>
                {i > 0 ? " › " : ""}
                {to ? <Link href={to}>{label}</Link> : label}
              </span>
            ))}
          </nav>
        ) : null}
        <h1>{title}</h1>
        {sub ? <p className="sub">{sub}</p> : null}
      </div>
      {actions}
    </div>
  );
}

export function Stat({ k, v, note, to }: { k: ReactNode; v: ReactNode; note?: ReactNode; to?: string }) {
  const body = (
    <>
      <div className="k">{k}</div>
      <div className="v">{v}</div>
      {note ? <div className="n">{note}</div> : null}
    </>
  );
  return to ? (
    <Link className="stat" href={to}>
      {body}
    </Link>
  ) : (
    <div className="stat">{body}</div>
  );
}

export function Chips({ items, label }: { items: { label: string; href: string; on: boolean; count?: number }[]; label: string }) {
  return (
    <nav className="chips" aria-label={label}>
      {items.map((c) => (
        <Link key={c.label} className="chip" href={c.href} aria-current={c.on ? "true" : undefined} scroll={false}>
          {c.label}
          {c.count !== undefined ? <span className="count">{c.count}</span> : null}
        </Link>
      ))}
    </nav>
  );
}

export function Pager({ page, path, params }: { page: Page<unknown>; path: string; params: Record<string, string | number | undefined> }) {
  if (page.total === 0) return null;
  const go = (p: number) => mkHref(path, { ...params, page: p > 1 ? p : undefined });
  return (
    <div className="pager">
      <span className="muted small">
        Showing {page.from}–{page.to} of {page.total}
      </span>
      {page.pages > 1 ? (
        <nav className="row" aria-label="Pagination">
          {page.page > 1 ? (
            <Link className="btn sm" href={go(page.page - 1)} rel="prev">
              ← Previous
            </Link>
          ) : null}
          <span className="small muted">
            Page {page.page} of {page.pages}
          </span>
          {page.page < page.pages ? (
            <Link className="btn sm" href={go(page.page + 1)} rel="next">
              Next →
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}

/** A sortable column header (server-rendered link; the current sort is announced). */
export function SortTh({ label, col, sort, dir, path, params, num }: { label: ReactNode; col: string; sort: string; dir: "asc" | "desc"; path: string; params: Record<string, string | number | undefined>; num?: boolean }) {
  const on = sort === col;
  const next = on && dir === "desc" ? "asc" : "desc";
  return (
    <th className={num ? "num" : undefined} aria-sort={on ? (dir === "asc" ? "ascending" : "descending") : undefined}>
      <Link href={mkHref(path, { ...params, sort: col, dir: next, page: undefined })} scroll={false} title={`Sort by ${typeof label === "string" ? label : col}`}>
        {label}
        {on ? (dir === "asc" ? " ▲" : " ▼") : ""}
      </Link>
    </th>
  );
}

export function Jargon({ k, children }: { k: string; children?: ReactNode }) {
  return <Term k={k}>{children}</Term>;
}

export function Skeleton({ w = "100%", h = "1em" }: { w?: string; h?: string }) {
  return <span className="skel" style={{ width: w, height: h }} aria-hidden="true" />;
}

export function EncBadge({ enc }: { enc?: string }) {
  return enc ? (
    <span className="pill info nodot" title="Locked in the owner's browser before upload. Only people the owner shares it with can read it.">
      🔒 Encrypted
    </span>
  ) : (
    <span className="pill idle nodot" title="Stored as-is: anyone who knows the file ID can download and read it.">
      Public
    </span>
  );
}
