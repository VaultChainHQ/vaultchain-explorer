import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div role="status" aria-label="Loading">
      <span className="sr-only">Loading…</span>
      <div style={{ marginBottom: 22 }}>
        <Skeleton w="40%" h="2rem" />
        <div style={{ height: 10 }} />
        <Skeleton w="65%" />
      </div>
      <div className="grid cols-4" style={{ marginBottom: 18 }}>
        {[0, 1, 2, 3].map((i) => (
          <div className="stat" key={i}>
            <Skeleton w="50%" />
            <div style={{ height: 10 }} />
            <Skeleton w="70%" h="1.6rem" />
          </div>
        ))}
      </div>
      <div className="card">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} style={{ marginBottom: 14 }}>
            <Skeleton h="1.1em" />
          </div>
        ))}
      </div>
    </div>
  );
}
