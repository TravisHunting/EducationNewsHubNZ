# Cost protection audit — 11 September 2026

## Finding and remediation

The previous hourly scrape limit did not bound public read costs. Each `/data` request invoked a paid Worker and read ten KV keys. The Site's data and export routes amplified this exposure by fetching the collector on every request. Both workers.dev and preview URLs existed, log sampling was 100%, and no CPU limit was configured. AI generation had a daily success guard but could retry hourly after invalid output. Rate limiting and caching alone would not impose an account-wide monetary cap.

The cost-first remediation removes the billing surfaces instead of estimating safe traffic levels:

| Surface | Final control |
| --- | --- |
| Account Worker requests and CPU | `education-intelligence-collector` deleted |
| Worker public/preview URLs | Disabled before deletion; no Worker remains |
| Cron executions and retries | Cron removed; Worker deleted |
| Workers AI inference | Binding and invoking code removed; archived briefing retained |
| KV read/write/storage | Collection backed up to GitHub; namespace deleted |
| Durable Object requests/storage | Namespace deleted with its owning Worker |
| Secrets | Collector secret disappeared with Worker; Sites collector variables removed |
| Logs/traces | No app Worker left to produce billable ingestion |
| Zone traffic | `edu.travishunting.com` is DNS-only, CNAME to `custom-domains.chatgpt.site`, Free Website zone |
| New collector | Public standard GitHub runner only, pre-run visibility guard, live visibility check, bounded job and requests |
| Public traffic | Read-only GitHub snapshot; cannot invoke scraping, inference, storage writes or deployments |

The data was preserved before deleting storage: 46 records, nine source states and the existing AI briefing. The `collection` branch is the live snapshot store; application code stays on `main`.

## Verified Cloudflare inventory

Cloudflare MCP account inventory after retirement:

- Workers: zero.
- KV namespaces: zero.
- Durable Object namespaces: zero.
- Pages projects: zero.
- Queues: zero.
- R2: not enabled according to the API.
- Worker custom domains and zone Worker routes: zero.
- One pre-existing D1 database, `d1-honc-01`, 32,768 bytes, not bound to this application. Left unchanged.

The Sites-managed hosting Worker is not in this Cloudflare account's Worker inventory. Sites' own service terms, quotas and any platform billing remain outside the scope of this account's Cloudflare API controls.

## What this does and does not guarantee

With the verified configuration, this application has no deployed metered compute or storage in Travis's Cloudflare account for a visitor, retry or scraper bug to scale. It cannot generate Workers AI usage there. DNS continues to serve the public custom domain.

This is not an assertion that the entire Cloudflare account can never receive a bill. The connector returned `Authentication error` for account subscriptions; existing subscriptions, already-incurred charges, unrelated resources and future changes are not covered. No billing alerts are represented as spending caps. The unrelated D1 database was not deleted or altered.

GitHub currently documents standard runners in public repositories as free. Private repositories and larger runners can be billed, so the workflow excludes them. It uploads no artifacts, uses no cache storage and does not invoke paid inference or hosting builds. Provider policy changes, repository/workflow edits or an account owner creating new services can invalidate these protections.

If a quota or source fails, retain the previous snapshot and stop. Never switch to paid infrastructure automatically.

## Verification and regression controls

Automated tests exercise one-hour boundaries, malformed state rejection, network-budget exhaustion before an extra fetch, byte-based storage bounds, simultaneous read coalescing, negative caching and oversized-stream fallback. Closed scrape routes are tested with repeated calls. A regression check rejects restoration of the collector deployment manifest or D1/R2 app bindings and verifies the workflow's free-runner restrictions.

Production checks cover public HTTP 200 access, readable data and exports, rejected mutation requests, absence of the old collector and empty metered app-resource inventories. The workflow must complete one collection and a second invocation must stop on cooldown without contacting sources.

Sources checked:
- Cloudflare Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/
- GitHub Actions billing: https://docs.github.com/en/billing/concepts/product-billing/github-actions
- GitHub-hosted runners: https://docs.github.com/en/actions/reference/runners/github-hosted-runners
- Scheduled workflow behavior: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule
