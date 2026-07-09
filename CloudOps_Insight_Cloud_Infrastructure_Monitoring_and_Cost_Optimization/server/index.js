/**
 * index.js — Express server entry point
 */
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const db      = require('./db'); // Init schema

const authMiddleware = require('./middleware/auth');
const authRoutes     = require('./routes/auth');
const resourceRoutes = require('./routes/resources');
const metricRoutes   = require('./routes/metrics');
const costRoutes     = require('./routes/costs');
const recRoutes      = require('./routes/recommendations');
const anomalyRoutes  = require('./routes/anomalies');
const reportRoutes   = require('./routes/reports');

const app  = express();
const PORT = process.env.PORT || 3001;

// Middleware — allow any localhost port in dev so Vite's port (5173/5174/etc.) always works
const allowedOrigin = process.env.FRONTEND_ORIGIN || null;
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return cb(null, true);
    // Allow any localhost origin in dev
    if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return cb(null, true);
    // Allow explicitly configured origin in prod
    if (allowedOrigin && origin === allowedOrigin) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/resources',       authMiddleware, resourceRoutes);
app.use('/api/metrics',         authMiddleware, metricRoutes);
app.use('/api/costs',           authMiddleware, costRoutes);
app.use('/api/recommendations', authMiddleware, recRoutes);
app.use('/api/anomalies',       authMiddleware, anomalyRoutes);
app.use('/api/reports',         authMiddleware, reportRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`✨  CloudOps Insight backend running at http://localhost:${PORT}`);
  console.log(`   Database: cloudops.db`);
  console.log(`   Health:   http://localhost:${PORT}/health`);
});
