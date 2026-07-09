const express = require('express');
const db      = require('../db');
const router  = express.Router();

function toResource(r) {
  return {
    id: r.id, name: r.name, type: r.type, region: r.region, status: r.status,
    uptimePercent: r.uptime_percent, costPerMonth: r.cost_per_month,
    cpuAvg7d: r.cpu_avg_7d, memAvg7d: r.mem_avg_7d, tier: r.tier,
    tags: JSON.parse(r.tags || '{}'), createdAt: r.created_at, lastModified: r.last_modified,
  };
}

// GET /api/resources
router.get('/', async (req, res) => {
  try {
    const { type, status, region, search } = req.query;
    let sql = 'SELECT * FROM resources WHERE 1=1';
    const params = [];
    if (type)   { sql += ' AND type = ?';      params.push(type);   }
    if (status) { sql += ' AND status = ?';    params.push(status); }
    if (region) { sql += ' AND region = ?';    params.push(region); }
    if (search) { sql += ' AND name LIKE ?';   params.push(`%${search}%`); }
    const rows = await db.allAsync(sql, params);
    res.json(rows.map(toResource));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/resources/:id
router.get('/:id', async (req, res) => {
  try {
    const row = await db.getAsync('SELECT * FROM resources WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Resource not found' });
    res.json(toResource(row));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
