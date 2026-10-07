import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { completeVerification, processDeliveries } from '../src/workflow.js';
function fixture() {
 const db = new DatabaseSync(':memory:');
 db.exec(`CREATE TABLE enquiries(request_id TEXT PRIMARY KEY,verified INTEGER,status TEXT,updated_at TEXT);
 CREATE TABLE deliveries(request_id TEXT,channel TEXT,status TEXT DEFAULT 'pending',attempts INTEGER DEFAULT 0,updated_at TEXT,PRIMARY KEY(request_id,channel));
 INSERT INTO enquiries VALUES('test',0,'NEW','');`);
 return db;
}
test('verification atomically creates one set of jobs and cannot regress booking status', () => {
 const db=fixture(); assert.equal(completeVerification(db,'test'),true);
 db.exec("UPDATE enquiries SET status='CONFIRMED'");
 assert.equal(completeVerification(db,'test'),false);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM deliveries').get().n,2);
 assert.equal(db.prepare('SELECT status FROM enquiries').get().status,'CONFIRMED'); db.close();
});
test('failure to enqueue rolls back verification', () => {
 const db=fixture(); db.exec('DROP TABLE deliveries');
 assert.throws(()=>completeVerification(db,'test'));
 assert.equal(db.prepare('SELECT verified FROM enquiries').get().verified,0); db.close();
});
test('delivery state distinguishes missing configuration and API error; repeated worker does not resend', async () => {
 const db=fixture(); completeVerification(db,'test'); let calls=0;
 const providers={email:async()=>{calls++;return {skipped:true};},whatsapp:async()=>{calls++;return {error:{message:'rejected'}};}};
 await processDeliveries(db,providers); await processDeliveries(db,providers);
 assert.equal(calls,2);
 assert.deepEqual(db.prepare('SELECT status FROM deliveries ORDER BY channel').all().map(x=>x.status),['not_configured','failed']); db.close();
});
test('provider acceptance is recorded, not claimed as recipient delivery', async () => {
 const db=fixture(); completeVerification(db,'test');
 await processDeliveries(db,{email:async()=>({id:'email-id'}),whatsapp:async()=>({sid:'message-id'})});
 assert(db.prepare('SELECT status FROM deliveries').all().every(x=>x.status==='accepted')); db.close();
});
