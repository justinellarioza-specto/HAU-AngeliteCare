const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { corsOrigins, nodeEnv } = require('./config/env');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.set('trust proxy', 1); // needed behind Render/Railway for correct client IPs (rate limiting, audit log)
app.use(helmet());
app.use(cors((req, cb) => {
  const origin = req.header('Origin');
  // Allowed: tools like Postman (no Origin), the site itself (same host), and the configured frontend origins
  let sameHost = false;
  try { sameHost = !!origin && new URL(origin).host === req.headers.host; } catch { /* invalid origin */ }
  const allowed = !origin || sameHost || corsOrigins.includes('*') || corsOrigins.includes(origin);
  cb(allowed ? null : new Error(`Origin ${origin} not allowed by CORS`), { origin: allowed });
}));
app.use(express.json({ limit: '100kb' }));
if (nodeEnv !== 'test') app.use(morgan(nodeEnv === 'production' ? 'combined' : 'dev'));

app.use('/api', routes);
app.use('/api', notFound);

// Serve the built Vue app (frontend/dist) when it exists — one server for the whole site in production.
// In development the Vue dev server (npm run dev in frontend/) is used instead.
const distDir = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(path.join(distDir, 'index.html'))) {
  app.use(express.static(distDir, { maxAge: '7d', index: false }));
  // Any other GET (e.g. /staff/queue) returns index.html so Vue Router can handle it
  app.get('/{*path}', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(distDir, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => res.json({ name: 'AngeliteCare API', docs: 'See README.md', health: '/api/health' }));
}

app.use(notFound);
app.use(errorHandler);

module.exports = app;
