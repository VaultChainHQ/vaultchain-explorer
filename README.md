# vaultchain-explorer

Read-only explorer for the [VaultChain](https://github.com/VaultChainHQ/vaultchain) **devnet**. Next.js (App Router, TypeScript), no database, no secrets, no wallet. Deployable on Vercel as is.

Related repositories: [vaultchain](https://github.com/VaultChainHQ/vaultchain) (the chain, provider and CLI) · **vaultchain-explorer** (this repo) · [vaultchain-upload](https://github.com/VaultChainHQ/vaultchain-upload) (browser-signing upload site). Also: [vaultchain-web](https://github.com/VaultChainHQ/vaultchain-web) (site, docs hub and a profile vault).

## What it does

An explorer for people who are not blockchain experts: everything is shown in plain language (VAULT amounts, file sizes, "about 8 hours", health verdicts) and the jargon has tooltips and a glossary. See [docs/UX-AUDIT.md](docs/UX-AUDIT.md) for the audit behind the design.

| Route | Shows |
| --- | --- |
| `/` | network health at a glance, four stats, "what you can do here", recent activity, and the path to uploading a file |
| `/search?q=` and the header box | one smart search for an address, deal number, file ID (or prefix), transaction hash, file name or provider endpoint, with suggestions and helpful no-result messages |
| `/files`, `/files/[root]` | files with privacy/name filters, sorting and paging; per file: details, encryption badge, deals and copy health, who can read it, how to download, deep link into the upload app |
| `/deals`, `/deals/[id]` | deals with status chips and health; per deal: summary, timeline, copies and their proof status, recent proofs |
| `/providers`, `/providers/[address]` | providers with space used, active deals, collateral; per provider: deals held and copy health |
| `/account`, `/account/[address]` | balance, files and deals of any address ("Connect your vault" in the header remembers *your* public address in this browser) |
| `/tx/[hash]` | a transaction in plain language, with the raw JSON underneath |
| `/glossary` | the words used here, explained |

Shared with the other VaultChain sites: brand, cross-site navigation, dark/light theme, favicon and social image. Pages auto-refresh (pause any time), show skeletons while loading, an offline banner and an in-page message when the node is unreachable.

### Limitations

* The node has no block-listing endpoint, so there is no blocks table. The home page shows the live height (plus the heights this tab has observed) and a feed of recent activity derived from manifests, deals and storage proofs.
* It only shows what the node's REST API exposes. File contents are never shown: they live with providers and need a read token or an access grant.
* Data comes from the public devnet and disappears if the devnet is reset.

## How it reads the chain

Pages are server components that call the node REST API on the server (revalidated every 5 s), so the node's CORS settings do not matter and the browser never needs the node URL. `/api/search` serves the search suggestions, and `/api/node/*`, is a GET-only route that forwards a whitelist of read-only node paths (no transaction submission).

## Run locally

Requires Node 20.9+ (CI uses 22).

```bash
npm install
npm run dev        # http://localhost:3000
npm run lint && npm run typecheck && npm test && npm run build
```

## Configuration (Vercel environment variables)

No secrets. Both are optional; the defaults are the public devnet.

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_VAULT_REST` | `https://vaultl1-devnet.fly.dev` | Node REST endpoint |
| `NEXT_PUBLIC_VAULT_PROVIDER` | `https://vaultl1-provider.fly.dev` | Provider (only its public `/status` is read) |

The build does not contact the devnet (every data page is rendered on request), so CI and deploys work even if the devnet is down; pages then show an "could not load data" message.

## Tests

`npm test` covers amount / size / time formatting, query parsing and search routing (with fake loaders), health verdicts, sorting and paging, transaction summaries and the proxy whitelist.

`npm run e2e` drives a headless Chrome through search, navigation, theme, tooltips, copy buttons and the mobile layout against any running instance (`BASE=https://vaultchain-explorer.vercel.app npm run e2e`; needs `npm i --no-save playwright-core` and a Chrome binary). It is not part of CI.

## License

MIT, see [LICENSE](LICENSE).
