import type { Metadata } from "next";
import { SearchBox } from "@/components/SearchBox";
import { Card, Jargon, PageHead } from "@/components/ui";

export const metadata: Metadata = { title: "Accounts", description: "Look up any VaultChain address: balance, files and storage deals." };

export default function AccountLookup() {
  return (
    <>
      <PageHead title="Look up an account" sub="Paste a wallet address to see its balance, files and storage deals. Addresses are public; there is nothing to sign in to." />
      <SearchBox big autoFocus />
      <Card title="What you will see" id="what">
        <ul>
          <li>Its <Jargon k="vault">VAULT</Jargon> balance, in plain amounts instead of <Jargon k="uvault">uvault</Jargon></li>
          <li>The files it owns and the storage deals it opened</li>
          <li>How many transactions it has sent (<Jargon k="nonce">nonce</Jargon>)</li>
        </ul>
        <p className="muted small">Your own address? Use <strong>Connect your vault</strong> in the header to keep it one click away.</p>
      </Card>
    </>
  );
}
