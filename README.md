# Education Intelligence — Aotearoa

Read-only concept demo at https://edu.travishunting.com. Visitors can search and filter the evidence snapshot, browse topic insights and source diagnostics, and build research packs in Markdown, JSON, JSONL or CSV. Record details contain saved excerpts and links to publisher pages and documents. Date filters are relative to the snapshot.

The fixed dataset is `public/api/data`, served as JSON at `/api/data`. It contains the published feed metadata and excerpts from the final captured collection. The saved AI briefing is included when available. `public/llms.txt` describes the public read-only interface.

## Cloudflare build

From this directory with Node.js 22.13 or later:

```sh
npm ci
npm test
npm run build:cloudflare
npx wrangler deploy --config wrangler.jsonc --dry-run
```

The `education-intelligence` Worker serves `dist/cloudflare/assets` at the existing hostname. The build bundles the React client and snapshot assets. The deployment has no runtime script, collection endpoints, storage bindings or schedules. Use the Cloudflare connector for deployments. Historical collection and archive source remains in the repository.
