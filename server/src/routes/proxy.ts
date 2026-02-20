import express from 'express';
import fetch from 'node-fetch';
const router = express.Router();

// Whitelisted hosts to avoid open proxy abuse
const ALLOWED_HOSTS = new Set([
  'www.google.com',
  'maps.google.com',
  'www.googleusercontent.com',
  'storage.googleapis.com',
  'maps.app.goo.gl',
  'www.gstatic.com'
]);

router.get('/fetch', async (req, res) => {
  try {
    const target = String(req.query.url || '');
    if (!target) return res.status(400).json({ error: 'Missing url parameter' });

    let parsed: URL;
    try { parsed = new URL(target); } catch (e) { return res.status(400).json({ error: 'Invalid url' }); }

    if (!ALLOWED_HOSTS.has(parsed.hostname)) {
      return res.status(403).json({ error: 'Host not allowed by proxy' });
    }

    const response: any = await fetch(target, { redirect: 'follow' });

    // Forward status and content-type (use any to handle node-fetch v2 vs v3 differences)
    const contentType = (response.headers && (response.headers.get ? response.headers.get('content-type') : response.headers['content-type'])) || 'application/octet-stream';
    res.status(response.status || 200);
    res.setHeader('Content-Type', contentType);

    // Return body as buffer to support KML/KMZ/GeoJSON or HTML
    let nodeBuf: Buffer;
    if (response.arrayBuffer) {
      const buf = await response.arrayBuffer();
      nodeBuf = Buffer.from(buf);
    } else if (response.buffer) {
      nodeBuf = await response.buffer();
    } else {
      const txt = await response.text();
      nodeBuf = Buffer.from(txt);
    }
    res.send(nodeBuf);
  } catch (err) {
    console.error('Proxy fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

export default router;
