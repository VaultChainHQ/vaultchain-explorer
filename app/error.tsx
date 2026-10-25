"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="wrap-narrow" role="alert" style={{ paddingTop: 24 }}>
      <p className="eyebrow">Something went wrong</p>
      <h1>We couldn&apos;t load this page.</h1>
      <p className="lead">The devnet node may be restarting or very busy, or your connection dropped. Nothing you did caused this, and nothing was changed.</p>
      <p className="row">
        <button className="btn primary" type="button" onClick={reset}>Try again</button>
        <Link className="btn" href="/">Back to the overview</Link>
      </p>
      {error.digest ? <p className="muted small">Reference: {error.digest}</p> : null}
    </div>
  );
}
