import Link from "next/link";
import { REPOS, SITES } from "@/lib/links";
import { ConnectVault } from "./ConnectVault";
import { SearchBox } from "./SearchBox";
import { SubNav } from "./SubNav";
import { ThemeToggle } from "./ThemeToggle";

export function SiteHeader() {
  return (
    <header className="site-header">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="wrap header-row">
        <a href={SITES.home} className="brand">
          <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
            <rect x="3" y="3" width="26" height="26" rx="7" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="16" cy="16" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M16 10v-4M16 26v-4M10 16H6M26 16h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span>VaultChain</span>
          <span className="badge">devnet</span>
        </a>
        <input type="checkbox" id="nav-toggle" className="nav-toggle" aria-label="Toggle menu" />
        <label htmlFor="nav-toggle" className="nav-burger" aria-hidden="true">
          <span />
          <span />
          <span />
        </label>
        <nav className="nav" aria-label="VaultChain sites">
          <a href={SITES.home}>Home</a>
          <a href={SITES.docs}>Docs</a>
          <a href={SITES.vault}>Vault</a>
          <Link href="/" aria-current="page">
            Explorer
          </Link>
          <a href={SITES.upload}>Upload</a>
          <a href={REPOS.chain} rel="noopener noreferrer" target="_blank">
            GitHub
          </a>
          <ConnectVault />
          <ThemeToggle />
        </nav>
      </div>
      <div className="subbar">
        <div className="wrap subbar-row">
          <SubNav />
          <SearchBox />
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap footer-grid">
        <div>
          <strong>VaultChain Explorer</strong>
          <p className="muted small">
            A read-only window onto the VaultChain devnet. Nothing here can move funds or change anything. Not audited; tokens have no value; the network can be reset.
          </p>
        </div>
        <div>
          <h2 className="footer-h">Explore</h2>
          <ul>
            <li><Link href="/files">Files</Link></li>
            <li><Link href="/deals">Deals</Link></li>
            <li><Link href="/providers">Providers</Link></li>
            <li><Link href="/glossary">Glossary</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="footer-h">Use</h2>
          <ul>
            <li><a href={SITES.upload}>Upload a file</a></li>
            <li><a href={SITES.vault}>Web vault</a></li>
            <li><a href={SITES.docs}>Docs</a></li>
            <li><a href={`${SITES.docs}/reference/node-rest`}>REST API</a></li>
          </ul>
        </div>
        <div>
          <h2 className="footer-h">Source (MIT)</h2>
          <ul>
            <li><a href={REPOS.chain} rel="noopener noreferrer" target="_blank">vaultchain</a></li>
            <li><a href={REPOS.web} rel="noopener noreferrer" target="_blank">vaultchain-web</a></li>
            <li><a href={REPOS.upload} rel="noopener noreferrer" target="_blank">vaultchain-upload</a></li>
            <li><a href={REPOS.explorer} rel="noopener noreferrer" target="_blank">vaultchain-explorer</a></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
