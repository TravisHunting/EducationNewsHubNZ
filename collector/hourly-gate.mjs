export const HOUR_MS = 60 * 60 * 1000;

// One Durable Object owns this gate. Synchronous statements cannot interleave;
// the RPC response is held until SQLite commits the claimed slot.
export function claimHour(sql, now, previousCheck = 0) {
  sql.exec('CREATE TABLE IF NOT EXISTS hourly_gate (id INTEGER PRIMARY KEY, next_allowed_at INTEGER NOT NULL)');
  sql.exec('INSERT OR IGNORE INTO hourly_gate VALUES (1, ?)', previousCheck ? previousCheck + HOUR_MS : 0);
  return sql.exec('UPDATE hourly_gate SET next_allowed_at = ? WHERE id = 1 AND next_allowed_at <= ? RETURNING next_allowed_at', now + HOUR_MS, now).toArray().length === 1;
}
