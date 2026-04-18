require('dotenv').config({ override: true });
const express = require('express');
const app = express();
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// ── CORS — allow mobile app requests ─────────────────────────────────────────
app.use((req, res, next) => {
  const origin = req.headers.origin || '';
  // Allow localhost, Expo dev tools, and LAN addresses
  if (!origin || /^http:\/\/(localhost|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(origin) || origin.startsWith('exp://')) {
    res.setHeader('Access-Control-Allow-Origin',  origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Cookie,Authorization,X-Auth-Code');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const { handleIncoming } = require('./core/handler');
const { initWhatsAppWeb } = require('./core/whatsapp-web');
const dashboard = require('./web/index');
const config    = require('./config');
const path      = require('path');
const fs        = require('fs');
const db        = require('./core/database');

const PORT = process.env.PORT || 3000;

// ── Global error visibility ──────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('\n❌ UNCAUGHT EXCEPTION');
  console.error(err && err.stack ? err.stack : err);
});

process.on('unhandledRejection', (reason) => {
  console.error('\n❌ UNHANDLED REJECTION');
  console.error(reason && reason.stack ? reason.stack : reason);
});

// ── Database validation on startup ───────────────────────────────────────────
function validateDatabase() {
  console.log('🗄️  Database Validation:');

  const requiredTables = [
    'people',
    'roles',
    'departments',
    'person_departments',
    'presence',
    'access',
    'schedules',
    'calendar',
    'wifi',
  ];

  const tableExistsStmt = db.prepare(`
    SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?
  `);

  for (const table of requiredTables) {
    const exists = tableExistsStmt.get(table);
    if (!exists) throw new Error(`Required database table missing: ${table}`);
    const row = db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get();
    console.log(`  ✓ ${table} (${row.count} rows)`);
  }

  console.log('  Database structure looks OK.\n');
}

// ── Required env vars check ──────────────────────────────────────────────────
function validateEnv() {
  const required = ['ANTHROPIC_API_KEY'];
  const missing  = required.filter(k => !process.env[k]);
  if (missing.length) {
    console.error(`\n❌ Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}

app.use('/dashboard', dashboard);
app.get('/favicon.ico', (req, res) => {
  const fp = path.join(__dirname, 'web', 'favicon.ico');
  fs.existsSync(fp) ? res.sendFile(fp) : res.status(204).end();
});
app.get('/', (req, res) => res.json({ status: 'ok', bot: config.BOT_NAME, school: config.SCHOOL_NAME }));

app.listen(PORT, () => {
  console.log(`\n🤖 ${config.BOT_NAME} starting up…`);
  console.log(`🏫 ${config.SCHOOL_NAME} — ${config.SCHOOL_CITY}`);
  console.log(`🖥️  Dashboard: http://localhost:${PORT}/dashboard\n`);

  validateEnv();
  validateDatabase();

  try {
    initWhatsAppWeb(handleIncoming);
  } catch (err) {
    console.error('❌ WhatsApp initialization failed:', err && err.stack ? err.stack : err);
    // Don't re-throw — HTTP server stays alive for the mobile app
  }
});

module.exports = app;
