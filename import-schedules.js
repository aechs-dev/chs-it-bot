'use strict';

/**
 * CHS.ai — Schedule Importer 2025-2026
 *
 * Sources:
 *   1. Elementary + Intermediate + Secondary Departments/ (individual files)
 *   2. Special Ed Department.xlsx (tabs)
 *   3. KG Department.xlsx (tabs)
 *
 * Exact matching only. No fuzzy logic.
 * Shows full preview and asks confirmation before writing.
 *
 * Usage: node import-schedules.js "C:\Users\Yeghia\whatsapp-ai-bot\knowledge\Schedules"
 */

const Database  = require('better-sqlite3');
const path      = require('path');
const fs        = require('fs');
const XLSX      = require('xlsx');
const readline  = require('readline');

const db = new Database(path.join(__dirname, 'data', 'chs.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const SCHEDULES_FOLDER = process.argv[2];
if (!SCHEDULES_FOLDER || !fs.existsSync(SCHEDULES_FOLDER)) {
  console.error('❌ Folder not found:', SCHEDULES_FOLDER);
  console.error('   Usage: node import-schedules.js "C:\\Users\\Yeghia\\whatsapp-ai-bot\\knowledge\\Schedules"');
  process.exit(1);
}

const ACADEMIC_YEAR = '2025-2026';

const PERIOD_MAP = {
  '8:00 - 8:45':   '1',
  '8:45 - 9:30':   '2',
  '9:30 - 10:15':  '3',
  '10:40 - 11:25': '4',
  '11:25 - 12:10': '5',
  '12:30 - 1:15':  '6',
  '12:30 - 13:15': '6',
  '1:15 - 2:00':   '7',
  '13:15 - 14:00': '7',
};

const VALID_DAYS    = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
const VALID_PERIODS = ['1','2','3','4','5','6','7'];

const INDIVIDUAL_MAP = {
  'Miss Alik Istamboulian':   'Alik Stanboulian',
  'Miss Heghnar':             null,
  'Mr Alfredo Dawlabany':     'Mr. Alfredo Dawlabani',
  'Mr Atam Tazian ':          'Mr. Atam Tazian',
  'Mr Atam Tazian':           'Mr. Atam Tazian',
  'Mr Ghazar Keoshkerian':    'Mr. Ghazar Keoshgerian',
  'Mr Jano Baghboudarian':    'Mr. Jano Baghboudarian',
  'Mr Jawad Mestrah':         'Mr. Jawad Mestrah',
  'Mr Khachig Seropian':      'Mr. Khachig Seropian',
  'Mr Pascal Ferzly':         'Mr. Pascal Al Ferzly',
  'Mr Ralph Ibrahim':         'Mr. Ralph Ibrahim',
  'Mr Vicken Dishchekenian':  'Mr. Viken Dishgekenian',
  'Mr Vicken Koujanian':      'Mr. Vicken Koujanian',
  'Mr Yeghia':                'Mr. Yeghia Boghossian',
  'Mrs Maria Guiragossian':   'Mrs. Maria Guiragossian',
  'Ms Aline Kevorkian':       'Ms. Aline Kevorkian',
  'Ms Ani Manougian':         'Ms. Ani Manougian',
  'Ms Cynthia Shakar':        'Ms. Cynthia Shaker',
  'Ms Haverj Shekherdemian':  'Ms. Haverj Shekherdemian',
  'Ms Houri Kevorkian':       'Ms. Houry Kevorkian',
  'Ms Kawkab Haddad':         'Ms. Kawkab Haddad',
  'Ms Lena Azad':             'Ms. Lena Titizian',
  'Ms Maggie Boghossian':     'Ms. Maggie Boghossian',
  'Ms Maral Avedissian':      'Ms. Maral Avedissian',
  'Ms Maral deyirmenjian':    'Mrs. Maral Deyirmenjian',
  'Ms Maral Haidossian':      'Ms. Maral Haidostian',
  'Ms Maral Manissalian':     'Ms. Maral Manisalian',
  'Ms Margo Kordahy':         'Ms. Margo Kordahi',
  'Ms Maria Ounjian':         'Ms. Maria Ounjian',
  'Ms Mariebelle Mansour':    'Ms. Mariebelle Mansour',
  'Ms Marina Hamamjian':      'Ms. Marina Hamamjian',
  'Ms Markrid Margossian':    'Mrs. Markrid Margossian',
  'Ms Mireille Mardirossian': 'Ms. Mireille Mardirossian',
  'Ms Nora Terzian':          'Ms. Nora Terzian',
  'Ms Patil Balabanian':      'Ms. Patil Balabanian',
  'Ms Rima Cholakian':        'Ms. Rima Cholakian',
  'Ms Rita Avedanian':        'Ms. Rita Avedanian',
  'Ms Sella Moughalian':      'Ms. Sella Moughalian',
  'Ms Tania Khoury':          'Ms. Tania El Khoury',
  'Ms Varty Salkhanian':      null,  // covered by Special Ed tab (more detail)
  'Ms tamar gumushian':       'Ms. Tamar Gumushian',
  'Ms vana Zeytounian':       'Ms. Vana Zeitounian',
};

const SPECIAL_ED_MAP = {
  'Christine':   'Ms. Christine Torossian',
  'Nairie':      'Ms. Nayiri Lousinian',
  'Carine':      'Ms. Carine Abaklian',
  'Patil':       'Ms. Patil Kazanjian',
  'Melissa':     'Ms. Melissa Mardikian',
  'Marie belle': 'Ms. Mariebelle Mansour',
  'Hamesd':      'Ms. Hamesd Boyadjian',
  'Hagop':       'Mr. Hagop Chakmakian',
  'Varty':       'Ms. Varty Salkhanian',
};

const KG_MAP = {
  'Margo':    null,  // individual file already complete
  'Mireille': null,  // individual file already complete
  'Rita R.':  'Ms. Rita Rizk',
  'Talar':    'Ms. Talar Kademian',
  'Annie B':  'Ms. Annie Boghossian',
  'Lena ':    'Ms. Lena Nader',
  'Caroline': 'Mrs. Caroline Mississian',
  'Dzovag':   'Ms. Dzovag Aynilian',
  'Jennifer': 'Ms. Jennifer Degermenjian',
};

const SKIP_KG_TABS = ['periods per teacher','KG3 (A)','KG3 (B)','KG2','KG1','PRE'];

const peopleRows = db.prepare('SELECT id, full_name FROM people').all();
const byFullName = new Map(peopleRows.map(p => [p.full_name.trim(), p.id]));

function getPersonId(fullName) {
  if (!fullName) return null;
  return byFullName.get(fullName.trim()) || null;
}

function parseStandardSheet(ws) {
  const data      = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  const schedule  = [];
  let headerFound = false;
  let dayCols     = {};

  for (const row of data) {
    const cells = row.map(c => (c != null ? String(c).trim() : ''));
    const upper = cells.map(c => c.toUpperCase());

    if (!headerFound && upper.includes('MONDAY')) {
      headerFound = true;
      upper.forEach((c, i) => {
        const day = VALID_DAYS.find(d => d.toUpperCase() === c);
        if (day) dayCols[i] = day;
      });
      continue;
    }

    if (!headerFound) continue;

    const period = PERIOD_MAP[cells[1]];
    if (!period) continue;

    for (const [colIdx, day] of Object.entries(dayCols)) {
      const val = cells[parseInt(colIdx)];
      if (!val) continue;
      if (/recess|assembly/i.test(val)) continue;
      schedule.push({ day, period, class_name: val });
    }
  }
  return schedule;
}

function parseKGSheet(ws) {
  const data      = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  const schedule  = [];
  let headerFound = false;
  let dayCols     = {};

  for (const row of data) {
    const cells = row.map(c => (c != null ? String(c).trim() : ''));
    const upper = cells.map(c => c.toUpperCase());

    if (!headerFound && upper.includes('MONDAY')) {
      headerFound = true;
      upper.forEach((c, i) => {
        const day = VALID_DAYS.find(d => d.toUpperCase() === c);
        if (day) dayCols[i] = day;
      });
      continue;
    }

    if (!headerFound) continue;

    const period = PERIOD_MAP[cells[1]];
    if (!period) continue;

    for (const [colIdx, day] of Object.entries(dayCols)) {
      const val = cells[parseInt(colIdx)];
      if (!val) continue;
      if (/recess|assembly|welcome|worship|circle|breakfast/i.test(val)) continue;
      schedule.push({ day, period, class_name: val });
    }
  }
  return schedule;
}

const allSchedules = new Map();
const unmatchedLog = [];
const skippedLog   = [];

function addEntries(personFullName, entries, source) {
  const pid = getPersonId(personFullName);
  if (!pid) {
    unmatchedLog.push({ name: personFullName, source, count: entries.length });
    return;
  }
  if (!allSchedules.has(pid)) allSchedules.set(pid, []);
  allSchedules.get(pid).push(...entries);
}

// 1. Individual files
const indivFolder = path.join(SCHEDULES_FOLDER, 'Elementary + Intermediate + Secondary Departments');
console.log('\n📂 Individual teacher files:');
for (const file of fs.readdirSync(indivFolder).filter(f => f.endsWith('.xlsx'))) {
  const excelName = file.replace(/\.xlsx$/i, '').trim();
  const mapped = INDIVIDUAL_MAP[excelName] !== undefined ? INDIVIDUAL_MAP[excelName] : INDIVIDUAL_MAP[excelName.trimEnd()] !== undefined ? INDIVIDUAL_MAP[excelName.trimEnd()] : INDIVIDUAL_MAP[excelName + ' '];

  if (mapped === null) {
    skippedLog.push(excelName);
    console.log(`  ⏭  ${excelName}`);
    continue;
  }
  if (mapped === undefined) {
    unmatchedLog.push({ name: excelName, source: 'individual', count: '?' });
    console.log(`  ✗ ${excelName} — NOT IN MAP`);
    continue;
  }

  const wb       = XLSX.readFile(path.join(indivFolder, file));
  const schedule = parseStandardSheet(wb.Sheets[wb.SheetNames[0]]);
  addEntries(mapped, schedule, 'individual');
  console.log(`  ${getPersonId(mapped) ? '✓' : '✗'} ${excelName} → ${mapped}: ${schedule.length} periods`);
}

// 2. Special Ed file
const specEdFile = fs.readdirSync(SCHEDULES_FOLDER).find(f => f.toLowerCase().includes('special ed') && f.endsWith('.xlsx'));
if (specEdFile) {
  console.log('\n📂 Special Ed file:');
  const wb = XLSX.readFile(path.join(SCHEDULES_FOLDER, specEdFile));
  for (const sheetName of wb.SheetNames) {
    const mapped = SPECIAL_ED_MAP[sheetName.trim()];
    if (!mapped) { console.log(`  ⏭  "${sheetName}"`); continue; }
    const schedule = parseStandardSheet(wb.Sheets[sheetName]);
    addEntries(mapped, schedule, `SpecialEd:${sheetName}`);
    console.log(`  ${getPersonId(mapped) ? '✓' : '✗'} ${sheetName} → ${mapped}: ${schedule.length} periods`);
  }
}

// 3. KG file
const kgFile = fs.readdirSync(SCHEDULES_FOLDER).find(f => f.toLowerCase().startsWith('kg') && f.endsWith('.xlsx'));
if (kgFile) {
  console.log('\n📂 KG Department file:');
  const wb = XLSX.readFile(path.join(SCHEDULES_FOLDER, kgFile));
  for (const sheetName of wb.SheetNames) {
    if (SKIP_KG_TABS.includes(sheetName)) { console.log(`  ⏭  "${sheetName}" (class tab)`); continue; }
    const mapped = KG_MAP[sheetName];
    if (!mapped) { console.log(`  ⏭  "${sheetName}" (not in map)`); continue; }
    const schedule = parseKGSheet(wb.Sheets[sheetName]);
    addEntries(mapped, schedule, `KG:${sheetName}`);
    console.log(`  ${getPersonId(mapped) ? '✓' : '✗'} ${sheetName} → ${mapped}: ${schedule.length} periods`);
  }
}

// Preview
console.log('\n' + '='.repeat(60));
console.log('📊 IMPORT PREVIEW');
console.log('='.repeat(60));
let totalPeriods = 0;
for (const [pid, entries] of allSchedules.entries()) {
  const person = peopleRows.find(p => p.id === pid);
  console.log(`  ${person?.full_name}: ${entries.length} periods`);
  totalPeriods += entries.length;
}
console.log(`\n  Teachers: ${allSchedules.size}  |  Total periods: ${totalPeriods}`);

if (unmatchedLog.length > 0) {
  console.log('\n⚠  UNMATCHED — will NOT be imported:');
  for (const u of unmatchedLog) console.log(`  ✗ "${u.name}" (${u.source})`);
}

// Confirm
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('\nProceed with import? (yes/no): ', answer => {
  rl.close();
  if (answer.trim().toLowerCase() !== 'yes') {
    console.log('❌ Cancelled. Nothing written.');
    process.exit(0);
  }

  const insert = db.prepare(`
    INSERT OR IGNORE INTO schedules (person_id, academic_year, day, period, class_name)
    VALUES (?, ?, ?, ?, ?)
  `);

  const inserted = db.transaction(() => {
    db.prepare('DELETE FROM schedules WHERE academic_year = ?').run(ACADEMIC_YEAR);
    let count = 0;
    for (const [pid, entries] of allSchedules.entries()) {
      for (const e of entries) {
        if (!VALID_DAYS.includes(e.day))       continue;
        if (!VALID_PERIODS.includes(e.period)) continue;
        insert.run(pid, ACADEMIC_YEAR, e.day, e.period, e.class_name);
        count++;
      }
    }
    return count;
  })();

  console.log(`\n✅ Done — ${inserted} rows written to schedules table`);
  console.log('📊 Total:', db.prepare('SELECT COUNT(*) as c FROM schedules').get().c);
});
