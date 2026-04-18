'use strict';

/**
 * CHS.ai — Full Clean Migration
 * Wipes everything. Builds from scratch.
 * No fuzzy matching. No legacy tables.
 */

const Database = require('better-sqlite3');
const path     = require('path');
const db       = new Database(path.join(__dirname, 'data', 'chs.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('🗑  Dropping all existing tables...\n');

// ── Drop everything ───────────────────────────────────────────────────────────
db.exec(`
  DROP TABLE IF EXISTS substitute_log;
  DROP TABLE IF EXISTS schedules;
  DROP TABLE IF EXISTS schedules_v2;
  DROP TABLE IF EXISTS access;
  DROP TABLE IF EXISTS presence;
  DROP TABLE IF EXISTS person_departments;
  DROP TABLE IF EXISTS roles;
  DROP TABLE IF EXISTS departments;
  DROP TABLE IF EXISTS people;
  DROP TABLE IF EXISTS calendar;
  DROP TABLE IF EXISTS wifi;
  DROP TABLE IF EXISTS flags;
  DROP TABLE IF EXISTS logs;
  DROP TABLE IF EXISTS devices;
  DROP TABLE IF EXISTS profiles;
  DROP TABLE IF EXISTS subjects;
  DROP TABLE IF EXISTS eskool;
  DROP TABLE IF EXISTS passwords;
  DROP TABLE IF EXISTS users;
  DROP TABLE IF EXISTS contacts;
`);

console.log('✓ All tables dropped\n');

// ── Create tables ─────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE people (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name      TEXT NOT NULL,
    last_name       TEXT NOT NULL,
    title           TEXT,
    full_name       TEXT NOT NULL,
    phone           TEXT,
    status          TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive','on_leave')),
    american_program INTEGER NOT NULL DEFAULT 0,
    notes           TEXT
  );

  CREATE INDEX idx_people_full_name ON people(full_name);
  CREATE INDEX idx_people_status    ON people(status);

  CREATE TABLE departments (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#374151'
  );

  CREATE TABLE roles (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id             INTEGER NOT NULL UNIQUE REFERENCES people(id),
    role_type             TEXT NOT NULL,
    clearance             TEXT NOT NULL DEFAULT 'teacher'
                          CHECK(clearance IN ('owner','office','hod','coordinator','teacher','student')),
    substitution_eligible INTEGER NOT NULL DEFAULT 0
  );

  CREATE INDEX idx_roles_person ON roles(person_id);

  CREATE TABLE person_departments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id  INTEGER NOT NULL REFERENCES people(id),
    dept_id    INTEGER NOT NULL REFERENCES departments(id),
    is_primary INTEGER NOT NULL DEFAULT 0,
    UNIQUE(person_id, dept_id)
  );

  CREATE TABLE presence (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id       INTEGER NOT NULL UNIQUE REFERENCES people(id),
    employment_type TEXT NOT NULL DEFAULT 'full-time'
                    CHECK(employment_type IN ('full-time','part-time','office')),
    days            TEXT NOT NULL DEFAULT 'Mon,Tue,Wed,Thu,Fri',
    arrival_time    TEXT NOT NULL DEFAULT '08:00',
    departure_time  TEXT NOT NULL DEFAULT '14:00',
    notes           TEXT
  );

  CREATE TABLE access (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id   INTEGER NOT NULL UNIQUE REFERENCES people(id),
    web_code    TEXT UNIQUE,
    web_mode    TEXT NOT NULL DEFAULT 'auto'
                CHECK(web_mode IN ('auto','teacher','student','admin')),
    clearance   TEXT NOT NULL DEFAULT 'teacher'
                CHECK(clearance IN ('owner','office','hod','coordinator','teacher','student')),
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE schedules (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id     INTEGER NOT NULL REFERENCES people(id),
    academic_year TEXT NOT NULL DEFAULT '2025-2026',
    day           TEXT NOT NULL CHECK(day IN ('Monday','Tuesday','Wednesday','Thursday','Friday')),
    period        TEXT NOT NULL CHECK(period IN ('1','2','3','4','5','6','7')),
    class_name    TEXT NOT NULL,
    UNIQUE(person_id, academic_year, day, period)
  );

  CREATE INDEX idx_schedules_person ON schedules(person_id);
  CREATE INDEX idx_schedules_day    ON schedules(day);

  CREATE TABLE calendar (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    date        TEXT NOT NULL,
    title       TEXT NOT NULL,
    type        TEXT NOT NULL DEFAULT 'event'
                CHECK(type IN ('holiday','event','exam','meeting','other')),
    description TEXT
  );

  CREATE TABLE wifi (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    network_name TEXT NOT NULL,
    password     TEXT,
    location     TEXT,
    access_level TEXT NOT NULL DEFAULT 'office'
                 CHECK(access_level IN ('owner','office','hod','coordinator','teacher','librarian','bookstore'))
  );

  CREATE TABLE substitute_log (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    date              TEXT NOT NULL,
    absent_person_id  INTEGER NOT NULL REFERENCES people(id),
    period            TEXT NOT NULL,
    class_name        TEXT NOT NULL,
    substitute_person_id INTEGER REFERENCES people(id),
    confirmed         INTEGER NOT NULL DEFAULT 0,
    notes             TEXT,
    created_at        TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE flags (
    id         TEXT PRIMARY KEY,
    question   TEXT DEFAULT '',
    response   TEXT NOT NULL,
    note       TEXT DEFAULT '',
    "from"     TEXT DEFAULT 'unknown',
    source     TEXT DEFAULT 'chat',
    timestamp  TEXT NOT NULL,
    resolved   INTEGER DEFAULT 0,
    resolvedAt TEXT
  );

  CREATE TABLE logs (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    direction TEXT NOT NULL CHECK(direction IN ('in','out')),
    "from"    TEXT NOT NULL,
    body      TEXT NOT NULL,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    source    TEXT DEFAULT 'whatsapp'
  );
`);

console.log('✓ All tables created\n');

// ── Seed departments ──────────────────────────────────────────────────────────
const deptInsert = db.prepare('INSERT INTO departments (name, color) VALUES (?, ?)');
const DEPTS = [
  ['KG',           '#6d28d9'],
  ['Elementary',   '#2d5a27'],
  ['Intermediate', '#1d4ed8'],
  ['Secondary',    '#c2410c'],
  ['Office',       '#374151'],
  ['IT',           '#0891b2'],
];
for (const [name, color] of DEPTS) deptInsert.run(name, color);
console.log('✓ Departments seeded\n');

// ── Helpers ───────────────────────────────────────────────────────────────────
function clearanceFromRole(role_type) {
  if (['it_manager','principal','academic_director'].includes(role_type)) return 'owner';
  if (['secretary','accountant','librarian','bookstore','nurse',
       'psychologist','counselor','disciplinarian','government_relations'].includes(role_type)) return 'office';
  if (role_type.startsWith('hod')) return 'hod';
  if (role_type === 'coordinator') return 'coordinator';
  return 'teacher';
}

const insertPerson = db.prepare(`
  INSERT INTO people (first_name, last_name, title, full_name, phone, status, american_program, notes)
  VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
`);
const insertRole = db.prepare(`
  INSERT INTO roles (person_id, role_type, clearance, substitution_eligible)
  VALUES (?, ?, ?, ?)
`);
const insertPresence = db.prepare(`
  INSERT INTO presence (person_id, employment_type, days, arrival_time, departure_time, notes)
  VALUES (?, ?, ?, ?, ?, ?)
`);
const insertAccess = db.prepare(`
  INSERT INTO access (person_id, web_code, web_mode, clearance)
  VALUES (?, ?, ?, ?)
`);
const insertDept = db.prepare(`
  INSERT OR IGNORE INTO person_departments (person_id, dept_id, is_primary)
  VALUES (?, ?, ?)
`);

// Get dept id by name
const getDept = name => db.prepare('SELECT id FROM departments WHERE name = ?').get(name)?.id;

// ── Staff data ────────────────────────────────────────────────────────────────
// Format: { title, first, last, phone, role_type, ap, emp, days, arrival, departure, depts[], web_code, notes }
// depts: array of dept names, first = primary

const STAFF = [
  // KG
  { title:'Ms.',  first:'Talin',      last:'Arabian',        phone:null,            role:'teacher',              ap:0, emp:'full-time',  days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'14:00', depts:['KG'] },
  { title:'Ms.',  first:'Dzovag',     last:'Aynilian',       phone:'76/472584',     role:'teacher',              ap:0, emp:'full-time',  days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'14:00', depts:['KG'] },
  { title:'Ms.',  first:'Mary',       last:'Mertkhanian',    phone:null,            role:'teacher',              ap:0, emp:'full-time',  days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'14:00', depts:['KG'] },
  { title:'Ms.',  first:'Lena',       last:'Nader',          phone:null,            role:'teacher',              ap:0, emp:'full-time',  days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'14:00', depts:['KG'] },
  { title:'Ms.',  first:'Jennifer',   last:'Degermenjian',   phone:'76/149391',     role:'teacher',              ap:0, emp:'part-time',  days:'Mon,Wed,Fri',         arr:'08:00', dep:'14:00', depts:['KG'] },
  { title:'Ms.',  first:'Caroline',   last:'Oughourlian',    phone:'03/528162',     role:'teacher',              ap:0, emp:'part-time',  days:'Tue,Thu',             arr:'08:00', dep:'12:10', depts:['KG'] },
  { title:'Ms.',  first:'Rita',       last:'Rizk',           phone:'76/993713',     role:'teacher',              ap:0, emp:'full-time',  days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'14:00', depts:['KG'] },
  { title:'Ms.',  first:'Talar',      last:'Kademian',       phone:null,            role:'teacher',              ap:0, emp:'full-time',  days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'14:00', depts:['KG'] },
  { title:'Ms.',  first:'Nayiri',     last:'Israbian',       phone:null,            role:'teacher',              ap:0, emp:'full-time',  days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'14:00', depts:['KG'] },
  { title:'Ms.',  first:'Margo',      last:'Kordahi',        phone:'70/332609',     role:'teacher',              ap:0, emp:'full-time',  days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'14:00', depts:['KG','Elementary'] },
  { title:'Ms.',  first:'Mireille',   last:'Mardirossian',   phone:null,            role:'teacher',              ap:0, emp:'full-time',  days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'14:00', depts:['KG','Elementary'] },
  { title:'Ms.',  first:'Patil',      last:'Balabanian',     phone:'70/148202',     role:'teacher',              ap:0, emp:'part-time',  days:'Thu,Fri',             arr:'08:00', dep:'14:00', depts:['KG','Elementary'] },
  { title:'Mrs.', first:'Houry',      last:'Ohanian',        phone:null,            role:'hod_kg',               ap:0, emp:'full-time',  days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'14:00', depts:['KG'] },

  // Elementary
  { title:'Ms.',  first:'Kawkab',     last:'Haddad',         phone:null,            role:'teacher',              ap:0, emp:'full-time',  days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'14:00', depts:['Elementary'] },
  { title:'Mr.',  first:'Ghazar',     last:'Keoshgerian',    phone:null,            role:'teacher',              ap:0, emp:'part-time',  days:'Tue,Thu,Fri',         arr:'10:30', dep:'14:00', depts:['Elementary'] },
  { title:'Ms.',  first:'Maral',      last:'Manisalian',     phone:null,            role:'teacher',              ap:0, emp:'full-time',  days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'14:00', depts:['Elementary'] },
  { title:'Ms.',  first:'Sella',      last:'Moughalian',     phone:null,            role:'teacher',              ap:0, emp:'full-time',  days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'14:00', depts:['Elementary'] },
  { title:'Mrs.', first:'Markrid',    last:'Margossian',     phone:null,            role:'teacher',              ap:0, emp:'full-time',  days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'14:00', depts:['Elementary'] },
  { title:'Ms.',  first:'Vana',       last:'Zeitounian',     phone:null,            role:'teacher',              ap:0, emp:'part-time',  days:'Mon,Wed,Fri',         arr:'09:30', dep:'12:10', depts:['Elementary'] },
  { title:'Mrs.', first:'Maria',      last:'Guiragossian',   phone:null,            role:'hod_elementary',       ap:0, emp:'full-time',  days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'14:00', depts:['Elementary','Intermediate'] },
  { title:'Ms.',  first:'Tamar',      last:'Gumushian',      phone:null,            role:'librarian',            ap:0, emp:'full-time',  days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'14:00', depts:['Elementary'] },

  // Intermediate
  { title:'Ms.',  first:'Varty',      last:'Salkhanian',     phone:null,            role:'teacher',              ap:0, emp:'full-time',  days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'14:00', depts:['Intermediate'] },
  { title:'Ms.',  first:'Lena',       last:'Titizian',       phone:null,            role:'teacher',              ap:0, emp:'full-time',  days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'14:00', depts:['Intermediate'] },
  { title:'Ms.',  first:'Maral',      last:'Avedissian',     phone:'76/798006',     role:'teacher',              ap:0, emp:'full-time',  days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'14:00', depts:['Elementary','Intermediate'] },
  { title:'Ms.',  first:'Marina',     last:'Hamamjian',      phone:null,            role:'teacher',              ap:0, emp:'part-time',  days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'10:15', depts:['Elementary','Intermediate'] },
  { title:'Ms.',  first:'Mariebelle', last:'Mansour',        phone:null,            role:'teacher',              ap:0, emp:'full-time',  days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'14:00', depts:['Elementary','Intermediate'] },
  { title:'Ms.',  first:'Maral',      last:'Haidostian',     phone:null,            role:'teacher',              ap:0, emp:'part-time',  days:'Tue,Thu',             arr:'08:00', dep:'10:15', depts:['Intermediate','Secondary'] },

  // Secondary
  { title:'Ms.',  first:'Nora',       last:'Terzian',        phone:null,            role:'hod_secondary',        ap:0, emp:'part-time',  days:'Mon,Wed,Thu,Fri',     arr:'08:00', dep:'14:00', depts:['Secondary'] },
  { title:'Ms.',  first:'Tania',      last:'El Khoury',      phone:null,            role:'teacher',              ap:0, emp:'full-time',  days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'14:00', depts:['Secondary'] },
  { title:'Ms.',  first:'Houry',      last:'Kevorkian',      phone:null,            role:'teacher',              ap:0, emp:'part-time',  days:'Mon,Thu',             arr:'08:00', dep:'14:00', depts:['Secondary'] },
  { title:'Ms.',  first:'Aline',      last:'Kevorkian',      phone:null,            role:'teacher',              ap:0, emp:'part-time',  days:'Mon,Wed',             arr:'08:00', dep:'10:15', depts:['Secondary'] },
  { title:'Ms.',  first:'Maria',      last:'Ounjian',        phone:null,            role:'teacher',              ap:0, emp:'part-time',  days:'Mon,Wed,Fri',         arr:'08:00', dep:'09:30', depts:['Secondary'] },
  { title:'Ms.',  first:'Rita',       last:'Avedanian',      phone:null,            role:'teacher',              ap:0, emp:'full-time',  days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'14:00', depts:['Intermediate','Secondary'] },
  { title:'Ms.',  first:'Atam',       last:'Tazian',         phone:null,            role:'teacher',              ap:0, emp:'part-time',  days:'Mon,Wed,Fri',         arr:'08:00', dep:'10:15', depts:['Secondary'] },
  { title:'Mr.',  first:'Vicken',     last:'Koujanian',      phone:null,            role:'coordinator',          ap:0, emp:'full-time',  days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'14:00', depts:['Secondary'] },
  { title:'Mr.',  first:'Viken',      last:'Dishgekenian',   phone:'70/452014',     role:'teacher',              ap:0, emp:'full-time',  days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'14:00', depts:['Intermediate','Secondary'] },
  { title:'Mr.',  first:'Vicken',     last:'Missisian',      last:'Missisian',      role:'disciplinarian',       ap:0, emp:'full-time',  days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'14:00', depts:['Intermediate','Secondary'] },

  // American Program teachers
  { title:'Ms.',  first:'Cynthia',    last:'Shaker',         phone:null,            role:'teacher',              ap:1, emp:'full-time',  days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'14:00', depts:['Intermediate','Secondary'] },
  { title:'Ms.',  first:'Maria',      last:'Aprahamian',     phone:'03/528162',     role:'teacher',              ap:1, emp:'full-time',  days:'Mon',                 arr:'11:30', dep:'14:00', depts:['Secondary'] },
  { title:'Mr.',  first:'Ralph',      last:'Ibrahim',        phone:null,            role:'teacher',              ap:1, emp:'full-time',  days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'14:00', depts:['Secondary'] },
  { title:'Ms.',  first:'Maggie',     last:'Boghossian',     phone:null,            role:'teacher',              ap:0, emp:'full-time',  days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'14:00', depts:['Elementary','Intermediate'] },

  // Multi-dept / coordinators
  { title:'Mr.',  first:'Jano',       last:'Baghboudarian',  phone:'03/966712',     role:'coordinator',          ap:0, emp:'part-time',  days:'Mon,Tue,Thu,Fri',     arr:'07:15', dep:'12:10', depts:['Intermediate','Secondary'] },
  { title:'Ms.',  first:'Ani',        last:'Manougian',      phone:null,            role:'coordinator',          ap:0, emp:'part-time',  days:'Tue,Wed,Thu,Fri',     arr:'08:00', dep:'14:00', depts:['Office'] },
  { title:'Dr.',  first:'Anny',       last:'Joukoulian',     phone:null,            role:'coordinator',          ap:0, emp:'full-time',  days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'14:00', depts:['Office'] },
  { title:'Ms.',  first:'Rozette',    last:'Al Haddad',      phone:null,            role:'coordinator',          ap:0, emp:'full-time',  days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'14:00', depts:['Office'] },
  { title:'Mr.',  first:'Pascal',     last:'Al Ferzly',      phone:null,            role:'coordinator',          ap:0, emp:'part-time',  days:'Mon,Tue',             arr:'08:00', dep:'11:25', depts:['Intermediate','Secondary'] },
  { title:'Ms.',  first:'Nora',       last:'Terzian',        skip:true }, // already added above as hod_secondary

  // Sports
  { title:'Mr.',  first:'Khachig',    last:'Seropian',       phone:null,            role:'teacher',              ap:0, emp:'part-time',  days:'Thu,Fri',             arr:'08:00', dep:'14:00', depts:['KG','Elementary','Intermediate','Secondary'] },

  // Special Ed
  { title:'Ms.',  first:'Hamesd',     last:'Boyadjian',      phone:'76/652468',     role:'hod_elementary',       ap:0, emp:'full-time',  days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'14:00', depts:['Elementary','Intermediate'] },
  { title:'Ms.',  first:'Christine',  last:'Torossian',      phone:null,            role:'teacher',              ap:0, emp:'full-time',  days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'14:00', depts:['Elementary'] },
  { title:'Ms.',  first:'Carine',     last:'Abaklian',       phone:'03/849471',     role:'teacher',              ap:0, emp:'full-time',  days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'14:00', depts:['Elementary'] },
  { title:'Ms.',  first:'Melissa',    last:'Mardikian',      phone:null,            role:'teacher',              ap:0, emp:'full-time',  days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'14:00', depts:['Elementary'] },
  { title:'Ms.',  first:'Nayiri',     last:'Lousinian',      phone:null,            role:'teacher',              ap:0, emp:'full-time',  days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'14:00', depts:['Elementary','Intermediate'] },
  { title:'Ms.',  first:'Patil',      last:'Kazanjian',      phone:null,            role:'teacher',              ap:0, emp:'part-time',  days:'Tue,Wed,Thu,Fri',     arr:'07:15', dep:'14:00', depts:['Elementary'] },
  { title:'Mr.',  first:'Hagop',      last:'Chakmakian',     phone:'70/452014',     role:'coordinator',          ap:0, emp:'full-time',  days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'14:00', depts:['Intermediate'] },

  // Psychologists
  { title:'Mr.',  first:'Gregoire',   last:'Toranian',       phone:null,            role:'psychologist',         ap:0, emp:'full-time',  days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'14:00', depts:['KG'] },
  { title:'Ms.',  first:'Haverj',     last:'Shekherdemian',  phone:null,            role:'psychologist',         ap:0, emp:'full-time',  days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'14:00', depts:['Elementary','Secondary'] },

  // Nurse
  { title:'',     first:'Alik',       last:'Stanboulian',    phone:null,            role:'nurse',                ap:0, emp:'full-time',  days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'14:00', depts:['Office','Secondary'] },

  // Jawad Mestrah
  { title:'Mr.',  first:'Jawad',      last:'Mestrah',        phone:null,            role:'teacher',              ap:0, emp:'part-time',  days:'Fri',                 arr:'08:00', dep:'14:00', depts:['Secondary'] },

  // Alfredo Dawlabani
  { title:'Mr.',  first:'Alfredo',    last:'Dawlabani',      phone:'78/948048',     role:'teacher',              ap:0, emp:'part-time',  days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'10:15', depts:['Intermediate','Secondary'] },

  // Rima Cholakian
  { title:'Ms.',  first:'Rima',       last:'Cholakian',      phone:'03/981787',     role:'teacher',              ap:0, emp:'full-time',  days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'14:00', depts:['Elementary','Secondary'] },

  // Office
  { title:'Mrs.', first:'Lara',       last:'Karghayan',      phone:null,            role:'secretary',            ap:0, emp:'office',     days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'14:00', depts:['Office'], web_code:'LK2526' },
  { title:'',     first:'Barig',      last:'Barsoumian',     phone:'70/606774',     role:'accountant',           ap:0, emp:'office',     days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'14:00', depts:['Office'] },
  { title:'Mrs.', first:'Asdghig',    last:'Jerahian',       phone:null,            role:'government_relations', ap:0, emp:'office',     days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'14:00', depts:['Office'] },
  { title:'Mrs.', first:'Tamar',      last:'Ohanian',        phone:null,            role:'bookstore',            ap:0, emp:'office',     days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'14:00', depts:['Office'] },
  { title:'Mrs.', first:'Maral',      last:'Deyirmenjian',   phone:'03/501062',     role:'principal',            ap:0, emp:'office',     days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'14:00', depts:['Office','Secondary'] },
  { title:'Dr.',  first:'Taline',     last:'Messerlian',     phone:null,            role:'academic_director',    ap:0, emp:'office',     days:'Mon,Tue,Wed,Thu,Fri', arr:'08:00', dep:'14:00', depts:['Office'] },

  // IT
  { title:'Mr.',  first:'Yeghia',     last:'Boghossian',     phone:'70/688510',     role:'it_manager',           ap:0, emp:'full-time',  days:'Mon,Wed,Thu,Fri',     arr:'08:00', dep:'14:00', depts:['IT'], web_code:'YB123' },
];

// ── Insert all staff ──────────────────────────────────────────────────────────
console.log('👥 Inserting staff...\n');

const migrate = db.transaction(() => {
  let count = 0;
  for (const s of STAFF) {
    if (s.skip) continue;

    const fullName = `${s.title ? s.title + ' ' : ''}${s.first} ${s.last}`.trim();
    const result   = insertPerson.run(s.first, s.last, s.title || null, fullName, s.phone || null, s.ap || 0, s.notes || null);
    const pid      = result.lastInsertRowid;

    const clearance = clearanceFromRole(s.role);
    const subEligible = s.role === 'teacher' ? 1 : 0;
    insertRole.run(pid, s.role, clearance, subEligible);

    insertPresence.run(pid, s.emp, s.days, s.arr, s.dep, s.notes || null);

    insertAccess.run(pid, s.web_code || null, 'auto', clearance);

    const depts = s.depts || [];
    for (let i = 0; i < depts.length; i++) {
      const dept_id = getDept(depts[i]);
      if (dept_id) insertDept.run(pid, dept_id, i === 0 ? 1 : 0);
    }

    console.log(`  ✓ ${fullName} [${s.role}] [${clearance}]`);
    count++;
  }
  return count;
});

const total = migrate();

console.log(`\n✅ Migration complete — ${total} staff members inserted\n`);
console.log('📊 Verification:');
console.log('  people:           ', db.prepare('SELECT COUNT(*) as c FROM people').get().c);
console.log('  roles:            ', db.prepare('SELECT COUNT(*) as c FROM roles').get().c);
console.log('  presence:         ', db.prepare('SELECT COUNT(*) as c FROM presence').get().c);
console.log('  access:           ', db.prepare('SELECT COUNT(*) as c FROM access').get().c);
console.log('  person_departments:', db.prepare('SELECT COUNT(*) as c FROM person_departments').get().c);
console.log('  departments:      ', db.prepare('SELECT COUNT(*) as c FROM departments').get().c);
console.log('\n⏭  Next step: run import-schedules.js to load schedules from Excel files.');
