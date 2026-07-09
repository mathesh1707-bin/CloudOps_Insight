const express = require('express');
const db      = require('../db');
const router  = express.Router();

function toAnomaly(r) {
  return {
    id: r.id, resourceId: r.resource_id, date: r.date,
    actualCost: r.actual_cost, expectedCost: r.expected_cost,
    stdDev: r.std_dev, zScore: r.z_score, percentChange: r.percent_change,
    severity: r.severity, status: r.status, explanation: r.explanation, createdAt: r.created_at,
  };
}

router.get('/', async (req, res) => {
  try {
    const rows = await db.allAsync('SELECT * FROM anomalies ORDER BY date DESC');
    res.json(rows.map(toAnomaly));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['open', 'acknowledged', 'resolved'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const existing = await db.getAsync('SELECT * FROM anomalies WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Anomaly not found' });

    await db.runAsync('UPDATE anomalies SET status = ? WHERE id = ?', [status, req.params.id]);
    const updated = await db.getAsync('SELECT * FROM anomalies WHERE id = ?', [req.params.id]);
    res.json(toAnomaly(updated));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
