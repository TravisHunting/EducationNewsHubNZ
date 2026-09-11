declare namespace Cloudflare {
  interface Env {
    COLLECTOR_URL?: string;
    COLLECTOR_TOKEN?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
