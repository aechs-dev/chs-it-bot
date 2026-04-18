// ─────────────────────────────────────────────────────────────────────────────
// CHS.ai — SQLite Database v2.0
// Solid foundation — single source of truth for all school data
// ─────────────────────────────────────────────────────────────────────────────

const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

const DB_DIR  = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DB_DIR, 'chs.db');

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`

  -- ── PEOPLE ──────────────────────────────────────────────────────────────────
  -- Master list of every person at AECHS. One row per human. Never deleted.
  CREATE TABLE IF NOT EXISTS people (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name        TEXT NOT NULL,
    last_name         TEXT NOT NULL,
    title             TEXT,
    full_name         TEXT,
    phone             TEXT,
    email             TEXT,
    status            TEXT DEFAULT 'active',
    american_program  INTEGER DEFAULT 0,
    joined_date       TEXT,
    left_date         TEXT,
    notes             TEXT,
    created_at        TEXT DEFAULT (datetime('now')),
    updated_at        TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_people_status    ON people(status);
  CREATE INDEX IF NOT EXISTS idx_people_full_name ON people(full_name);

  -- ── DEPARTMENTS ─────────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS departments (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#4a8c3f'
  );

  -- ── PERSON DEPARTMENTS ──────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS person_departments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id   INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    dept_id     INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    is_primary  INTEGER DEFAULT 1,
    UNIQUE(person_id, dept_id)
  );

  -- ── ROLES ───────────────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS roles (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id             INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    role_type             TEXT NOT NULL,
    is_primary            INTEGER DEFAULT 1,
    substitution_eligible INTEGER DEFAULT 0,
    created_at            TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_roles_person ON roles(person_id);

  -- ── PRESENCE ────────────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS presence (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id        INTEGER NOT NULL UNIQUE REFERENCES people(id) ON DELETE CASCADE,
    employment_type  TEXT DEFAULT 'full-time',
    days             TEXT DEFAULT 'Mon,Tue,Wed,Thu,Fri',
    arrival_time     TEXT DEFAULT '08:00',
    departure_time   TEXT DEFAULT '14:00',
    notes            TEXT
  );

  -- ── SCHEDULES ───────────────────────────────────────────────────────────────
  -- Rename old schedules table if it exists with teacher column (legacy)
  CREATE TABLE IF NOT EXISTS schedules_v2 (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id     INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    academic_year TEXT NOT NULL DEFAULT '2025-2026',
    day           TEXT NOT NULL,
    period        TEXT NOT NULL,
    class_name    TEXT NOT NULL,
    notes         TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_schedules_person ON schedules_v2(person_id);
  CREATE INDEX IF NOT EXISTS idx_schedules_day    ON schedules_v2(day);
  CREATE INDEX IF NOT EXISTS idx_schedules_year   ON schedules_v2(academic_year);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_schedules_unique
    ON schedules_v2(person_id, academic_year, day, period);

  -- ── ACCESS ──────────────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS access (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id      INTEGER NOT NULL UNIQUE REFERENCES people(id) ON DELETE CASCADE,
    web_code       TEXT UNIQUE,
    web_mode       TEXT DEFAULT 'auto',
    whatsapp_lid   TEXT UNIQUE,
    clearance      TEXT,
    language_style TEXT DEFAULT 'english',
    created_at     TEXT DEFAULT (datetime('now'))
  );

  -- ── SUBSTITUTE LOG ──────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS substitute_log (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    date                 TEXT NOT NULL,
    absent_person_id     INTEGER REFERENCES people(id),
    period               TEXT,
    class_name           TEXT,
    substitute_person_id INTEGER REFERENCES people(id),
    assigned_by          TEXT,
    confirmed            INTEGER DEFAULT 0,
    created_at           TEXT DEFAULT (datetime('now'))
  );

  -- ── WIFI ────────────────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS wifi (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    network_name   TEXT,
    password       TEXT,
    login_required TEXT,
    username       TEXT,
    login_password TEXT,
    access_level   TEXT,
    allowed_users  TEXT,
    notes          TEXT
  );

  -- ── CALENDAR ────────────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS calendar (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    date       TEXT,
    day        TEXT,
    event      TEXT,
    type       TEXT,
    school_day TEXT
  );

  -- ── ESKOOL ──────────────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS eskool (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    issue    TEXT,
    solution TEXT,
    category TEXT,
    notes    TEXT
  );

  -- ── DEVICES ─────────────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS devices (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    device_name TEXT,
    type        TEXT,
    location    TEXT,
    person_id   INTEGER REFERENCES people(id),
    serial      TEXT,
    notes       TEXT
  );

  -- ── PASSWORDS ───────────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS passwords (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    system   TEXT,
    username TEXT,
    password TEXT,
    url      TEXT,
    notes    TEXT
  );

  -- ── LOGS ────────────────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS logs (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    "from"    TEXT,
    body      TEXT,
    direction TEXT,
    intent    TEXT,
    action    TEXT,
    model     TEXT,
    timestamp TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_logs_from      ON logs("from");
  CREATE INDEX IF NOT EXISTS idx_logs_direction ON logs(direction);
  CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);

  -- ── FLAGS ───────────────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS flags (
    id          TEXT PRIMARY KEY,
    question    TEXT,
    response    TEXT,
    note        TEXT DEFAULT '',
    "from"      TEXT,
    source      TEXT DEFAULT 'chat',
    resolved    INTEGER DEFAULT 0,
    resolved_at TEXT,
    timestamp   TEXT DEFAULT (datetime('now'))
  );

  -- ── LEGACY TABLES (kept for backward compatibility during migration) ─────────
  CREATE TABLE IF NOT EXISTS contacts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    title       TEXT,
    role        TEXT,
    phone       TEXT,
    department  TEXT,
    subjects    TEXT,
    lid         TEXT UNIQUE,
    handles     TEXT,
    employment  TEXT,
    presence    TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    code       TEXT NOT NULL UNIQUE,
    mode       TEXT DEFAULT 'auto',
    contact_id INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- schedules (old, teacher-text based) kept as-is for backward compat
  CREATE TABLE IF NOT EXISTS schedules (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher TEXT,
    day     TEXT,
    time    TEXT,
    period  TEXT,
    class   TEXT,
    notes   TEXT
  );

`);

db.exec(`
  CREATE TABLE IF NOT EXISTS profiles (
    lid             TEXT PRIMARY KEY,
    name            TEXT,
    title           TEXT,
    role            TEXT,
    division        TEXT,
    subject         TEXT,
    classes         TEXT,
    phone           TEXT,
    language_style  TEXT DEFAULT 'english',
    devices         TEXT DEFAULT '[]',
    recent_issues   TEXT DEFAULT '[]',
    preferences     TEXT,
    status          TEXT DEFAULT 'Active',
    source          TEXT DEFAULT 'whatsapp',
    first_seen      TEXT,
    last_seen       TEXT,
    message_count   INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS campus_periods (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id     INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    academic_year TEXT NOT NULL DEFAULT '2025-2026',
    day           TEXT NOT NULL,
    period        TEXT NOT NULL,
    on_campus     INTEGER NOT NULL DEFAULT 0,
    UNIQUE(person_id, academic_year, day, period)
  );
  CREATE INDEX IF NOT EXISTS idx_campus_periods_person ON campus_periods(person_id);
  CREATE INDEX IF NOT EXISTS idx_campus_periods_year   ON campus_periods(academic_year);

  CREATE TABLE IF NOT EXISTS simulations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id   INTEGER REFERENCES people(id) ON DELETE SET NULL,
    title       TEXT    NOT NULL,
    subject     TEXT    NOT NULL DEFAULT 'physics',
    grade       TEXT,
    filename    TEXT    NOT NULL UNIQUE,
    is_prebuilt INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_simulations_person   ON simulations(person_id);
  CREATE INDEX IF NOT EXISTS idx_simulations_prebuilt ON simulations(is_prebuilt);
`);

// ── Seed departments ──────────────────────────────────────────────────────────
const deptCount = db.prepare('SELECT COUNT(*) as c FROM departments').get().c;
if (deptCount === 0) {
  const ins = db.prepare('INSERT OR IGNORE INTO departments (name, color) VALUES (?, ?)');
  [
    ['KG',           '#6d28d9'],
    ['Elementary',   '#2d5a27'],
    ['Intermediate', '#1d4ed8'],
    ['Secondary',    '#c2410c'],
    ['Office',       '#374151'],
    ['IT',           '#0891b2'],
  ].forEach(([name, color]) => ins.run(name, color));
  console.log('[DB] Departments seeded');
}

// ── Seed / reconcile pre-built simulations with files on disk ─────────────────
// Auto-discovery: only seed entries for files that actually exist in web/simulations/.
// This avoids broken 404s when the library lists a card for a missing file.
try {
  const fs  = require('fs');
  const path = require('path');
  const SIM_DIR = path.join(__dirname, '..', 'web', 'simulations');

  const CATALOG = {
    'reflection.html':  { title: 'Law of Reflection',       subject: 'physics',   grade: 'Grade 9–11'  },
    'diffraction.html': { title: 'Single-Slit Diffraction', subject: 'physics',   grade: 'Grade 11–12' },
    'pendulum.html':    { title: 'Simple Pendulum',         subject: 'physics',   grade: 'Grade 9–10'  },
    'projectile.html':  { title: 'Projectile Motion',       subject: 'physics',   grade: 'Grade 10–11' },
    'titration.html':   { title: 'Acid-Base Titration',     subject: 'chemistry', grade: 'Grade 10–11' },
    'bohr-atom.html':   { title: 'Bohr Atomic Model',       subject: 'chemistry', grade: 'Grade 9–10'  },
    'unit-circle.html': { title: 'Unit Circle',             subject: 'math',      grade: 'Grade 10–11' },
    'quadratic.html':   { title: 'Quadratic Functions',     subject: 'math',      grade: 'Grade 9–10'  },
  };

  const insSim = db.prepare(
    'INSERT OR IGNORE INTO simulations (person_id,title,subject,grade,filename,is_prebuilt) VALUES (NULL,?,?,?,?,1)'
  );
  const delSim = db.prepare('DELETE FROM simulations WHERE is_prebuilt=1 AND filename=?');

  let seeded = 0, cleaned = 0;
  if (fs.existsSync(SIM_DIR)) {
    for (const [filename, meta] of Object.entries(CATALOG)) {
      const full = path.join(SIM_DIR, filename);
      if (fs.existsSync(full)) {
        const r = insSim.run(meta.title, meta.subject, meta.grade, filename);
        if (r.changes > 0) seeded++;
      } else {
        const r = delSim.run(filename);
        if (r.changes > 0) cleaned++;
      }
    }
  }
  if (seeded || cleaned) {
    console.log(`[DB] Pre-built simulations reconciled (added ${seeded}, removed ${cleaned})`);
  }
} catch(e) {
  console.error('[DB] Pre-built simulation seed error:', e.message);
}

// ── Column migrations (idempotent) ────────────────────────────────────────────
const accessCols = db.prepare("PRAGMA table_info(access)").all().map(c => c.name);
if (!accessCols.includes('directory_access')) {
  db.prepare('ALTER TABLE access ADD COLUMN directory_access INTEGER DEFAULT 0').run();
  console.log('[DB] Migration: added access.directory_access');
}
if (!accessCols.includes('simulations_access')) {
  db.prepare('ALTER TABLE access ADD COLUMN simulations_access INTEGER DEFAULT 0').run();
  console.log('[DB] Migration: added access.simulations_access');
}

console.log('[DB] CHS.ai database v2.0 ready:', DB_PATH);

module.exports = db;
