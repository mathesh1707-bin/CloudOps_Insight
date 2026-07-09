const express = require('express');
const db      = require('../db');
const router  = express.Router();

function toRec(r) {
  return {
    id: r.id, type: r.type, severity: r.severity, status: r.status,
    title: r.title, description: r.description,
    affectedResourceIds: JSON.parse(r.affected_resource_ids || '[]'),
    estimatedMonthlySavings: r.estimated_monthly_savings,
    createdAt: r.created_at, resolvedAt: r.resolved_at, anomalyId: r.anomaly_id,
  };
}

router.get('/', async (req, res) => {
  try {
    const rows = await db.allAsync('SELECT * FROM recommendations ORDER BY created_at DESC');
    res.json(rows.map(toRec));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['open', 'dismissed', 'resolved'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const existing = await db.getAsync('SELECT * FROM recommendations WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Recommendation not found' });

    const resolvedAt = status === 'resolved' ? new Date().toISOString() : null;
    await db.runAsync('UPDATE recommendations SET status = ?, resolved_at = ? WHERE id = ?', [status, resolvedAt, req.params.id]);
    const updated = await db.getAsync('SELECT * FROM recommendations WHERE id = ?', [req.params.id]);
    res.json(toRec(updated));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
