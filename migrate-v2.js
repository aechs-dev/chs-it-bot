'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// migrate-v2.js — CHS.ai Database Migration to v2.0
//
// Migrates data from:
//   contacts → people + roles + person_departments + presence + access
//   users    → access (web_code)
//   schedules (teacher text) → schedules (person_id)
//
// Safe to run multiple times — uses INSERT OR IGNORE
// Run: node migrate-v2.js
// ─────────────────────────────────────────────────────────────────────────────

const db = require('./core/database');

// ── Role type mapping from free text ─────────────────────────────────────────
const ROLE_MAP = [
  { pattern: /principal/i,          role: 'principal',          subEligible: 0 },
  { pattern: /academic.director/i,  role: 'academic_director',  subEligible: 0 },
  { pattern: /it.manager/i,         role: 'it_manager',         subEligible: 0 },
  { pattern: /secretary/i,          role: 'secretary',          subEligible: 0 },
  { pattern: /accountant/i,         role: 'accountant',         subEligible: 0 },
  { pattern: /psychologist/i,       role: 'psychologist',       subEligible: 0 },
  { pattern: /counselor|counsellor/i,role: 'counselor',         subEligible: 0 },
  { pattern: /librarian/i,          role: 'librarian',          subEligible: 0 },
  { pattern: /nurse/i,              role: 'nurse',              subEligible: 0 },
  { pattern: /bookstore/i,          role: 'bookstore',          subEligible: 0 },
  { pattern: /hod.kg|head.of.kg|kg.head/i,         role: 'hod_kg',           subEligible: 0 },
  { pattern: /hod.elem|head.of.elem|elementary.head/i, role: 'hod_elementary', subEligible: 0 },
  { pattern: /hod.inter|head.of.inter|intermediate.head/i, role: 'hod_intermediate', subEligible: 0 },
  { pattern: /hod.sec|head.of.sec|secondary.head|head.of.department/i, role: 'hod_secondary', subEligible: 0 },
  { pattern: /coordinator/i,        role: 'coordinator',        subEligible: 0 },
  { pattern: /special.ed/i,         role: 'coordinator',        subEligible: 0 },
  { pattern: /government.relation/i,role: 'secretary',          subEligible: 0 },
];

function detectRole(roleText, dept) {
  if (!roleText) return { role: 'teacher', subEligible: 1 };
  const text = `${roleText} ${dept || ''}`;
  for (const m of ROLE_MAP) {
    if (m.pattern.test(text)) return { role: m.role, subEligible: m.subEligible };
  }
  return { role: 'teacher', subEligible: 1 };
}

// ── Department mapping ────────────────────────────────────────────────────────
function detectDept(deptText, roleText, subjectsText) {
  const text = `${deptText || ''} ${roleText || ''} ${subjectsText || ''}`.toLowerCase();
  if (/\bkg\b|kindergarten/i.test(text)) return 'KG';
  if (/elementary/i.test(text)) return 'Elementary';
  if (/intermediate/i.test(text)) return 'Intermediate';
  if (/secondary/i.test(text)) return 'Secondary';
  if (/office|secretary|accountant|government|principal|academic.dir/i.test(text)) return 'Office';
  if (/it.manager|information.tech/i.test(text)) return 'IT';
  return null;
}

// ── Clearance mapping ─────────────────────────────────────────────────────────
const CLEARANCE_MAP = {
  principal: 'office', academic_director: 'office', it_manager: 'owner',
  secretary: 'office', accountant: 'office', government_relations: 'office',
  hod_kg: 'hod', hod_elementary: 'hod', hod_intermediate: 'hod', hod_secondary: 'hod',
  coordinator: 'coordinator',
  teacher: 'teacher', librarian: 'teacher', nurse: 'teacher',
  bookstore: 'teacher', psychologist: 'teacher', counselor: 'teacher',
};

// ── Presence: employment type detection ──────────────────────────────────────
function detectEmployment(empText, presenceText) {
  const text = `${empText || ''} ${presenceText || ''}`.toLowerCase();
  if (text.includes('office')) return 'office';
  if (text.includes('part')) return 'part-time';
  return 'full-time';
}

function detectDays(presenceText, empType) {
  if (empType === 'full-time' || empType === 'office') return 'Mon,Tue,Wed,Thu,Fri';
  if (!presenceText) return 'Mon,Tue,Wed,Thu,Fri';
  const p = presenceText.toLowerCase();
  const days = [];
  if (p.includes('mon') && !p.includes('not present on mon') && !p.includes('mon not')) days.push('Mon');
  if (p.includes('tue') && !p.includes('not present on tue')) days.push('Tue');
  if (p.includes('wed') && !p.includes('not present on wed')) days.push('Wed');
  if (p.includes('thu') && !p.includes('not present on thu')) days.push('Thu');
  if (p.includes('fri') && !p.includes('not present on fri')) days.push('Fri');
  return days.length > 0 ? days.join(',') : 'Mon,Tue,Wed,Thu,Fri';
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n🚀 CHS.ai Database Migration v2.0');
console.log('═══════════════════════════════════════\n');

const migrate = db.transaction(() => {

  // ── Step 1: Get dept IDs ───────────────────────────────────────────────────
  const depts = db.prepare('SELECT * FROM departments').all();
  const deptByName = {};
  depts.forEach(d => { deptByName[d.name] = d.id; });

  // ── Step 2: Migrate contacts → people ─────────────────────────────────────
  const contacts = db.prepare("SELECT * FROM contacts WHERE name IS NOT NULL AND name != ''").all();
  console.log(`📋 Migrating ${contacts.length} contacts → people table`);

  const insertPerson = db.prepare(`
    INSERT OR IGNORE INTO people
      (first_name, last_name, title, full_name, phone, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'active', datetime('now'))
  `);

  const insertRole = db.prepare(`
    INSERT OR IGNORE INTO roles (person_id, role_type, is_primary, substitution_eligible)
    VALUES (?, ?, 1, ?)
  `);

  const insertDept = db.prepare(`
    INSERT OR IGNORE INTO person_departments (person_id, dept_id, is_primary)
    VALUES (?, ?, 1)
  `);

  const insertPresence = db.prepare(`
    INSERT OR IGNORE INTO presence (person_id, employment_type, days, notes)
    VALUES (?, ?, ?, ?)
  `);

  const insertAccess = db.prepare(`
    INSERT OR IGNORE INTO access (person_id, web_code, whatsapp_lid, clearance, web_mode)
    VALUES (?, ?, ?, ?, ?)
  `);

  let peopleInserted = 0;

  for (const c of contacts) {
    // Parse name into first/last
    const nameParts = (c.name || '').trim().split(' ');
    const lastName  = nameParts.pop() || c.name;
    const firstName = nameParts.join(' ') || lastName;

    // Insert person
    const result = insertPerson.run(firstName, lastName, c.title, c.full_name, c.phone);
    let personId;

    if (result.changes === 0) {
      // Already exists — find by full_name or name
      const existing = c.full_name
        ? db.prepare('SELECT id FROM people WHERE full_name = ?').get(c.full_name)
        : db.prepare('SELECT id FROM people WHERE first_name = ? AND last_name = ?').get(firstName, lastName);
      if (!existing) continue;
      personId = existing.id;
    } else {
      personId = result.lastInsertRowid;
      peopleInserted++;
    }

    // Detect and insert role
    const { role, subEligible } = detectRole(c.role, c.department);
    insertRole.run(personId, role, subEligible);

    // Detect and insert department
    const deptName = detectDept(c.department, c.role, c.subjects);
    if (deptName && deptByName[deptName]) {
      insertDept.run(personId, deptByName[deptName]);
    }

    // Insert presence
    const empType = detectEmployment(c.employment, c.presence);
    const days    = detectDays(c.presence, empType);
    insertPresence.run(personId, empType, days, c.presence);

    // Insert access (WhatsApp LID + web_code from users table lookup)
    const webUser = c.web_code
      ? db.prepare('SELECT * FROM users WHERE code = ?').get(c.web_code)
      : db.prepare('SELECT * FROM users WHERE contact_id = ?').get(c.id);

    const clearance = webUser?.clearance || CLEARANCE_MAP[role] || 'teacher';
    const webCode   = webUser?.code || c.web_code || null;
    const webMode   = webUser?.mode || 'auto';

    insertAccess.run(personId, webCode, c.lid || null, clearance, webMode);
  }

  console.log(`   ✓ ${peopleInserted} new people inserted`);

  // ── Step 3: Migrate schedules (teacher text → person_id) ─────────────────
  console.log('\n📅 Migrating schedules → person_id links');

  const oldSchedules = db.prepare(
    "SELECT * FROM schedules WHERE teacher IS NOT NULL AND teacher != '' AND class IS NOT NULL AND class != ''"
  ).all();

  const insertSched = db.prepare(`
    INSERT OR IGNORE INTO schedules_v2 (person_id, academic_year, day, period, class_name)
    VALUES (?, '2025-2026', ?, ?, ?)
  `);

  let schedMigrated = 0, schedSkipped = 0;

  // Build teacher → person_id lookup
  const allPeople = db.prepare('SELECT id, full_name, first_name, last_name FROM people').all();
  const teacherToPersonId = {};

  for (const p of allPeople) {
    if (p.full_name) teacherToPersonId[p.full_name.toLowerCase()] = p.id;
    const fullVariants = [
      `${p.first_name} ${p.last_name}`.toLowerCase(),
      `${p.last_name} ${p.first_name}`.toLowerCase(),
    ];
    fullVariants.forEach(v => { if (!teacherToPersonId[v]) teacherToPersonId[v] = p.id; });
  }

  for (const s of oldSchedules) {
    if (!s.day || !s.period) { schedSkipped++; continue; }

    const teacherLower = (s.teacher || '').toLowerCase().trim();
    let personId = teacherToPersonId[teacherLower];

    // Fuzzy: match by last name
    if (!personId) {
      const parts = teacherLower.replace(/^(mr\.|mrs\.|ms\.|miss|dr\.)\s*/i,'').split(' ');
      const lastName = parts[parts.length - 1];
      if (lastName && lastName.length > 3) {
        const match = allPeople.find(p => p.last_name.toLowerCase() === lastName);
        if (match) personId = match.id;
      }
    }

    if (!personId) { schedSkipped++; continue; }

    // Normalize period
    const period = String(s.period).trim();

    const res = insertSched.run(personId, s.day, period, s.class || s.class_name);
    if (res.changes > 0) schedMigrated++;
    else schedSkipped++;
  }

  console.log(`   ✓ ${schedMigrated} schedule rows migrated`);
  console.log(`   ⚠  ${schedSkipped} skipped (no match or duplicate)`);

  // ── Step 4: Summary ───────────────────────────────────────────────────────
  const peopleFinal   = db.prepare('SELECT COUNT(*) as c FROM people').get().c;
  const rolesFinal    = db.prepare('SELECT COUNT(*) as c FROM roles').get().c;
  const schedFinal    = db.prepare('SELECT COUNT(*) as c FROM schedules_v2').get().c;
  const accessFinal   = db.prepare('SELECT COUNT(*) as c FROM access').get().c;
  const presenceFinal = db.prepare('SELECT COUNT(*) as c FROM presence').get().c;

  console.log('\n═══════════════════════════════════════');
  console.log('✅ Migration complete\n');
  console.log(`   people:   ${peopleFinal}`);
  console.log(`   roles:    ${rolesFinal}`);
  console.log(`   presence: ${presenceFinal}`);
  console.log(`   access:   ${accessFinal}`);
  console.log(`   schedules:${schedFinal}`);
  console.log('\n   Old tables (contacts, users) kept as legacy — do not delete yet.');
  console.log('   Verify data in DB Browser, then run migrate-v2-cleanup.js to remove them.\n');
});

migrate();
