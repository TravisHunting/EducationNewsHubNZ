# Education Intelligence — Aotearoa

NZ education research desk at https://edu.travishunting.com, hosted with Sites.

## Collection architecture

GitHub Actions supplies only the daily clock. The scheduled workflow sends one authenticated request per source to the **Site backend**. The backend discovers publications, fetches their full pages and linked files, and writes directly to **Sites-managed D1 and R2**. The website does not fetch a GitHub snapshot. No separate Worker or storage is created in Travis's Cloudflare account.

- D1 holds publication metadata, provenance, collection health and atomic daily reservations.
- R2 holds the complete fetched HTML, complete extracted page text, and original document bytes (PDF, Word, Excel and CSV).
- Cards display short summaries. Record details load saved full text and link to downloadable original HTML and archived documents.
- Markdown, JSON, JSONL and CSV exports include complete extracted page text. Binary document contents are available through archive download URLs; they are not converted to text or embedded in the exports.
- A page or document that exceeds its limit fails explicitly; the collector never silently stores a truncated file as complete. JavaScript-only content, authentication, paywalls, robots exclusions and bot checks are not bypassed.

The extracted text preserves the whole readable HTML body rather than guessing a publisher-specific article boundary; it can include navigation or other page furniture. The original HTML remains available for later re-extraction. Only allowlisted publisher hosts are contacted. Off-host attachments are not fetched.

## Schedule and authentication

The public repository workflow runs at 17:17 UTC daily (05:17 NZST / 06:17 NZDT), and supports owner workflow dispatch. It has read-only source access and permission to request a short-lived GitHub OIDC identity token. No shared secret or runtime environment variable setup is needed.

The backend verifies the GitHub signature, issuer, audience, expiry, subject, immutable repository and owner IDs, public visibility, main branch, exact workflow path and scheduled/manual event. Keys come only from GitHub's fixed JWKS endpoint. Unsigned callers cannot collect. See [GitHub OIDC claims](https://docs.github.com/en/actions/reference/security/oidc).

Each source receives at most one reservation per rolling 24 hours. The D1 conditional insert/update happens before publisher I/O; duplicate requests and failed jobs do not refund it. GitHub waits for each response while the Site performs the work, then proceeds to the next source even after a source failure. No background work is entrusted to a short post-response lifetime.

Per source run: up to five publications, six new document downloads, 45 publisher HTTP requests and an eight-minute collection deadline. Each fetch has a 12-second timeout and bounded redirects. HTML is limited to 2 MB, documents to 10 MB and robots files to 512 KB. The workflow has a 90-minute ceiling for all nine sequential requests. Download budgets and failures are reported in document/source status. Existing archived document files are reused; their retrieval dates remain intact.

## Persistence and migration

On each source's first run, its legacy metadata is copied into D1, then records without archived content are prioritized for full retrieval. The dated bundled legacy snapshot is an explicitly labelled fallback when Site storage is unavailable. Its old AI brief remains available as archived interpretation; no new inference calls are made.

The feed reads the latest 250 records per source. Older publication metadata and content remain in backend storage and can be retrieved by record ID. Content keys identify revisions; writes publish metadata only after content objects have saved. An interrupted collection retains each already saved record. Storage is not capped at the old 900 KB snippet snapshot; accumulated archive storage remains subject to Sites quotas and terms. Source changes can retain earlier object revisions.

Endpoints:

- GET /api/data — metadata and source health from Site storage.
- POST /api/collect?source=ministry — workflow identity required; scraping runs in the Site backend.
- GET /api/publications/ID — complete saved extracted text and provenance.
- GET /api/publications/ID?format=html — original HTML, forced download so publisher scripts cannot run on the Site origin.
- GET /api/publications/ID?document=0 — complete original document file.
- GET /api/export?format=json — streamed full-text research export; also jsonl, markdown and csv, with optional topic.
- POST /api/export?format=json — read-only export of a bounded JSON ids array selected in the UI.
- POST /api/refresh — remains closed; visitors reload saved data rather than trigger scraping.

Exports stream one record at a time to keep full archives out of Worker memory. Missing content is labelled, not replaced with invented full text. Publisher material is untrusted evidence and retains its original reuse terms.

## Development and publishing

Use Node 22.13+: npm ci, npm run dev, npm test, npm run build. On this Windows installation the npm shim may require invoking C:/Nodejs/Nodejs2217/node_modules/npm/bin/npm-cli.js directly with node. Generate D1 migrations with npm run db:generate and apply them to local storage before previewing backend data. Sites applies packaged migrations during deployment.

The Sites manifest declares only logical DB and BUCKET bindings. Sites owns resource provisioning and wiring. Do not deploy a replacement service with Wrangler or add personal Cloudflare credentials. Publish through the Sites skills after validating source, migration, build, and Worker integration tests. Existing public access requires publication approval.

Tests exercise full text beyond the old snippet cutoff, raw HTML and PDF byte storage, all four exports, workflow identity rejection, concurrent reservations, duplicate URL preservation, robots and redirect restrictions, and retaining old content after failures. The previous personal-account retirement audit remains in docs/COST-PROTECTION.md as historical evidence; its former GitHub-storage design is superseded here.
