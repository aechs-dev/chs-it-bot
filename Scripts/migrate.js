// ─────────────────────────────────────────────────────────────────────────────
// CHS.ai — Database Migration Script
// Run ONCE: node scripts/migrate.js
// Reads all Excel files + profile JSONs → inserts into SQLite database
// Safe to re-run — uses INSERT OR REPLACE so no duplicates
// ─────────────────────────────────────────────────────────────────────────────

require('dotenv').config();
const path = require('path');
const fs   = require('fs');
const xlsx = require('xlsx');
const db   = require('../core/database');

const KB_DIR       = path.join(__dirname, '..', 'knowledge');
const PROFILES_DIR = path.join(__dirname, '..', 'profiles');

let totalInserted = 0;

function readXlsx(filename) {
  const fp = path.join(KB_DIR, filename);
  if (!fs.existsSync(fp)) {
    console.warn(`  ⚠️  Not found: ${filename}`);
    return [];
  }
  const wb = xlsx.readFile(fp);
  const ws = wb.Sheets[wb.SheetNames[0]];
  return xlsx.utils.sheet_to_json(ws, { defval: '' });
}

function log(table, count) {
  console.log(`  ✅ ${table}: ${count} rows inserted`);
  totalInserted += count;
}

// ── 1. CONTACTS ──────────────────────────────────────────────────────────────
console.log('\n📋 Migrating contacts...');
{
  const rows = readXlsx('contacts.xlsx');
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO contacts
      (name, title, role, phone, department, subjects, lid, handles, employment, presence)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insert = db.transaction((rows) => {
    for (const r of rows) {
      // Extract title from name if present
      const nameStr  = String(r['Name'] || '').trim();
      const titleMatch = nameStr.match(/^(Dr\.|Mrs\.|Mr\.|Ms\.)\s+/);
      const title    = titleMatch ? titleMatch[1] : '';
      const cleanName = nameStr.replace(/^(Dr\.|Mrs\.|Mr\.|Ms\.)\s+/, '').trim();
      stmt.run(
        cleanName || nameStr,
        title,
        String(r['Role'] || '').trim(),
        String(r['Phone Number'] || '').trim(),
        String(r['Department'] || '').trim(),
        String(r['Classes / Subjects'] || '').trim(),
        String(r['LID ID'] || '').trim() || null,
        String(r['Handles'] || '').trim(),
        String(r['Employment Type'] || '').trim(),
        String(r['Presence / Availability Notes'] || '').trim()
      );
    }
  });
  insert(rows);
  log('contacts', rows.length);
}

// ── 2. SCHEDULES ─────────────────────────────────────────────────────────────
console.log('\n📅 Migrating schedules...');
{
  const rows = readXlsx('staff_schedules.xlsx');
  const stmt = db.prepare(`
    INSERT INTO schedules (teacher, day, time, period, class, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  // Clear existing before re-inserting
  db.prepare('DELETE FROM schedules').run();
  const insert = db.transaction((rows) => {
    for (const r of rows) {
      stmt.run(
        String(r['Teacher'] || '').trim(),
        String(r['Day'] || '').trim(),
        String(r['Time'] || '').trim(),
        String(r['Period'] || '').trim(),
        String(r['Class / Subject'] || '').trim(),
        String(r['Notes'] || '').trim()
      );
    }
  });
  insert(rows);
  log('schedules', rows.length);
}

// ── 3. SUBJECTS ──────────────────────────────────────────────────────────────
console.log('\n📚 Migrating subjects...');
{
  const rows = readXlsx('subjects.xlsx');
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO subjects (subject, grade, teacher, department, notes)
    VALUES (?, ?, ?, ?, ?)
  `);
  db.prepare('DELETE FROM subjects').run();
  const insert = db.transaction((rows) => {
    for (const r of rows) {
      stmt.run(
        String(r['Subject'] || '').trim(),
        String(r['Grade / Level'] || '').trim(),
        String(r['Teacher'] || '').trim(),
        String(r['Department'] || '').trim(),
        String(r['Notes'] || '').trim()
      );
    }
  });
  insert(rows);
  log('subjects', rows.length);
}

// ── 4. WIFI ──────────────────────────────────────────────────────────────────
console.log('\n📶 Migrating WiFi...');
{
  const rows = readXlsx('wifi.xlsx');
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO wifi
      (network_name, password, login_required, username, login_password, access_level, allowed_users, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  db.prepare('DELETE FROM wifi').run();
  const insert = db.transaction((rows) => {
    for (const r of rows) {
      stmt.run(
        String(r['Network Name'] || '').trim(),
        String(r['Password'] || '').trim(),
        String(r['Login Required'] || '').trim(),
        String(r['Username'] || '').trim(),
        String(r['Login Password'] || '').trim(),
        String(r['Access Level'] || '').trim(),
        String(r['Allowed Users'] || '').trim(),
        String(r['Notes'] || '').trim()
      );
    }
  });
  insert(rows);
  log('wifi', rows.length);
}

// ── 5. CALENDAR ──────────────────────────────────────────────────────────────
console.log('\n📆 Migrating calendar...');
{
  const rows = readXlsx('academic_calendar.xlsx');
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO calendar (date, day, event, type, school_day)
    VALUES (?, ?, ?, ?, ?)
  `);
  db.prepare('DELETE FROM calendar').run();
  const insert = db.transaction((rows) => {
    for (const r of rows) {
      stmt.run(
        String(r['Date'] || '').trim(),
        String(r['Day'] || '').trim(),
        String(r['Event / Note'] || '').trim(),
        String(r['Type'] || '').trim(),
        String(r['School Day?'] || '').trim()
      );
    }
  });
  insert(rows);
  log('calendar', rows.length);
}

// ── 6. ESKOOL ────────────────────────────────────────────────────────────────
console.log('\n🖥️  Migrating ESkool...');
{
  const rows = readXlsx('eskool.xlsx');
  if (rows.length > 0) {
    const keys = Object.keys(rows[0]);
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO eskool (issue, solution, category, notes)
      VALUES (?, ?, ?, ?)
    `);
    db.prepare('DELETE FROM eskool').run();
    const insert = db.transaction((rows) => {
      for (const r of rows) {
        stmt.run(
          String(r[keys[0]] || '').trim(),
          String(r[keys[1]] || '').trim(),
          String(r[keys[2]] || '').trim(),
          String(r[keys[3]] || '').trim()
        );
      }
    });
    insert(rows);
    log('eskool', rows.length);
  }
}

// ── 7. DEVICES ───────────────────────────────────────────────────────────────
console.log('\n💻 Migrating devices...');
{
  const rows = readXlsx('devices.xlsx');
  if (rows.length > 0) {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO devices (device_name, type, location, assigned_to, serial, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    db.prepare('DELETE FROM devices').run();
    const keys = Object.keys(rows[0]);
    const insert = db.transaction((rows) => {
      for (const r of rows) {
        stmt.run(
          String(r[keys[0]] || '').trim(),
          String(r[keys[1]] || '').trim(),
          String(r[keys[2]] || '').trim(),
          String(r[keys[3]] || '').trim(),
          String(r[keys[4]] || '').trim(),
          String(r[keys[5]] || '').trim()
        );
      }
    });
    insert(rows);
    log('devices', rows.length);
  } else {
    console.log('  ⏭  devices.xlsx empty or not found — skipping');
  }
}

// ── 8. PASSWORDS ─────────────────────────────────────────────────────────────
console.log('\n🔐 Migrating passwords...');
{
  const rows = readXlsx('passwords.xlsx');
  if (rows.length > 0) {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO passwords (system, username, password, url, notes)
      VALUES (?, ?, ?, ?, ?)
    `);
    db.prepare('DELETE FROM passwords').run();
    const keys = Object.keys(rows[0]);
    const insert = db.transaction((rows) => {
      for (const r of rows) {
        stmt.run(
          String(r[keys[0]] || '').trim(),
          String(r[keys[1]] || '').trim(),
          String(r[keys[2]] || '').trim(),
          String(r[keys[3]] || '').trim(),
          String(r[keys[4]] || '').trim()
        );
      }
    });
    insert(rows);
    log('passwords', rows.length);
  } else {
    console.log('  ⏭  passwords.xlsx empty or not found — skipping');
  }
}

// ── 9. PROFILES ──────────────────────────────────────────────────────────────
console.log('\n👤 Migrating profiles...');
{
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO profiles
      (lid, name, title, role, division, subject, classes, phone,
       language_style, devices, recent_issues, preferences, status,
       source, first_seen, last_seen, message_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insert = db.transaction((profiles) => {
    for (const p of profiles) {
      if (!p.lid) continue; // skip profiles without a LID
      stmt.run(
        String(p.lid),
        p.name          ? String(p.name)          : null,
        p.title         ? String(p.title)         : null,
        p.role          ? String(p.role)          : null,
        p.division      ? String(p.division)      : null,
        p.subject       ? String(p.subject)       : null,
        p.classes       ? String(p.classes)       : null,
        p.phone         ? String(p.phone)         : null,
        String(p.languageStyle || 'english'),
        JSON.stringify(Array.isArray(p.devices)      ? p.devices      : []),
        JSON.stringify(Array.isArray(p.recentIssues) ? p.recentIssues : []),
        p.preferences   ? String(p.preferences)   : null,
        String(p.status || 'Active'),
        String(p.source || 'whatsapp'),
        String(p.firstSeen || new Date().toISOString().split('T')[0]),
        String(p.lastSeen  || new Date().toISOString().split('T')[0]),
        Number(p.messageCount || 0)
      );
    }
  });

  // Scan all profile subfolders
  let profileCount = 0;
  if (fs.existsSync(PROFILES_DIR)) {
    const folders = fs.readdirSync(PROFILES_DIR).filter(f =>
      fs.statSync(path.join(PROFILES_DIR, f)).isDirectory()
    );
    const allProfiles = [];
    for (const folder of folders) {
      const files = fs.readdirSync(path.join(PROFILES_DIR, folder))
        .filter(f => f.endsWith('.json'));
      for (const file of files) {
        try {
          const raw  = fs.readFileSync(path.join(PROFILES_DIR, folder, file), 'utf8');
          const data = JSON.parse(raw);
          allProfiles.push(data);
        } catch(e) {
          console.warn(`  ⚠️  Skipping corrupt: ${folder}/${file}`);
        }
      }
    }
    insert(allProfiles);
    profileCount = allProfiles.length;
  }
  log('profiles', profileCount);
}

// ── 10. WEB USERS ────────────────────────────────────────────────────────────
console.log('\n👥 Migrating web users...');
{
  const rows = readXlsx('users.xlsx');
  if (rows.length > 0) {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO users (name, code, mode)
      VALUES (?, ?, ?)
    `);
    const insert = db.transaction((rows) => {
      for (const r of rows) {
        stmt.run(
          String(r['name'] || '').trim(),
          String(r['code'] || '').trim(),
          String(r['mode'] || 'auto').trim()
        );
      }
    });
    insert(rows);
    log('users', rows.length);
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n─────────────────────────────────────────');
console.log(`✅ Migration complete — ${totalInserted} total rows inserted`);
console.log(`📁 Database: ${path.join(__dirname, '..', 'data', 'chs.db')}`);
console.log('─────────────────────────────────────────\n');

db.close();
