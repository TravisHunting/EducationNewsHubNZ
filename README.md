# Education Intelligence — Aotearoa

Public NZ education research desk at https://edu.travishunting.com, hosted with Sites. Search, topic analysis, source diagnostics, archived AI interpretation and Markdown/JSON/JSONL/CSV research packs remain available.

## Cost protection comes first

**This app has no running resources in Travis's Cloudflare account.** Its former Worker, Workers AI binding, KV namespace, Durable Object, secret, cron and public endpoints were retired on 11 September 2026. The domain is a DNS-only CNAME on a Free Website zone pointing to Sites. Do not recreate the paid collector. See [the cost audit](docs/COST-PROTECTION.md) for scope, verification and limitations.

Sites owns the website deployment. `.openai/hosting.json` preserves its identity and has no D1 or R2 bindings. The website reads a fixed public GitHub snapshot, with a 900 KB response ceiling, five-second timeout, five-minute cache, coalesced concurrent requests and one-minute failure cache. It falls back to a dated saved copy. Public requests cannot select a fetch destination or trigger collection, AI, writes or deployments. `/api/refresh` remains closed with HTTP 405.

## Automatic collection

`.github/workflows/collect.yml` runs on the public repository's standard `ubuntu-24.04` GitHub-hosted runner. GitHub documents these runners as free for public repositories. The job is skipped before runner allocation unless this is the approved public repository and main branch. The collector independently checks the live repository visibility and refuses private operation.

- Scheduled at minute 17 each hour; owner-triggered dispatches use the same guard. No push, pull-request or public webhook triggers.
- One concurrency group. A persisted `state.json` reservation on the `collection` branch is updated using a SHA compare-and-swap **before** contacting publishers. Conflicting or malformed state fails closed. Failed jobs do not refund the hourly reservation.
- At most one batch per rolling 60 minutes. GitHub may delay jobs, so collection can be less frequent. Scheduled public workflows may be disabled after 60 days without repository activity.
- Twelve-minute job timeout; ten-minute process deadline; at most 180 publisher HTTP requests per run; no automatic retry loop.
- Nine allowlisted sources, at most five publication records processed per source. Each request has a 12-second deadline, bounded redirects and a streaming response-size ceiling.
- At most 250 records per source and 900,000 bytes for the published snapshot. Oldest records are trimmed to fit. Failed source checks preserve previous records.
- No paid AI calls, Cloudflare credentials, third-party API keys, caches, uploaded artifacts, larger runners or automatic site deployments.
- Only the workflow's short-lived repository token is used. Third-party actions are pinned to full commit SHAs; checkout does not persist credentials.

The `collection` branch contains `snapshot.json` and `state.json`, separate from application code. The public app picks up new snapshots without redeployment. The old generated AI briefing is explicitly archived; automated AI generation is disabled. Topic analysis and AI-ready research packs do not require inference services.

## Sources and provenance

`lib/sources.mjs` defines Ministry of Education, NCEA Education, Education Counts, Education Review Office, NZQA, Tertiary Education Commission, Beehive Education, RNZ Education and NZCER. Access restrictions and parser failures remain visible. The collector respects robots rules, rejects unsafe/off-list redirects and never bypasses authentication, paywalls or bot challenges.

Only headlines and short publisher metadata are collected; RNZ uses headlines only. Publisher document links remain with their original hosts and are not downloaded or analysed. Publication dates are separate from retrieval dates; unknown dates stay null. Retained URLs are deduplicated. Exports include provenance and CSV formula protection.

Public endpoints: `/api/data`, `/api/export?format=json`, `/api/export?format=jsonl`, `/api/export?format=markdown`, `/api/export?format=csv`, `/llms.txt`. Exports accept an optional `topic`; the interactive builder also supports search, source, dates and exact selection.

## Development and publishing

Use Node 22.13 or later: `npm ci`, `npm run dev`, `npm test`, `npm run build`. The native Windows npm shim may misresolve its installation; the equivalent local fallback is `node C:/Nodejs/Nodejs2217/node_modules/npm/bin/npm-cli.js run build`. Attempt the Sites build helper first.

`node scripts/collect.mjs` is an operator-only local snapshot utility, never exposed through the website or used by the scheduled workflow. It does not consume Cloudflare services. `scripts/scheduled-collect.mjs` only runs in the approved GitHub workflow. Keep collection reservations intact; do not reset the branch to bypass cooldowns.

Tests cover parsing, safe redirects, robots compliance, export safety, hourly reservation boundaries, request and storage budgets, cache coalescing, oversized-feed fallback, closed public mutation routes and absence of paid collector deployment configuration. Run `node node_modules/typescript/bin/tsc --noEmit` for type checking.

Publish using the Sites building and hosting skills: validate, commit, push the exact source to GitHub and Sites, package the build, save a version, deploy to the existing public audience and verify it. No application runtime environment variables or secrets are required. Never add billing-enabled services as a fallback when quotas or source access fail.
