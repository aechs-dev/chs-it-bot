'use strict';
// link-users-to-contacts.js
// Run once after deploying the new system to link existing users to contacts
// node link-users-to-contacts.js

const db = require('./core/database');

const users    = db.prepare('SELECT * FROM users').all();
const contacts = db.prepare('SELECT * FROM contacts').all();

let linked = 0, skipped = 0;

for (const user of users) {
  // Skip if already linked
  if (user.contact_id) { console.log(`— Already linked: ${user.name}`); skipped++; continue; }

  // Try matching by web_code in contacts
  let match = contacts.find(c => c.web_code === user.code);

  // Try by full_name
  if (!match && user.full_name) {
    match = contacts.find(c => c.name && c.name.toLowerCase() === user.full_name.toLowerCase());
  }

  // Try by first name fuzzy
  if (!match) {
    const displayName = (user.name || '').toLowerCase();
    const firstName = displayName.split(' ').find(p => p.length > 2 && !/^(mr|mrs|ms|dr|miss)\.?$/i.test(p));
    if (firstName) {
      const candidates = contacts.filter(c => c.name && c.name.toLowerCase().includes(firstName));
      if (candidates.length === 1) match = candidates[0];
    }
  }

  if (match) {
    db.prepare('UPDATE users SET contact_id = ? WHERE code = ?').run(match.id, user.code);
    db.prepare('UPDATE contacts SET web_code = ? WHERE id = ?').run(user.code, match.id);
    console.log(`✓ Linked: ${user.name} (${user.code}) → contacts[${match.id}]: ${match.name}`);
    linked++;
  } else {
    console.log(`⚠  No match: ${user.name} (${user.code}) — open /dashboard/staff and grant access manually`);
    skipped++;
  }
}

console.log(`\n✅ Done. Linked: ${linked}, Skipped: ${skipped}`);
