import Link from "next/link";
import type { ReactNode } from "react";
import { short } from "@/lib/format";

export function Badge({ status }: { status: string }) {
  return <span className={`badge b-${status}`}>{status}</span>;
}

export function ErrorBox({ error }: { error: string }) {
  return (
    <div className="err" role="alert">
      Could not load data from the node: {error}
    </div>
  );
}

export function Addr({ a }: { a: string }) {
  return (
    <Link href={`/account/${a}`} className="mono" title={a}>
      {short(a, 8)}
    </Link>
  );
}

export function Root({ r, n = 10 }: { r: string; n?: number }) {
  return (
    <Link href={`/files/${r}`} className="mono" title={r}>
      {short(r, n)}
    </Link>
  );
}

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="card">
      {title && <h2>{title}</h2>}
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="muted">{children}</p>;
}
