import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRecord, readRecord, transition, listRecords, isReadyToPost } from '../src/queue.js';

const id = 'MR-20991231-001';
const queueRoot = path.resolve(process.cwd(), '..', 'queue');
const file = path.join(queueRoot, `${id}.json`);

const base = {
  id,
  date: '2099-12-31',
  time: '07:00',
  platform: 'shopee',
  product_name: 'MR.ONE Runtime Test Product',
  caption: 'Runtime test caption',
  description: 'Runtime test description',
  affiliate_link: 'https://example.com/product',
  target_facebook: 'facebook_primary',
  status: 'DRAFT',
  retry_count: 0
};

await fs.rm(file, { force: true });

const created = await createRecord(base);
assert.equal(created.status, 'DRAFT');

await assert.rejects(() => createRecord(base), /already exists/);

let record = await transition(id, 'REVIEW');
assert.equal(record.status, 'REVIEW');
record = await transition(id, 'APPROVED');
assert.equal(record.status, 'APPROVED');
record = await transition(id, 'READY');
assert.equal(record.status, 'READY');
assert.equal(isReadyToPost(record, new Date('2100-01-01T00:00:00+07:00')), true);

record = await transition(id, 'POSTING');
assert.equal(record.status, 'POSTING');
record = await transition(id, 'FAILED', { error: 'simulated failure' });
assert.equal(record.status, 'FAILED');
record = await transition(id, 'RETRY', { retry_count: 1 });
assert.equal(record.status, 'RETRY');
record = await transition(id, 'POSTING');
assert.equal(record.status, 'POSTING');
record = await transition(id, 'POSTED', { posted_at: new Date().toISOString() });
assert.equal(record.status, 'POSTED');

await assert.rejects(() => transition(id, 'POSTING'), /invalid transition/);

const reread = await readRecord(id);
assert.equal(reread.status, 'POSTED');
assert.equal(reread.retry_count, 1);

const records = await listRecords();
assert.ok(records.some(item => item.id === id));

await fs.rm(file, { force: true });
console.log('MR.ONE Queue runtime test: PASS');
