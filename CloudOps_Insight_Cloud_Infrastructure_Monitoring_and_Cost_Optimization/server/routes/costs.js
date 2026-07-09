const express = require('express');
const db      = require('../db');
const router  = express.Router();

// GET /api/costs/monthly  (must be before /:days param)
router.get('/monthly', async (req, res) => {
  try {
    const months = await db.allAsync(`
      SELECT strftime('%Y-%m', date) AS month, SUM(cost) AS total
      FROM cost_entries GROUP BY month ORDER BY month
    `);

    const summaries = await Promise.all(months.map(async m => {
      const svc = await db.allAsync(`
        SELECT service_type, SUM(cost) AS total FROM cost_entries
        WHERE strftime('%Y-%m', date) = ? GROUP BY service_type`, [m.month]);
      const reg = await db.allAsync(`
        SELECT region, SUM(cost) AS total FROM cost_entries
        WHERE strftime('%Y-%m', date) = ? GROUP BY region`, [m.month]);

      const byService = { EC2: 0, S3: 0, RDS: 0, Lambda: 0, LoadBalancer: 0 };
      svc.forEach(r => { byService[r.service_type] = parseFloat((r.total || 0).toFixed(2)); });

      const byRegion = { 'us-east-1': 0, 'us-west-2': 0, 'eu-west-1': 0, 'ap-southeast-1': 0, 'ap-northeast-1': 0 };
      reg.forEach(r => { byRegion[r.region] = parseFloat((r.total || 0).toFixed(2)); });

      return { month: m.month, total: parseFloat((m.total || 0).toFixed(2)), byService, byRegion };
    }));

    res.json(summaries);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/costs?days=30
router.get('/', async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const rows = await db.allAsync(
      'SELECT date, resource_id, service_type, region, cost FROM cost_entries WHERE date >= ? ORDER BY date DESC',
      [cutoffStr]
    );
    res.json(rows.map(r => ({ date: r.date, resourceId: r.resource_id, serviceType: r.service_type, region: r.region, cost: r.cost })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
