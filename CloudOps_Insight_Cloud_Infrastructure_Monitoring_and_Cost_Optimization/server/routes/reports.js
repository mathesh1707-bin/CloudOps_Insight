const express = require('express');
const db      = require('../db');
const router  = express.Router();

router.get('/', async (req, res) => {
  try {
    const rows = await db.allAsync('SELECT * FROM reports');
    res.json(rows.map(r => ({ id: r.id, title: r.title, description: r.description, category: r.category, lastGeneratedAt: r.last_generated_at, estimatedRows: r.estimated_rows })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/data', async (req, res) => {
  try {
    const id = req.params.id;
    let data = [];

    if (id === 'rpt-cost-monthly') {
      const rows = await db.allAsync(`
        SELECT strftime('%Y-%m', date) AS month,
          SUM(cost) AS total,
          SUM(CASE WHEN service_type='EC2'          THEN cost ELSE 0 END) AS EC2,
          SUM(CASE WHEN service_type='S3'           THEN cost ELSE 0 END) AS S3,
          SUM(CASE WHEN service_type='RDS'          THEN cost ELSE 0 END) AS RDS,
          SUM(CASE WHEN service_type='Lambda'       THEN cost ELSE 0 END) AS Lambda,
          SUM(CASE WHEN service_type='LoadBalancer' THEN cost ELSE 0 END) AS LoadBalancer
        FROM cost_entries GROUP BY month ORDER BY month DESC LIMIT 6`);
      data = rows.map(r => ({ Month: r.month, Total: +r.total.toFixed(2), EC2: +r.EC2.toFixed(2), S3: +r.S3.toFixed(2), RDS: +r.RDS.toFixed(2), Lambda: +r.Lambda.toFixed(2), LoadBalancer: +r.LoadBalancer.toFixed(2) }));

    } else if (id === 'rpt-utilization') {
      const rows = await db.allAsync(`SELECT name, type, region, cpu_avg_7d, mem_avg_7d, uptime_percent, cost_per_month FROM resources WHERE status='running'`);
      data = rows.map(r => ({ Name: r.name, Type: r.type, Region: r.region, 'CPU Avg 7d (%)': r.cpu_avg_7d, 'Mem Avg 7d (%)': r.mem_avg_7d, 'Uptime (%)': r.uptime_percent, 'Cost/Month ($)': r.cost_per_month }));

    } else if (id === 'rpt-idle') {
      const rows = await db.allAsync(`SELECT name, type, region, cpu_avg_7d, cost_per_month, tier FROM resources WHERE status='running' AND cpu_avg_7d < 10`);
      data = rows.map(r => ({ Name: r.name, Type: r.type, Region: r.region, 'CPU Avg 7d (%)': r.cpu_avg_7d, 'Cost/Month ($)': r.cost_per_month, Tier: r.tier }));

    } else if (id === 'rpt-governance') {
      const rows = await db.allAsync(`SELECT name, type, region, status, cost_per_month FROM resources WHERE tags = '{}'`);
      data = rows.map(r => ({ Name: r.name, Type: r.type, Region: r.region, Status: r.status, 'Missing Tags': 'env, team, owner', 'Cost/Month ($)': r.cost_per_month }));

    } else if (id === 'rpt-anomalies') {
      const rows = await db.allAsync('SELECT * FROM anomalies');
      data = await Promise.all(rows.map(async a => {
        const resource = await db.getAsync('SELECT name, type FROM resources WHERE id = ?', [a.resource_id]);
        return { Date: a.date, Resource: resource?.name || a.resource_id, Type: resource?.type || '', 'Actual Cost ($)': a.actual_cost, 'Expected Cost ($)': a.expected_cost, 'Change (%)': a.percent_change, 'Z-Score': a.z_score, Severity: a.severity };
      }));
    } else {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
