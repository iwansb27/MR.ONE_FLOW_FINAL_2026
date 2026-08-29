import fs from 'node:fs/promises';
import path from 'node:path';

const QUEUE_ROOT = path.resolve(process.cwd(), '..', 'queue');
const VALID_STATUSES = ['DRAFT','REVIEW','APPROVED','READY','POSTING','POSTED','FAILED','RETRY'];
const TRANSITIONS = { DRAFT:['REVIEW'], REVIEW:['APPROVED','DRAFT'], APPROVED:['READY','REVIEW'], READY:['POSTING'], POSTING:['POSTED','FAILED'], FAILED:['RETRY'], RETRY:['POSTING'], POSTED:[] };
const safeId = id => /^MR-\d{8}-\d{3}$/.test(id);

export function validateRecord(record) {
  const errors=[];
  if (!record || typeof record !== 'object') return ['record must be an object'];
  if (!safeId(record.id)) errors.push('id must match MR-YYYYMMDD-###');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(record.date || '')) errors.push('date must be YYYY-MM-DD');
  if (!/^\d{2}:\d{2}$/.test(record.time || '')) errors.push('time must be HH:MM');
  if (!['shopee','tiktok','lazada'].includes(record.platform)) errors.push('platform must be shopee, tiktok, or lazada');
  for (const field of ['product_name','caption','description']) if (!record[field] || typeof record[field] !== 'string') errors.push(`${field} is required`);
  if (!record.affiliate_link || !/^https?:\/\//i.test(record.affiliate_link)) errors.push('affiliate_link must be a valid http(s) URL');
  if (record.target_facebook !== 'facebook_primary') errors.push('target_facebook must be facebook_primary');
  if (!VALID_STATUSES.includes(record.status)) errors.push('invalid status');
  if (!Number.isInteger(record.retry_count) || record.retry_count < 0) errors.push('retry_count must be a non-negative integer');
  return errors;
}
const ensureQueue=()=>fs.mkdir(QUEUE_ROOT,{recursive:true});
const recordPath=id=>path.join(QUEUE_ROOT,`${id}.json`);
export async function readRecord(id){if(!safeId(id)) throw new Error('invalid record id');return JSON.parse(await fs.readFile(recordPath(id),'utf8'));}
export async function writeRecord(record){const errors=validateRecord(record);if(errors.length) throw new Error(errors.join('; '));await ensureQueue();const normalized={...record,retry_count:record.retry_count??0,updated_at:new Date().toISOString()};await fs.writeFile(recordPath(record.id),JSON.stringify(normalized,null,2)+'\n','utf8');return normalized;}
export async function createRecord(record){if(!safeId(record?.id)) throw new Error('invalid or missing id');try{await fs.access(recordPath(record.id));throw new Error(`record ${record.id} already exists`);}catch(error){if(error.code!=='ENOENT') throw error;}return writeRecord({...record,created_at:record.created_at||new Date().toISOString()});}
export async function transition(id,nextStatus,patch={}){const current=await readRecord(id);if(!VALID_STATUSES.includes(nextStatus)) throw new Error('invalid target status');if(!TRANSITIONS[current.status]?.includes(nextStatus)) throw new Error(`invalid transition ${current.status} -> ${nextStatus}`);return writeRecord({...current,...patch,status:nextStatus});}
export async function listRecords(){await ensureQueue();const names=(await fs.readdir(QUEUE_ROOT)).filter(name=>/^MR-\d{8}-\d{3}\.json$/.test(name));const records=await Promise.all(names.map(name=>fs.readFile(path.join(QUEUE_ROOT,name),'utf8').then(JSON.parse)));return records.sort((a,b)=>`${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));}
export function isReadyToPost(record,now=new Date()){return record.status==='READY'&&new Date(`${record.date}T${record.time}:00+07:00`)<=now;}
export {VALID_STATUSES,TRANSITIONS};
