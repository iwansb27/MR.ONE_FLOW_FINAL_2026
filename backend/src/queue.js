const fs = require('node:fs/promises');
const path = require('node:path');

const QUEUE_ROOT = path.resolve(process.cwd(), '..', 'queue');

const VALID_STATUSES = ['DRAFT', 'REVIEW', 'APPROVED', 'READY', 'POSTING', 'POSTED', 'FAILED', 'RETRY'];
const TRANSITIONS = {
  DRAFT: ['REVIEW'],
  REVIEW: ['APPROVED', 'DRAFT'],
  APPROVED: ['READY', 'REVIEW'],
  READY: ['POSTING'],
  POSTING: ['POSTED', 'FAILED'],
  FAILED: ['RETRY'],
  RETRY: ['POSTING'],
  POSTED: []
};

function safeId(id) {
  return /^MR-\d{8}-\d{3}$/.test(id);
}

function validateRecord(record) {
  const errors = [];
  if (!record || typeof record !== 'object') return ['record must be an object'];
  if (!safeId(record.id)) errors.push('id must match MR-YYYYMMDD-###');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(record.date || '')) errors.push('date must be YYYY-MM-DD');
  if (!/^\d{2}:\d{2}$/.test(record.time || '')) errors.push('time must be HH:MM');
  if (!['shopee', 'tiktok', 'lazada'].includes(record.platform)) errors.push('platform must be shopee, tiktok, or lazada');
  if (!record.product_name || typeof record.product_name !== 'string') errors.push('product_name is required');
  if (!record.caption || typeof record.caption !== 'string') errors.push('caption is required');
  if (!record.description || typeof record.description !== 'string') errors.push('description is required');
  if (!record.affiliate_link || !/^https?:\/\//i.test(record.affiliate_link)) errors.push('affiliate_link must be a valid http(s) URL');
  if (!['facebook_primary'].includes(record.target_facebook)) errors.push('target_facebook must be facebook_primary');
  if (!VALID_STATUSES.includes(record.status)) errors.push('invalid status');
  if (!Number.isInteger(record.retry_count) || record.retry_count < 0) errors.push('retry_count must be a non-negative integer');
  return errors;
}

async function ensureQueue() {
  await fs.mkdir(QUEUE_ROOT, { recursive: true });
}

function recordPath(id) {
  return path.join(QUEUE_ROOT, `${id}.json`);
}

async function readRecord(id) {
  if (!safeId(id)) throw new Error('invalid record id');
  const raw = await fs.readFile(recordPath(id), 'utf8');
  return JSON.parse(raw);
}

async function writeRecord(record) {
  const errors = validateRecord(record);
  if (errors.length) throw new Error(errors.join('; '));
  await ensureQueue();
  const normalized = {
    ...record,
    retry_count: record.retry_count ?? 0,
    updated_at: new Date().toISOString()
  };
  await fs.writeFile(recordPath(record.id), JSON.stringify(normalized, null, 2) + '\n', 'utf8');
  return normalized;
}

async function createRecord(record) {
  if (!safeId(record?.id)) throw new Error('invalid or missing id');
  try { await fs.access(recordPath(record.id)); throw new Error(`record ${record.id} already exists`); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  return writeRecord({ ...record, created_at: record.created_at || new Date().toISOString() });
}

async function transition(id, nextStatus, patch = {}) {
  const current = await readRecord(id);
  if (!VALID_STATUSES.includes(nextStatus)) throw new Error('invalid target status');
  if (!TRANSITIONS[current.status]?.includes(nextStatus)) throw new Error(`invalid transition ${current.status} -> ${nextStatus}`);
  return writeRecord({ ...current, ...patch, status: nextStatus });
}

async function listRecords() {
  await ensureQueue();
  const names = (await fs.readdir(QUEUE_ROOT)).filter(name => /^MR-\d{8}-\d{3}\.json$/.test(name)).sort();
  const records = [];
  for (const name of names) records.push(JSON.parse(await fs.readFile(path.join(QUEUE_ROOT, name), 'utf8')));
  return records.sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
}

function isReadyToPost(record, now = new Date()) {
  if (record.status !== 'READY') return false;
  const scheduled = new Date(`${record.date}T${record.time}:00+07:00`);
  return scheduled <= now;
}

module.exports = { VALID_STATUSES, TRANSITIONS, validateRecord, createRecord, readRecord, writeRecord, transition, listRecords, isReadyToPost };
