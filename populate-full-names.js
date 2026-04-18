'use strict';
// populate-full-names.js
// Auto-sets full_name for all contacts by finding their exact match in schedules table
// Run: node populate-full-names.js

const db = require('./core/database');

const contacts = db.prepare('SELECT * FROM contacts ORDER BY id ASC').all();
const teachers = db.prepare('SELECT DISTINCT teacher FROM schedules WHERE teacher != ?').all('').map(r => r.teacher);

console.log(`Contacts: ${contacts.length} | Schedule teachers: ${teachers.length}\n`);

let matched = 0, skipped = 0, noMatch = 0;

for (const contact of contacts) {
  // Skip if full_name already set correctly
  if (contact.full_name && teachers.includes(contact.full_name)) {
    console.log(`— Already set: [${contact.id}] ${contact.full_name}`);
    skipped++;
    continue;
  }

  const firstName = (contact.name || '').split(' ')[0].toLowerCase();
  const lastName  = (contact.name || '').split(' ').slice(1).join(' ').toLowerCase();

  // Strategy 1: exact match on full name with any title prefix
  const titles = ['Mr.', 'Mrs.', 'Ms.', 'Miss', 'Dr.'];
  let match = null;

  for (const title of titles) {
    const candidate = `${title} ${contact.name}`;
    if (teachers.includes(candidate)) { match = candidate; break; }
  }

  // Strategy 2: match last name + first name (both must appear)
  if (!match && lastName) {
    const candidates = teachers.filter(t => {
      const tl = t.toLowerCase();
      return tl.includes(firstName) && tl.includes(lastName);
    });
    if (candidates.length === 1) match = candidates[0];
  }

  // Strategy 3: last name only match (only if unique)
  if (!match && lastName.length > 3) {
    const candidates = teachers.filter(t => t.toLowerCase().includes(lastName));
    if (candidates.length === 1) match = candidates[0];
  }

  if (match) {
    db.prepare('UPDATE contacts SET full_name = ? WHERE id = ?').run(match, contact.id);
    console.log(`✓ [${contact.id}] ${contact.name} → ${match}`);
    matched++;
  } else {
    console.log(`⚠  [${contact.id}] ${contact.name} — no match found (set manually)`);
    noMatch++;
  }
}

console.log(`\n✅ Done.`);
console.log(`   Matched:   ${matched}`);
console.log(`   Already set: ${skipped}`);
console.log(`   No match:  ${noMatch} (need manual full_name on their staff page)`);
