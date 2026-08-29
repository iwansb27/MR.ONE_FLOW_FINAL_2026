import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { validateRecord, isReadyToPost, VALID_STATUSES } from './queue.js';
import { createRecord, getRecord, listRecords, transitionRecord, repo, branch } from './github-queue.js';

const app = express();
const port = Number(process.env.PORT || 8787);
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req,res) => res.json({ ok:true, service:'mr-one-backend', queue:'github', repository:repo, branch, json2videoConfigured:Boolean(process.env.JSON2VIDEO_API_KEY) }));

app.get('/api/queue', async (_req,res) => { try{return res.json({ok:true,records:await listRecords()});}catch(error){return res.status(500).json({ok:false,error:error.message});} });

app.get('/api/queue/ready/due', async (_req,res) => { try{return res.json({ok:true,records:(await listRecords()).filter(isReadyToPost)});}catch(error){return res.status(500).json({ok:false,error:error.message});} });

app.get('/api/queue/:id', async (req,res) => { try{return res.json({ok:true,record:await getRecord(req.params.id)});}catch(error){return res.status(error.status===404?404:400).json({ok:false,error:error.message});} });

app.post('/api/queue', async (req,res) => { const errors=validateRecord(req.body);if(errors.length)return res.status(400).json({ok:false,errors});try{await createRecord(req.body);return res.status(201).json({ok:true,record:req.body});}catch(error){return res.status(error.status===422?422:409).json({ok:false,error:error.message});} });

app.post('/api/queue/:id/transition', async (req,res) => { const {status,patch={}}=req.body||{};if(!VALID_STATUSES.includes(status))return res.status(400).json({ok:false,error:'invalid status'});try{return res.json({ok:true,record:await transitionRecord(req.params.id,status,patch)});}catch(error){return res.status(error.status===404?404:409).json({ok:false,error:error.message});} });

app.post('/api/json2video/render', async (req,res) => {
  const apiKey=process.env.JSON2VIDEO_API_KEY;
  if(!apiKey)return res.status(500).json({ok:false,error:'JSON2VIDEO_API_KEY is not configured'});
  const {movie}=req.body||{};
  if(!movie||typeof movie!=='object')return res.status(400).json({ok:false,error:'movie object is required'});
  try{const response=await fetch('https://api.json2video.com/v2/movies',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':apiKey},body:JSON.stringify(movie)});const data=await response.json().catch(()=>({}));if(!response.ok)return res.status(response.status).json({ok:false,error:'JSON2Video request failed',details:data});return res.json({ok:true,...data});}catch(error){return res.status(502).json({ok:false,error:'Unable to reach JSON2Video',details:error.message});}
});

app.get('/api/json2video/status/:projectId', async (req,res) => {
  const apiKey=process.env.JSON2VIDEO_API_KEY;
  if(!apiKey)return res.status(500).json({ok:false,error:'JSON2VIDEO_API_KEY is not configured'});
  try{const response=await fetch(`https://api.json2video.com/v2/movies/${encodeURIComponent(req.params.projectId)}`,{headers:{'x-api-key':apiKey}});const data=await response.json().catch(()=>({}));if(!response.ok)return res.status(response.status).json({ok:false,error:'JSON2Video status request failed',details:data});return res.json({ok:true,...data});}catch(error){return res.status(502).json({ok:false,error:'Unable to reach JSON2Video',details:error.message});}
});

app.listen(port,()=>console.log(`MR.ONE backend listening on ${port}`));
