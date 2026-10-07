// Save verification and delivery jobs in one transaction. Repeated verification
// never regresses a booking or creates duplicate jobs.
export function completeVerification(db, requestId) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const changed = db.prepare("UPDATE enquiries SET verified=1,status='VERIFIED',updated_at=? WHERE request_id=? AND verified=0").run(new Date().toISOString(), requestId);
    if (changed.changes) {
      for (const channel of ['email','whatsapp']) db.prepare("INSERT OR IGNORE INTO deliveries(request_id,channel,status,updated_at) VALUES (?,?,'pending',?)").run(requestId, channel, new Date().toISOString());
    }
    db.exec('COMMIT');
    return Boolean(changed.changes);
  } catch(error) { db.exec('ROLLBACK'); throw error; }
}
let running = false;
export async function processDeliveries(db, providers) {
  if (running) return;
  running = true;
  try {
    const jobs = db.prepare("SELECT * FROM deliveries WHERE status='pending' ORDER BY updated_at LIMIT 20").all();
    for (const job of jobs) {
      const claimed = db.prepare("UPDATE deliveries SET status='sending',attempts=attempts+1,updated_at=? WHERE request_id=? AND channel=? AND status='pending'").run(new Date().toISOString(), job.request_id, job.channel);
      if (!claimed.changes) continue;
      let status;
      try {
        const lead = db.prepare('SELECT * FROM enquiries WHERE request_id=? AND verified=1').get(job.request_id);
        if (!lead) throw Error('Unverified request');
        const result = await providers[job.channel](lead);
        status = result?.skipped ? 'not_configured' : result?.error ? 'failed' : 'accepted';
      } catch { status = 'failed'; }
      db.prepare('UPDATE deliveries SET status=?,updated_at=? WHERE request_id=? AND channel=?').run(status, new Date().toISOString(), job.request_id, job.channel);
    }
  } finally { running = false; }
}
