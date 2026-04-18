'use strict';
// fix-presence-employment.js
// Updates employment types and presence notes based on verified schedule data
// Run: node fix-presence-employment.js

const db = require('./core/database');

const fixes = [
  // ── Office staff — change employment to "Office" so diagnostic ignores them ──
  { id: 137, name: 'Mrs. Lara Karghayan',    employment: 'Office' },
  { id: 133, name: 'Dr. Taline Messerlian',  employment: 'Office' },
  { id: 138, name: 'Mrs. Tamar Ohanian',     employment: 'Office' },
  { id: 134, name: 'Mr. Vicken Missisian',   employment: 'Office' },
  { id: 65,  name: 'Miss Barig Barsoumian',  employment: 'Office' },
  { id: 71,  name: 'Ms. Houry Ohanian',      employment: 'Office', presence: 'KG HoD — administrative role, no teaching schedule' },
  { id: 8,   name: 'Ms. Mary Mertkhanian',   employment: 'Office', presence: 'KG2 Assistant — no independent teaching schedule' },
  { id: 66,  name: 'Mrs. Asdghig Jerahian',  employment: 'Office' },
  { id: 60,  name: 'Dr. Anny Joukoulian',    employment: 'Office' },
  { id: 2,   name: 'Ms. Talin Arabian',      employment: 'Office' },
  { id: 140, name: 'Ms. Maria Aprahamian',   employment: 'Office' },

  // ── Fix presence range notation — em dash was breaking parser ──
  { id: 61,  name: 'Ms. Ani Manougian',
    presence: 'On campus: Tue, Wed, Thu, Fri. NOT present on Mondays.' },

  // ── Marina — full-time, all 5 days, periods 1-3 only ──
  { id: 27,  name: 'Ms. Marina Hamamjian',
    employment: 'Full-time',
    presence: 'On campus: Mon, Tue, Wed, Thu, Fri — periods 1-3 only (08:00-10:15)' },

  // ── Alik Stanboulian — full-time ──
  { id: 127, name: 'Miss Alik Stanboulian',
    employment: 'Full-time',
    presence: 'Full-time. Also school nurse — may be pulled from class for medical duties' },

  // ── Haverj — has classes all week, treat as full-time ──
  { id: 30,  name: 'Ms. Haverj Kojaoghlanian',
    employment: 'Full-time',
    presence: 'Full-time. Armenian/KG teacher.' },

  // ── Caroline — on campus all week (KG Armenian + Sports) ──
  { id: 13,  name: 'Ms. Caroline Oughourlian',
    employment: 'Full-time',
    presence: 'Full-time. KG Armenian and Sports.' },

  // ── Jennifer — Mon, Thu, Fri only (corrected from Mon/Wed/Fri) ──
  { id: 12,  name: 'Ms. Jennifer Degermenjian',
    presence: 'On campus: Mon, Thu, Fri only' },

  // ── Maria Ounjian — Mon, Wed, Thu, Fri (Thu = dept meeting only) ──
  { id: 117, name: 'Ms. Maria Ounjian',
    presence: 'On campus: Mon, Wed, Thu, Fri. Not present Tuesdays.' },

  // ── Khachig — Thu/Fri only ──
  { id: 89,  name: 'Mr. Khachig Seropian',
    employment: 'Part-time',
    presence: 'On campus: Thu and Fri only. Sports teacher — all school.' },

  // ── Nora — NOT on campus Tuesdays (already correct but presence note confirms) ──
  { id: 118, name: 'Ms. Nora Terzian',
    presence: 'On campus: Mon, Wed, Thu, Fri. NOT present on Tuesdays.' },

  // ── Maral Deyirmenjian — office/principal, no Friday classes expected ──
  { id: 132, name: 'Mrs. Maral Deyirmenjian',
    employment: 'Office',
    presence: 'Principal — administrative role' },
];

let updated = 0;
for (const fix of fixes) {
  const updates = [];
  const values  = [];
  if (fix.employment !== undefined) { updates.push('employment = ?'); values.push(fix.employment); }
  if (fix.presence   !== undefined) { updates.push('presence = ?');   values.push(fix.presence); }
  if (updates.length === 0) continue;
  values.push(fix.id);
  db.prepare(`UPDATE contacts SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  console.log(`✓ [${fix.id}] ${fix.name}`);
  updated++;
}

console.log(`\n✅ Updated ${updated} contacts`);
