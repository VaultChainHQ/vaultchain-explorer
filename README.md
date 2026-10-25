# vaultchain-explorer

Read-only explorer for the [VaultChain](https://github.com/VaultChainHQ/vaultchain) **devnet**. Next.js (App Router, TypeScript), no database, no secrets, no wallet. Deployable on Vercel as is.

Related repositories: [vaultchain](https://github.com/VaultChainHQ/vaultchain) (the chain, provider and CLI) · **vaultchain-explorer** (this repo) · [vaultchain-upload](https://github.com/VaultChainHQ/vaultchain-upload) (browser-signing upload site). Also: [vaultchain-web](https://github.com/VaultChainHQ/vaultchain-web) (site, docs hub and a profile vault).

## Pages

| Route | Shows |
| --- | --- |
| `/` | chain id, node version, live height (polled every 3 s), network totals, storage parameters, provider endpoint health, recent on-chain activity |
| `/providers`, `/providers/[address]` | registered storage providers (status, endpoint, free / capacity, collateral) and their deals |
| `/deals`, `/deals/[id]` | deals (filter by status); per deal: payment, heights, replicas with status, acceptance height, last proven height, missed proofs, and recent storage proofs |
| `/files`, `/files/[root]` | committed manifests (name, size, type, owner, encryption flag); per file: deals and access grants |
| `/account`, `/account/[address]` | balance lookup, nonce, files owned and deals opened by any address |
| `/tx/[hash]` | a transaction record |
| `/search?q=` | the header search box: `vault1…` address, 64-hex manifest root or tx hash, or a deal id |

### Limitations

* The node has no block-listing endpoint, so there is no blocks table. The home page shows the live height (plus the heights this tab has observed) and a feed of recent activity derived from manifests, deals and storage proofs.
* It only shows what the node's REST API exposes. File contents are never shown: they live with providers and need a read token or an access grant.
* Data comes from the public devnet and disappears if the devnet is reset.

## How it reads the chain

Pages are server components that call the node REST API on the server (revalidated every 5 s), so the node's CORS settings do not matter and the browser never needs the node URL. The one client component (live height) calls `/api/node/*`, a GET-only route that forwards a whitelist of read-only node paths (no transaction submission).

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

`npm test` covers amount / size formatting, search-box routing and the proxy whitelist. Pages were additionally smoke tested against the live devnet (all routes return 200 with data, unknown ids return 404, `/api/node/vaultchain/txs` is refused).

## License

MIT, see [LICENSE](LICENSE).
