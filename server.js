// ═══════════════════════════════════════════
//   PROVELMICS — server.js
//   Main Express server, hosted on Railway
// ═══════════════════════════════════════════
'use strict';

require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const admin      = require('firebase-admin');

// ── Firebase Admin SDK Init ──────────────────
const serviceAccount = {
  type:                        'service_account',
  project_id:                  process.env.FIREBASE_PROJECT_ID,
  private_key_id:              process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key:                 process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email:                process.env.FIREBASE_CLIENT_EMAIL,
  client_id:                   process.env.FIREBASE_CLIENT_ID,
  auth_uri:                    'https://accounts.google.com/o/oauth2/auth',
  token_uri:                   'https://oauth2.googleapis.com/token',
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Export db so routes can use it
global.db    = db;
global.admin = admin;

// ── Express App ──────────────────────────────
const app = express();

// CORS — allow your GitHub Pages domain
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'https://himaprompolinela.github.io',
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.some(o => origin.startsWith(o))) {
      cb(null, true);
    } else {
      cb(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Request Logger ───────────────────────────
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── Routes ───────────────────────────────────
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/stories', require('./routes/stories'));
app.use('/api/authors', require('./routes/authors'));
app.use('/api/ratings', require('./routes/ratings'));
app.use('/api/admin',   require('./routes/admin'));
app.use('/api/users',   require('./routes/users'));

// ── Health check ─────────────────────────────
app.get('/', (_req, res) => {
  res.json({ status: 'ok', app: 'PROVELMICS API', time: new Date().toISOString() });
});

// ── 404 handler ──────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ─────────────────────
app.use((err, _req, res, _next) => {
  console.error('Server error:', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ── Start ────────────────────────────────────
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ PROVELMICS API running on port ${PORT}`);
});
