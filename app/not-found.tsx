import Link from "next/link";
import { SearchBox } from "@/components/SearchBox";

export default function NotFound() {
  return (
    <div className="wrap-narrow" style={{ paddingTop: 24 }}>
      <p className="eyebrow">404</p>
      <h1>We couldn&apos;t find that.</h1>
      <p className="lead">Nothing with that address or ID exists on the current devnet. It may have been mistyped, or the devnet may have been reset since the link was made.</p>
      <SearchBox big autoFocus />
      <p style={{ marginTop: 18 }} className="row">
        <Link className="btn primary" href="/">Go to the overview</Link>
        <Link className="btn" href="/files">Browse files</Link>
        <Link className="btn" href="/deals">Browse deals</Link>
        <Link className="btn" href="/glossary">Glossary</Link>
      </p>
    </div>
  );
}
