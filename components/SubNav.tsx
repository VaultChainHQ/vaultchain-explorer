"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SUB: [string, string][] = [
  ["/", "Overview"],
  ["/files", "Files"],
  ["/deals", "Deals"],
  ["/providers", "Providers"],
  ["/account", "Accounts"],
  ["/glossary", "Glossary"],
];

export function SubNav() {
  const path = usePathname() || "/";
  return (
    <nav className="subnav" aria-label="Explorer sections">
      {SUB.map(([to, label]) => {
        const on = to === "/" ? path === "/" : path === to || path.startsWith(to + "/");
        return (
          <Link key={to} href={to} aria-current={on ? "page" : undefined}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
