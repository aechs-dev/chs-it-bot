'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// migrate-unify.js
// Adds web_code, web_clearance, web_mode to contacts table
// Links existing users to their contacts record by name matching
// Run once: node migrate-unify.js
// ─────────────────────────────────────────────────────────────────────────────

const db = require('./core/database');

// ── Step 1: Add new columns to contacts if missing ───────────────────────────
const existingCols = db.prepare('PRAGMA table_info(contacts)').all().map(c => c.name);
const newCols = {
  web_code:      'TEXT DEFAULT NULL',
  web_clearance: 'TEXT DEFAULT NULL',
  web_mode:      'TEXT DEFAULT NULL',
  classes:       'TEXT DEFAULT NULL',  // classes/grades this staff teaches
};

for (const [col, def] of Object.entries(newCols)) {
  if (!existingCols.includes(col)) {
    db.prepare(`ALTER TABLE contacts ADD COLUMN ${col} ${def}`).run();
    console.log(`✓ Added contacts.${col}`);
  } else {
    console.log(`— contacts.${col} already exists`);
  }
}

// ── Step 2: Link users to contacts by name matching ──────────────────────────
const users    = db.prepare('SELECT * FROM users').all();
const contacts = db.prepare('SELECT * FROM contacts').all();

let linked = 0;
let unmatched = [];

for (const user of users) {
  // Build name variants to try matching
  const displayName = (user.full_name || user.name || '').toLowerCase().trim();
  const firstName   = displayName.split(' ').find(p => p.length > 2 && !/^(mr|mrs|ms|dr|miss)\.?$/i.test(p)) || '';

  let match = null;

  // Try 1: exact full_name match against contacts.name
  if (user.full_name) {
    match = contacts.find(c => c.name && c.name.toLowerCase().trim() === user.full_name.toLowerCase().trim());
  }

  // Try 2: display name match
  if (!match) {
    match = contacts.find(c => c.name && c.name.toLowerCase().trim() === (user.name || '').toLowerCase().trim());
  }

  // Try 3: first name fuzzy match
  if (!match && firstName.length >= 3) {
    const candidates = contacts.filter(c => c.name && c.name.toLowerCase().includes(firstName));
    if (candidates.length === 1) match = candidates[0];
  }

  if (match) {
    db.prepare(`UPDATE contacts SET web_code = ?, web_clearance = ?, web_mode = ?, classes = ?
                WHERE id = ?`).run(
      user.code,
      user.clearance || null,
      user.mode      || 'auto',
      user.classes   || null,
      match.id
    );
    console.log(`✓ Linked: ${user.name} (${user.code}) → contacts: ${match.name}`);
    linked++;
  } else {
    unmatched.push(user.name + ' (' + user.code + ')');
  }
}

console.log(`\n✅ Linked ${linked}/${users.length} users to contacts.`);
if (unmatched.length > 0) {
  console.log(`⚠️  Unmatched users (set Full Name on their profile page):`);
  unmatched.forEach(u => console.log('   —', u));
}

// ── Step 3: Verify ────────────────────────────────────────────────────────────
console.log('\n── Contacts with web access ──────────────────────────────');
const linked2 = db.prepare('SELECT name, web_code, web_clearance, web_mode FROM contacts WHERE web_code IS NOT NULL').all();
linked2.forEach(r => console.log(`  ${r.name} | ${r.web_code} | ${r.web_clearance || '(not set)'} | ${r.web_mode}`));
console.log('\nDone. No restart needed.');
