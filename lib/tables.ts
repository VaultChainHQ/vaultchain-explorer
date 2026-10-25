/** Shared helpers for list pages: parse ?sort=&dir=&page= safely. */
export interface ListQuery {
  sort: string;
  dir: "asc" | "desc";
  page: number;
}
export function listQuery(sp: Record<string, string | undefined>, sorts: string[], dflt: string): ListQuery {
  return {
    sort: sorts.includes(sp.sort ?? "") ? (sp.sort as string) : dflt,
    dir: sp.dir === "asc" ? "asc" : "desc",
    page: Math.max(1, Number(sp.page) || 1),
  };
}
export function sortBy<T>(rows: T[], q: ListQuery, key: (r: T, col: string) => number | string): T[] {
  const m = q.dir === "asc" ? 1 : -1;
  return rows.slice().sort((a, b) => {
    const x = key(a, q.sort);
    const y = key(b, q.sort);
    return (x < y ? -1 : x > y ? 1 : 0) * m;
  });
}
