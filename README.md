# Education Intelligence — Aotearoa

A New Zealand education research desk hosted with Sites at edu.travishunting.com. The app includes searchable source records, evidence detail panels, topic exploration, daily AI briefings with validated citation IDs, source health diagnostics, and a research pack builder.

## Architecture

- The root app uses React, TypeScript, Vinext and the bundled Sites components. Sites owns the application deployment and access controls; its identity is in `.openai/hosting.json`.
- `collector/` is a separate Cloudflare Worker, provisioned through the Cloudflare MCP. A Workers KV namespace holds independent per-source collections and the daily briefing. Sites reads the public metadata endpoint over HTTPS across the hosting boundary.
- A Cron Trigger checks one source every 15 minutes, rotating across nine sources (a full cycle takes 2 hours 15 minutes). Each check discovers up to 24 links and processes up to five publications. Up to 250 records per source are retained. Older records beyond this rolling cap are removed from the collection.
- Workers AI generates a briefing at most once every 24 hours using `@cf/meta/llama-3.3-70b-instruct-fp8-fast`. The sample includes up to six records per source. Briefings are explicitly labelled as AI interpretation, and cited record IDs must exist in that sample. The model receives headlines and short metadata, not complete articles. Citation existence does not guarantee factual accuracy; readers should verify the originals.
- The public collector only exposes public-source metadata. Its refresh and briefing generation endpoints require a secret. The secret is configured separately in Cloudflare and Sites; it is never stored in this repository or the browser.
- The Site is initially owner-private. The custom domain follows the same access policy.

## Sources and collection

Connectors are in `lib/sources.mjs`: Ministry of Education, NCEA Education, Education Counts, Education Review Office, NZQA, Tertiary Education Commission, Beehive Education, RNZ Education, and NZCER.

The initial verified collection contains 46 records from NCEA, NZQA, ERO, RNZ and NZCER. The Ministry news index currently renders its results in JavaScript; automated HTML discovery is marked as needing attention. Education Counts, TEC and Beehive restricted the initial automated requests. Their connectors remain visible and scheduled; restrictions are never bypassed. The source directory reports current outcomes, which may differ by time and hosting location.

Collection checks robots rules, rejects off-list hosts and unsafe redirects, enforces a 12-second per-request timeout and a 2 MB streaming size limit, waits between requests, and preserves previous records when a publisher fails. Redirect targets are checked before fetching. Records are deduplicated by canonical URL and retain first-discovery timestamps. Explicit publication dates are kept separate from collection timestamps; unknown publication dates stay null. The source directory records the last check, result, record count and any failure.

Only headlines and short publisher-provided descriptions are collected; RNZ uses headlines only. Original PDF, Word, spreadsheet and CSV links are retained when discovered on approved hosts. Original files are not copied or analysed. This app does not promise full-text coverage or infer metrics from documents it has not read.

## Research packs

Select records with the Pack checkbox, or filter the collection by topic, source, publication period and keyword. Export Markdown, JSON, JSONL or CSV. Selection is temporary for the current visit. Records include original URLs, IDs, source names, dates, topics, signal labels, metadata excerpts and document links. Markdown and JSON include research instructions; JSON also includes a coverage manifest and source status. CSV cells are protected against spreadsheet formula interpretation.

Machine-readable endpoints (subject to the Site's access controls):

- `/api/export?format=json`
- `/api/export?format=jsonl`
- `/api/export?format=markdown`
- `/api/export?format=csv`
- `/llms.txt`

An optional `topic` query parameter narrows server-generated downloads. The interactive pack builder additionally supports search, source, period and exact record selection.

## Development

Use Node 22.13 or later. Run `npm ci`, `npm run dev`, `npm test`, and `npm run build`. In this Windows environment, the native npm shim can misresolve its root; `node C:/Nodejs/Nodejs2217/node_modules/npm/bin/npm-cli.js run build` is the equivalent fallback. The Sites build helper is attempted first for publishing.

The app reads the live collector and falls back to `data/snapshot.json` with a visible dated warning if the collector is unavailable. `node scripts/collect.mjs` refreshes the local snapshot. To refresh specific connectors, pass their IDs, for example `node scripts/collect.mjs ncea nzqa`. Do not run multiple snapshot-writing commands concurrently.

Hosted environment values: `COLLECTOR_URL` and secret `COLLECTOR_TOKEN`. Refreshes reuse scans younger than one hour. Development refresh requests require the same secret configuration; without it the UI gives an explanatory error. The automatic collector remains independent of the local preview.

## Cloudflare collector deployment

`collector/wrangler.jsonc` records the account resources and schedule. The current Worker is `education-intelligence-collector`; its read endpoint is `https://education-intelligence-collector.travis-hunting.workers.dev/data`. Bundle `collector/worker.mjs` with the installed esbuild for a single-module upload, or use Wrangler with authorized account access. Preserve the EVIDENCE KV binding, AI binding and COLLECTOR_TOKEN secret on updates. Changes to the shared collector or source configuration require redeploying this separate Worker as well as the Site.

Source acquisition, parser and export regression tests are in `tests/collector.test.ts`. Type checking: `node node_modules/typescript/bin/tsc --noEmit`. The test runner bundles tests into ignored `work/` and runs Node's test runner. No browser automation is required for this workflow.

## Publishing the app

Use the Sites building and hosting skills. Build and validate the app, commit the exact source, push to the Sites source repository with a short-lived per-command credential, package the validated output, save a version and deploy. Verify terminal deployment success. Keep the current Site identity, custom domain and access policy. Runtime values belong in Sites settings, not the manifest. DNS for edu.travishunting.com is managed through the Cloudflare MCP using the exact records returned by Sites custom-domain setup.
