'use strict';
// fix-schedule-overrides.js
// Fixes specific schedule data issues identified by manual verification
// Run: node fix-schedule-overrides.js

const db = require('./core/database');

// 1. Khachig — delete any Mon/Tue/Wed rows (he only comes Thu/Fri)
const khachigDeleted = db.prepare(
  "DELETE FROM schedules WHERE teacher = 'Mr. Khachig Seropian' AND day IN ('Monday','Tuesday','Wednesday')"
).run();
console.log(`✓ Khachig: removed ${khachigDeleted.changes} wrong-day rows`);

// 2. Viken Dishgekenian — his DB name is 'Mr. Viken Dishgekenian'
// Schedule was already loaded correctly from his individual file
// Verify it's there
const vikenRows = db.prepare("SELECT COUNT(*) as c FROM schedules WHERE teacher = 'Mr. Viken Dishgekenian'").get();
console.log(`✓ Viken Dishgekenian: ${vikenRows.c} schedule rows (Mon/Tue/Thu)`);

// 3. Show final counts for all fixed staff
const checks = [
  'Ms. Ani Manougian',
  'Ms. Marina Hamamjian',
  'Ms. Caroline Oughourlian',
  'Ms. Jennifer Degermenjian',
  'Ms. Maria Ounjian',
  'Mr. Khachig Seropian',
  'Mr. Viken Dishgekenian',
];

console.log('\nFinal schedule counts:');
for (const name of checks) {
  const rows = db.prepare('SELECT day, period FROM schedules WHERE teacher = ? AND day != ?').all(name, '');
  const byDay = {};
  rows.forEach(r => { byDay[r.day] = (byDay[r.day]||0)+1; });
  console.log(`  ${name}: ${JSON.stringify(byDay)}`);
}
console.log('\n✅ Done');
