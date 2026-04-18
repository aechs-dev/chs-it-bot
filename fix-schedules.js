'use strict';
// fix-schedules.js
// Replaces schedule data for 41 teachers with clean data from Excel source of truth
// Deduplicates periods, fixes wrong teacher name mappings
// Run: node fix-schedules.js

const db   = require('./core/database');
const fs   = require('fs');
const path = require('path');

const sqlFile = path.join(__dirname, 'fix-schedules.sql');
if (!fs.existsSync(sqlFile)) {
  console.error('fix-schedules.sql not found — place it in the bot root folder');
  process.exit(1);
}

const sql = fs.readFileSync(sqlFile, 'utf8');

// Split into individual statements
const statements = sql
  .split('\n')
  .filter(line => !line.startsWith('--') && line.trim())
  .join('\n')
  .split(';')
  .map(s => s.trim())
  .filter(s => s && s !== 'BEGIN TRANSACTION' && s !== 'COMMIT');

let deleted = 0, inserted = 0, errors = 0;

const run = db.transaction(() => {
  for (const stmt of statements) {
    try {
      const result = db.prepare(stmt).run();
      if (stmt.startsWith('DELETE')) deleted += result.changes;
      if (stmt.startsWith('INSERT')) inserted++;
    } catch (e) {
      console.error(`Error on: ${stmt.substring(0, 80)}`);
      console.error(e.message);
      errors++;
    }
  }
});

run();

console.log(`\n✅ Schedule fix complete`);
console.log(`   Deleted old rows: ${deleted}`);
console.log(`   Inserted new rows: ${inserted}`);
if (errors > 0) console.log(`   ⚠  Errors: ${errors}`);

// Verify
const total = db.prepare('SELECT COUNT(*) as c FROM schedules WHERE teacher != ?').get('').c;
console.log(`   Total schedule rows now: ${total}`);
