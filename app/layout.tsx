import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "VaultChain Explorer (devnet)",
  description: "Read-only explorer for the VaultChain devnet: blocks, providers, deals, files and balances.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="top">
          <div className="wrap bar">
            <Link href="/" className="brand">
              VaultChain Explorer
            </Link>
            <nav>
              <Link href="/">Home</Link>
              <Link href="/providers">Providers</Link>
              <Link href="/deals">Deals</Link>
              <Link href="/files">Files</Link>
              <Link href="/account">Account</Link>
            </nav>
            <form action="/search" className="search">
              <input name="q" placeholder="address, manifest root, deal id" aria-label="Search" />
              <button type="submit">Search</button>
            </form>
          </div>
        </header>
        <main className="wrap">{children}</main>
        <footer className="wrap muted small">
          Read-only devnet explorer. Data comes live from the public devnet and disappears if it is reset. ·{" "}
          <a href="https://github.com/VaultChainHQ/vaultchain">vaultchain</a> · <a href="https://github.com/VaultChainHQ/vaultchain-explorer">vaultchain-explorer</a> ·{" "}
          <a href="https://github.com/VaultChainHQ/vaultchain-upload">vaultchain-upload</a>
        </footer>
      </body>
    </html>
  );
}
