import express from 'express';
import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';

const app = express();
const dir = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(dir, 'output');
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(dir, 'public')));

app.get('/health', (_req, res) => res.json({
  ok: true,
  app: 'AI News & Summary Video Studio',
  version: '1.2.0',
  openrouter_configured: Boolean(process.env.OPENROUTER_API_KEY),
  video_renderer: Boolean(ffmpegPath)
}));

function buildDemoStoryboard(text) {
  const clean = text.replace(/\s+/g, ' ').trim();
  const excerpt = clean.split(' ').filter(Boolean).slice(0, 24).join(' ');
  return { mode: 'demo', title: excerpt ? excerpt.slice(0, 80) : 'Ringkasan berita', total_duration_sec: 60,
    scenes: [
      { scene: 1, duration_sec: 6, narration: excerpt || 'Masukkan bahan berita untuk membuat storyboard.', on_screen_text: 'PEMBUKA', visual_description: 'Visual pembuka berita yang relevan', visual_prompt: 'news opening, Indonesian news style' },
      { scene: 2, duration_sec: 8, narration: 'Poin utama berita diringkas secara singkat dan jelas.', on_screen_text: 'POIN UTAMA', visual_description: 'Visual utama sesuai isi berita', visual_prompt: 'relevant news visual, realistic' },
      { scene: 3, duration_sec: 8, narration: 'Konteks penting dari informasi yang diberikan.', on_screen_text: 'KONTEKS', visual_description: 'Visual pendukung konteks', visual_prompt: 'contextual news visual' },
      { scene: 4, duration_sec: 8, narration: 'Detail penting berikutnya dari bahan sumber.', on_screen_text: 'DETAIL', visual_description: 'Visual detail berita', visual_prompt: 'detailed news visual' },
      { scene: 5, duration_sec: 8, narration: 'Dampak atau perkembangan yang disebutkan dalam sumber.', on_screen_text: 'PERKEMBANGAN', visual_description: 'Visual perkembangan', visual_prompt: 'current event visual' },
      { scene: 6, duration_sec: 8, narration: 'Informasi tambahan yang relevan dari sumber.', on_screen_text: 'INFORMASI', visual_description: 'Visual pendukung', visual_prompt: 'supporting news visual' },
      { scene: 7, duration_sec: 6, narration: 'Kesimpulan singkat berdasarkan bahan yang diberikan.', on_screen_text: 'KESIMPULAN', visual_description: 'Visual penutup informasi', visual_prompt: 'news conclusion visual' },
      { scene: 8, duration_sec: 8, narration: 'Itulah ringkasan berita kali ini.', on_screen_text: 'SELESAI', visual_description: 'Visual outro sederhana', visual_prompt: 'clean news outro' }
    ],
    closing: 'Ikuti untuk ringkasan berita berikutnya.', hashtags: ['#berita', '#ringkasan', '#informasi']
  };
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpegPath, args);
    let err = '';
    p.stderr.on('data', d => { err += d.toString(); });
    p.on('close', code => code === 0 ? resolve() : reject(new Error(err.slice(-3000) || `ffmpeg exit ${code}`)));
    p.on('error', reject);
  });
}

app.post('/api/storyboard', async (req, res) => {
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  if (!text) return res.status(400).json({ error: 'Teks berita wajib diisi.' });
  if (!process.env.OPENROUTER_API_KEY) return res.json({ ...buildDemoStoryboard(text), message: 'OpenRouter API key belum dipasang. Struktur storyboard siap diuji.' });
  return res.status(501).json({ error: 'OpenRouter key terdeteksi, tetapi engine AI belum diaktifkan pada build ini.' });
});

app.post('/api/render', async (req, res) => {
  try {
    const storyboard = req.body?.storyboard;
    if (!storyboard?.scenes?.length) return res.status(400).json({ error: 'Storyboard tidak valid.' });
    if (!ffmpegPath) return res.status(500).json({ error: 'Video renderer tidak tersedia.' });
    await fs.mkdir(outputDir, { recursive: true });
    const job = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const work = path.join(outputDir, job);
    await fs.mkdir(work, { recursive: true });
    const parts = [];
    const font = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
    const fontOpt = existsSync(font) ? `:fontfile=${font}` : '';

    for (let i = 0; i < storyboard.scenes.length; i++) {
      const s = storyboard.scenes[i];
      const dur = Math.max(1, Number(s.duration_sec) || 5);
      const textFile = path.join(work, `text-${i}.txt`);
      const label = String(s.on_screen_text || s.narration || `SCENE ${i + 1}`).replace(/\r?\n/g, ' ').slice(0, 180);
      await fs.writeFile(textFile, label, 'utf8');
      const out = path.join(work, `part-${i}.mp4`);
      await runFfmpeg(['-y', '-f', 'lavfi', '-i', 'color=c=black:s=1080x1920:r=30', '-t', String(dur), '-vf', `drawtext=textfile='${textFile.replace(/'/g, "'\\''")}':fontcolor=white:fontsize=64:box=1:boxborderw=24:boxcolor=black@0.45:x=(w-text_w)/2:y=(h-text_h)/2${fontOpt}`, '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', out]);
      parts.push(out);
    }

    const list = path.join(work, 'concat.txt');
    await fs.writeFile(list, parts.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n'), 'utf8');
    const finalPath = path.join(outputDir, `${job}.mp4`);
    await runFfmpeg(['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', finalPath]);
    await fs.rm(work, { recursive: true, force: true });
    setTimeout(() => fs.rm(finalPath, { force: true }).catch(() => {}), 30 * 60 * 1000).unref();
    res.json({ ok: true, mode: 'video-demo', audio: 'silent', message: 'MP4 berhasil dibuat. TTS akan diaktifkan setelah OpenRouter key dipasang.', download: `/output/${path.basename(finalPath)}` });
  } catch (e) {
    res.status(500).json({ error: 'Gagal membuat video.', detail: e.message });
  }
});

app.use('/output', express.static(outputDir, { maxAge: 0 }));
const port = process.env.PORT || 3000;
app.listen(port, () => console.log('News Studio listening on ' + port));
