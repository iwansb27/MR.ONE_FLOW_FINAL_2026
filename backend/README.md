# Backend

Minimal Node.js/Express backend for secure JSON2Video API access.

Setup: copy `.env.example` to `.env`, set `JSON2VIDEO_API_KEY`, run `npm install`, then `npm run dev`.

Endpoints: `GET /api/health`, `POST /api/json2video/render`, `GET /api/json2video/status/:projectId`.

The JSON2Video key stays server-side and is never exposed to the browser.
