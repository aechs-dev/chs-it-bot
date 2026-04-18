'use strict';
// diagnose-schedules.js
// Checks all contacts with full_name set against their schedule data
// Flags: missing schedules, suspiciously empty days, part-time mismatches
// Run: node diagnose-schedules.js

const db = require('./core/database');

const contacts = db.prepare(`
  SELECT id, name, full_name, employment, presence 
  FROM contacts 
  WHERE full_name IS NOT NULL AND full_name != ''
  AND (employment IS NULL OR employment != 'Office')
  ORDER BY name ASC
`).all();

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
const PERIODS = ['1','2','3','4','5','6','7'];

// Normalize period string
function normalizePeriod(p) {
  return String(p).replace(/^period\s*/i,'').trim();
}

// Check if day name appears in presence text
function mentionsDay(presence, day) {
  const p = (presence || '').toLowerCase();
  const dayAbbr = day.toLowerCase().slice(0,3);
  const variants = {
    Monday:    ['monday','mon'],
    Tuesday:   ['tuesday','tue'],
    Wednesday: ['wednesday','wed'],
    Thursday:  ['thursday','thu'],
    Friday:    ['friday','fri'],
  };

  // Explicit NOT present patterns
  const notPatterns = [
    `not present on ${day.toLowerCase()}`,
    `not present ${day.toLowerCase()}`,
    `not on ${day.toLowerCase()}`,
    `${dayAbbr} not available`,
    `${dayAbbr}: not`,
    `not present on ${dayAbbr}`,
  ];
  if (notPatterns.some(np => p.includes(np))) return false;

  // Handle "Mon-Fri" or "Tue–Fri" range notation
  const dayOrder = ['mon','tue','wed','thu','fri'];
  const rangeRe = /([a-z]{3})[\u2013\u2014\-]([a-z]{3})/g;
  let m;
  while ((m = rangeRe.exec(p)) !== null) {
    const s = dayOrder.indexOf(m[1]), e = dayOrder.indexOf(m[2]), c = dayOrder.indexOf(dayAbbr);
    if (s !== -1 && e !== -1 && c >= s && c <= e) return true;
  }

  return (variants[day] || []).some(v => p.includes(v));
}

console.log('═══════════════════════════════════════════════════════');
console.log('  CHS.ai Schedule Diagnostic Report');
console.log('═══════════════════════════════════════════════════════\n');

const issues = [];

for (const contact of contacts) {
  const rows = db.prepare('SELECT * FROM schedules WHERE teacher = ?').all(contact.full_name);
  
  // Remove blank rows
  const validRows = rows.filter(r => r.day && r.period && r.class);
  
  const isPartTime = (contact.employment || '').toLowerCase().includes('part');

  // Group by day
  const byDay = {};
  for (const d of DAYS) byDay[d] = [];
  for (const r of validRows) {
    if (byDay[r.day]) {
      byDay[r.day].push(normalizePeriod(r.period));
    }
  }

  const staffIssues = [];

  // Check 1: No schedule at all
  if (validRows.length === 0) {
    staffIssues.push('⚠️  No schedule rows found');
  }

  // Check 2: Days completely empty (for full-time staff)
  // Skip if presence note explicitly accounts for the empty day
  if (!isPartTime && validRows.length > 0) {
    const p = (contact.presence || '').toLowerCase();
    for (const day of DAYS) {
      if (byDay[day].length === 0) {
        const d = day.toLowerCase();
        const a = d.slice(0,3);
        // Skip if presence note explains the empty day
        const explained =
          p.includes(`no ${d} class`) ||
          p.includes(`no ${a} class`) ||
          p.includes(`not ${d}`) ||
          p.includes(`${a} only`) ||
          p.includes(`teaches ${a}`) ||
          p.includes(`teaches wed`) ||
          (p.includes('only') && !p.includes(a));
        if (!explained) {
          staffIssues.push(`📅 ${day}: no classes (full-time — expected some activity)`);
        }
      }
    }
  }

  // Check 3: Part-time — check if days match presence notes
  if (isPartTime && contact.presence) {
    for (const day of DAYS) {
      const onCampus = mentionsDay(contact.presence, day);
      const hasClasses = byDay[day].length > 0;
      if (!onCampus && hasClasses) {
        staffIssues.push(`🔴 ${day}: has classes but presence says NOT on campus`);
      }
      if (onCampus && !hasClasses) {
        staffIssues.push(`🟡 ${day}: presence says on campus but NO classes scheduled`);
      }
    }
  }

  // Check 4: Duplicate periods on same day
  for (const day of DAYS) {
    const periods = byDay[day];
    const dupes = periods.filter((p, i) => periods.indexOf(p) !== i);
    if (dupes.length > 0) {
      staffIssues.push(`⚡ ${day}: duplicate period(s) ${[...new Set(dupes)].join(', ')}`);
    }
  }

  if (staffIssues.length > 0) {
    issues.push({ contact, issues: staffIssues, byDay, validRows });
    console.log(`❌ [${contact.id}] ${contact.full_name}`);
    console.log(`   Employment: ${contact.employment || 'not set'}`);
    if (contact.presence) console.log(`   Presence: ${contact.presence}`);
    staffIssues.forEach(i => console.log(`   ${i}`));
    console.log(`   Schedule: ${DAYS.map(d => `${d.slice(0,3)}:${byDay[d].length || 0}`).join(' | ')}`);
    console.log();
  }
}

console.log('═══════════════════════════════════════════════════════');
console.log(`  ${issues.length} staff with potential issues out of ${contacts.length} total`);
console.log('═══════════════════════════════════════════════════════');

if (issues.length === 0) {
  console.log('\n✅ All schedules look clean!');
}
