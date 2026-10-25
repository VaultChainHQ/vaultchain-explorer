import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card">
      <h2>Not found</h2>
      <p className="muted">
        Nothing with that id exists on the current devnet (it may have been reset). <Link href="/">Back home</Link>
      </p>
    </div>
  );
}
