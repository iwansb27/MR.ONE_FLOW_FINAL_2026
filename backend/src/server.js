import 'dotenv/config';
import express from 'express';
import cors from 'cors';
const app = express();
const port = Number(process.env.PORT || 8787);
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'mr-one-backend', json2videoConfigured: Boolean(process.env.JSON2VIDEO_API_KEY) }));
app.post('/api/json2video/render', async (req, res) => {
  const apiKey = process.env.JSON2VIDEO_API_KEY;
  if (!apiKey) return res.status(500).json({ ok: false, error: 'JSON2VIDEO_API_KEY is not configured' });
  const { movie } = req.body || {};
  if (!movie || typeof movie !== 'object') return res.status(400).json({ ok: false, error: 'movie object is required' });
  try {
    const response = await fetch('https://api.json2video.com/v2/movies', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey }, body: JSON.stringify(movie) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return res.status(response.status).json({ ok: false, error: 'JSON2Video request failed', details: data });
    return res.json({ ok: true, ...data });
  } catch (error) { return res.status(502).json({ ok: false, error: 'Unable to reach JSON2Video', details: error.message }); }
});
app.get('/api/json2video/status/:projectId', async (req, res) => {
  const apiKey = process.env.JSON2VIDEO_API_KEY;
  if (!apiKey) return res.status(500).json({ ok: false, error: 'JSON2VIDEO_API_KEY is not configured' });
  try {
    const response = await fetch(`https://api.json2video.com/v2/movies/${encodeURIComponent(req.params.projectId)}`, { headers: { 'x-api-key': apiKey } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return res.status(response.status).json({ ok: false, error: 'JSON2Video status request failed', details: data });
    return res.json({ ok: true, ...data });
  } catch (error) { return res.status(502).json({ ok: false, error: 'Unable to reach JSON2Video', details: error.message }); }
});
app.listen(port, () => console.log(`MR.ONE backend listening on port ${port}`));
