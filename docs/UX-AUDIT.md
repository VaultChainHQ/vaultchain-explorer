# Explorer UX audit

Audited as a first-time user at 1280 px and 390 px wide (headless Chrome, screenshots kept with the project notes), against the live devnet. "Before" is the first release; "after" is what this repo now does.

## Findings, by priority

| # | Finding (before) | Impact | Fix (after) |
| --- | --- | --- | --- |
| P0 | Tables were cut off on phones: size, payment and owner columns were unreachable without sideways scrolling. | Broken on mobile | Tables turn into labelled cards under 720 px; no page scrolls sideways at 390 px. |
| P0 | Raw units everywhere: `uvault`, block heights, byte counts, "height 7319". Nobody could tell if a deal was healthy or when it ended. | Not understandable | VAULT amounts (`1,950 VAULT`), sizes (`3.00 MiB`), relative time (`about 8 hours`, `in about 50 minutes`; ~3 s per block, marked approximate) and a health verdict for every deal and copy. |
| P0 | One search box that only accepted exact ids and answered "error" for anything else. | Dead end | Smart search over address, deal number (`12`, `#12`, `deal 12`), file ID or prefix, transaction hash, file name and provider endpoint, with live suggestions and a plain-language reason when nothing matches (e.g. "The newest deal is #11"). |
| P1 | No explanation of jargon (manifest, replica, epoch, nonce, collateral...). | Newcomers lost | Dotted-underline tooltips that work on hover, focus and tap, plus a `/glossary` page; labels say "File ID", "Copies", "Round" instead of "root", "replica", "epoch". |
| P1 | Home was a wall of numbers with no story or next step. | No orientation | Home answers "is the network healthy?", shows four stats, four "what you can do here" tiles, recent activity and a "store a file yourself" path to the upload app and web vault. |
| P1 | Nothing was linkable or copyable in a friendly way; ids were truncated with no copy. | Friction | Copy buttons on every id and a "Copy link" on detail pages; filters, sorting and paging live in the URL. |
| P1 | File pages did not say who can read a file or how to get it. | Unclear capability | "How to download this file" (needs a vault, because reads are authorised by a signature), a deep link to the file in the upload app, a "Who can read it" card and an encryption badge. |
| P1 | No loading, error or offline states; a slow node showed a blank page. | Feels broken | Skeleton loaders, an in-page error box with a retry hint, an offline banner, a route-level error page with "Try again", and graceful partial failures (the rest of the page still renders). |
| P2 | Lists had no sorting, paging or filtering beyond status. | Hard to scan | Status chips with counts, owner and privacy filters, name filter, sortable columns, 20 per page. |
| P2 | Header showed only the explorer; no way to reach Docs, Vault or Upload. | Siloed | Shared brand with cross-site navigation (Home, Docs, Vault, Explorer, Upload, GitHub), shared favicon and Open Graph image. |
| P2 | Only a dark theme and no keyboard shortcut. | Comfort | Dark and light themes (system default, remembered), `/` focuses search, arrow keys and Enter in suggestions, skip link. |
| P2 | Data went stale until the user reloaded. | Trust | Auto-refresh with "updated Ns ago", Pause and Refresh controls. |
| P3 | Generic 404. | Dead end | A 404 with search and shortcuts to the main lists. |

## Accessibility and performance (measured)

Lighthouse 12, mobile emulation, production build served locally against the live devnet:

| Page | Performance | Accessibility | Best practices | SEO | LCP | TBT | CLS |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 99 | 100 | 100 | 100 | 1.8 s | 70 ms | 0 |
| `/deals/1` | 100 | 100 | 100 | 100 | 1.8 s | 60 ms | 0 |

These are lab numbers from one run on a shared machine; real devices and the Vercel edge will differ.

## Known gaps

* No block list (the node has no endpoint for it).
* Relative times are estimates (the devnet targets about 3 s per block).
* Loading skeletons stream the page, so an unknown id returns HTTP 200 with a `noindex` 404 page rather than a hard 404 status.
* Transaction lookup depends on the node keeping the transaction; older ones can be pruned (the page explains this).
