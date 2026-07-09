const express = require('express');
const db      = require('../db');
const router  = express.Router();

function seededRng(seed) {
  let s = seed;
  return () => {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function generateSeries(resourceId, windowMs, intervalMs, baseline) {
  const rng = seededRng(resourceId.charCodeAt(1) * 1000 + resourceId.charCodeAt(2));
  const now = Date.now();
  const points = [];
  for (let t = now - windowMs; t <= now; t += intervalMs) {
    const phase = (t / 3_600_000) * Math.PI * 2;
    const base  = baseline + 20 * Math.sin(phase / 12) + 6 * Math.sin(phase / 4);
    const noise = (rng() - 0.5) * 15;
    const spike = rng() < 0.03 ? rng() * 30 : 0;
    const clamp = v => Math.min(100, Math.max(0, v));
    const net   = (rng() - 0.5) * 200 + 50;
    points.push({
      timestamp:  t,
      cpu:        clamp(base + noise + spike),
      memory:     clamp(base * 0.9 + (rng() - 0.5) * 7.5),
      networkIn:  Math.max(0, net + (rng() - 0.5) * 80),
      networkOut: Math.max(0, net * 0.6 + (rng() - 0.5) * 50),
      diskRead:   Math.max(0, rng() * 60 + 5),
      diskWrite:  Math.max(0, rng() * 40 + 2),
    });
  }
  return points;
}

const WINDOWS = {
  '24h': { windowMs: 24 * 3600_000,         intervalMs: 5 * 60_000   },
  '7d':  { windowMs:  7 * 24 * 3600_000,    intervalMs: 30 * 60_000  },
  '30d': { windowMs: 30 * 24 * 3600_000,    intervalMs:  2 * 3600_000 },
};

router.get('/:resourceId', async (req, res) => {
  try {
    const win = req.query.window || '24h';
    if (!WINDOWS[win]) return res.status(400).json({ error: 'Invalid window. Use 24h, 7d, or 30d' });

    const resource = await db.getAsync('SELECT cpu_avg_7d FROM resources WHERE id = ?', [req.params.resourceId]);
    if (!resource) return res.status(404).json({ error: 'Resource not found' });

    const { windowMs, intervalMs } = WINDOWS[win];
    res.json(generateSeries(req.params.resourceId, windowMs, intervalMs, resource.cpu_avg_7d || 40));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
