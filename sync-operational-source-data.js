'use strict';

const path = require('path');
const XLSX = require('xlsx');
const db = require('./core/database');

const ACADEMIC_YEAR = '2025-2026';
const SCHOOL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const PERIODS = ['1', '2', '3', '4', '5', '6', '7'];
const PERIOD_WINDOWS = {
  '1': { start: 480, end: 525 },
  '2': { start: 525, end: 570 },
  '3': { start: 570, end: 615 },
  '4': { start: 640, end: 685 },
  '5': { start: 685, end: 730 },
  '6': { start: 750, end: 795 },
  '7': { start: 795, end: 840 },
};

const CONTACTS_FILE = path.join(__dirname, 'knowledge', 'contacts.xlsx');
const STAFF_SCHEDULES_FILE = path.join(__dirname, 'knowledge', 'staff_schedules.xlsx');

const SAFE_ALIASES = {
  'Miss Alik Stanboulian': 'Alik Stanboulian',
  'Miss Barig Barsoumian': 'Barig Barsoumian',
  'Ms. Caroline Missisian': 'Mrs. Caroline Mississian',
  'Ms. Haverj Kojaoghlanian': 'Ms. Haverj Shekherdemian',
  'Ms. Houry Ohanian': 'Mrs. Houry Ohanian',
  'Ms. Nayiri Kazdjian': 'Ms. Nayiri Israbian',
};

const DAY_REGEXES = [
  { day: 'Monday', regex: /\bmon(?:day)?s?\b/gi },
  { day: 'Tuesday', regex: /\btue(?:s|sday)?s?\b/gi },
  { day: 'Wednesday', regex: /\bwed(?:nesday)?s?\b/gi },
  { day: 'Thursday', regex: /\bthu(?:r|rs|rsday|ursday)?s?\b/gi },
  { day: 'Friday', regex: /\bfri(?:day)?s?\b/gi },
];

function normalizeText(value) {
  return String(value || '')
    .replace(/[–—]/g, '-')
    .replace(/Â/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeEmploymentType(value) {
  const text = normalizeText(value).toLowerCase();
  if (!text) return null;
  if (text.includes('office')) return 'office';
  if (text.includes('part')) return 'part-time';
  if (text.includes('full')) return 'full-time';
  return null;
}

function minutesFromTime(value) {
  const match = normalizeText(value).match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return (Number(match[1]) * 60) + Number(match[2]);
}

function timeFromMinutes(total) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function emptySelection() {
  return Object.fromEntries(SCHOOL_DAYS.map(day => [day, []]));
}

function abbreviateDays(days = []) {
  const map = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri' };
  return days.map(day => map[day] || day).join(',');
}

function extractDays(text) {
  const clean = normalizeText(text).toLowerCase();
  const negatives = new Set();
  for (const { day, regex } of DAY_REGEXES) {
    const negativePattern = new RegExp(`(?:not present|except|not on campus)[^.]*${regex.source}`, 'i');
    if (negativePattern.test(clean)) negatives.add(day);
  }

  const positives = new Set();
  for (const { day, regex } of DAY_REGEXES) {
    const matches = clean.match(regex) || [];
    if (matches.length) positives.add(day);
  }

  let days = [];
  if (positives.size) {
    days = [...positives];
  } else if (/(all week|present all week|full-time|full time|full days? only|present all day)/i.test(clean)) {
    days = [...SCHOOL_DAYS];
  }

  if (negatives.size) {
    days = days.filter(day => !negatives.has(day));
  }

  return days.length ? days : null;
}

function extractExplicitPeriods(text) {
  const matches = [...normalizeText(text).matchAll(/period\s*([1-7])/gi)];
  return [...new Set(matches.map(match => match[1]))];
}

function extractTimeRanges(text) {
  const matches = [...normalizeText(text).matchAll(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/g)];
  return matches
    .map(match => ({ start: match[1], end: match[2] }))
    .filter(range => minutesFromTime(range.start) !== null && minutesFromTime(range.end) !== null);
}

function periodsForRange(startText, endText) {
  const start = minutesFromTime(startText);
  const end = minutesFromTime(endText);
  if (start === null || end === null || end <= start) return [];

  return PERIODS.filter(period => {
    const window = PERIOD_WINDOWS[period];
    const overlap = Math.min(end, window.end) - Math.max(start, window.start);
    return overlap > 0;
  });
}

function buildSelection(days, periods) {
  const selection = emptySelection();
  for (const day of days) {
    selection[day] = [...new Set(periods)].sort((left, right) => Number(left) - Number(right));
  }
  return selection;
}

function deriveAllDaySelection(days) {
  return buildSelection(days, PERIODS);
}

function daysFromSelection(selection = {}) {
  return SCHOOL_DAYS.filter(day => (selection?.[day] || []).length > 0);
}

function deriveCampusSelection(text, employmentType = null) {
  const clean = normalizeText(text);
  if (!clean) return { selection: null, days: null, arrival: null, departure: null, note: clean, deterministic: false };
  if (/(verify days|verify schedule|presence days unconfirmed|comes specific days|unconfirmed)/i.test(clean)) {
    return { selection: null, days: extractDays(clean), arrival: null, departure: null, note: clean, deterministic: false };
  }

  const explicitPeriods = extractExplicitPeriods(clean);
  const explicitRanges = extractTimeRanges(clean);
  const days = extractDays(clean) || (normalizeEmploymentType(employmentType) === 'full-time' ? [...SCHOOL_DAYS] : null);

  if (!days || !days.length) {
    return { selection: null, days: null, arrival: null, departure: null, note: clean, deterministic: false };
  }

  let periods = [];
  if (explicitPeriods.length) {
    periods = explicitPeriods;
  } else if (/(full day|all day|present all day|full days? only|full-time|full time|present all week|all week)/i.test(clean)) {
    periods = [...PERIODS];
  } else if (days.length && (/(only|on campus|comes on|present)/i.test(clean) || normalizeEmploymentType(employmentType) === 'full-time')) {
    periods = [...PERIODS];
  } else if (explicitRanges.length) {
    periods = [...new Set(explicitRanges.flatMap(range => periodsForRange(range.start, range.end)))];
  }

  if (!periods.length) {
    return { selection: null, days, arrival: null, departure: null, note: clean, deterministic: false };
  }

  let arrival = null;
  let departure = null;
  if (explicitRanges.length) {
    const starts = explicitRanges.map(range => minutesFromTime(range.start)).filter(value => value !== null);
    const ends = explicitRanges.map(range => minutesFromTime(range.end)).filter(value => value !== null);
    if (starts.length) arrival = timeFromMinutes(Math.min(...starts));
    if (ends.length) departure = timeFromMinutes(Math.max(...ends));
  }

  const minPeriod = periods.slice().sort((left, right) => Number(left) - Number(right))[0];
  const maxPeriod = periods.slice().sort((left, right) => Number(right) - Number(left))[0];
  const minPeriodStart = PERIOD_WINDOWS[minPeriod].start;
  const maxPeriodEnd = PERIOD_WINDOWS[maxPeriod].end;
  const arrivalMinutes = arrival ? Math.min(minutesFromTime(arrival), minPeriodStart) : minPeriodStart;
  const departureMinutes = departure ? Math.max(minutesFromTime(departure), maxPeriodEnd) : maxPeriodEnd;
  arrival = timeFromMinutes(arrivalMinutes);
  departure = timeFromMinutes(departureMinutes);

  return {
    selection: buildSelection(days, periods),
    days,
    arrival,
    departure,
    note: clean,
    deterministic: true,
  };
}

function deriveCampusFallback(contactRow = {}, scheduleNote = '') {
  const employmentType = normalizeEmploymentType(contactRow.employment_type);
  const text = normalizeText(
    contactRow.presence_notes
      || scheduleNote
      || `${contactRow.classes_or_subjects || ''} ${contactRow.handles || ''}`
  );

  const homeroomLike = /\b(homeroom|assistant|administrative role|full time, office|full-time office|bookstore|secretary|accountant)\b/i.test(text);
  const fullTime = employmentType === 'full-time' || /full-time|full time|present all day|present all week/i.test(text);

  if (!homeroomLike || !fullTime) return null;

  return {
    selection: deriveAllDaySelection([...SCHOOL_DAYS]),
    days: [...SCHOOL_DAYS],
    arrival: '08:00',
    departure: '14:00',
    note: text || 'Full-time campus mapping inferred from source profile.',
    deterministic: true,
  };
}

function readContactsWorkbook() {
  const workbook = XLSX.readFile(CONTACTS_FILE, { cellText: true });
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: '' });
  return rows.slice(1).map(row => ({
    source_name: normalizeText(row[0]),
    role_label: normalizeText(row[1]),
    phone: normalizeText(row[2]),
    department: normalizeText(row[3]),
    classes_or_subjects: normalizeText(row[4]),
    whatsapp_lid: normalizeText(row[5]),
    handles: normalizeText(row[6]),
    employment_type: normalizeText(row[7]),
    presence_notes: normalizeText(row[8]),
  })).filter(row => row.source_name);
}

function readStaffScheduleWorkbook() {
  const workbook = XLSX.readFile(STAFF_SCHEDULES_FILE, { cellText: true });
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: '' });
  const grouped = new Map();

  for (const rawRow of rows.slice(1)) {
    const row = rawRow.map(cell => normalizeText(cell));
    const [sourceName, day, time, periodLabel, subject, tail] = row;
    if (!sourceName) continue;

    if (!grouped.has(sourceName)) {
      grouped.set(sourceName, {
        source_name: sourceName,
        schedule_rows: [],
        note_texts: [],
      });
    }

    const bucket = grouped.get(sourceName);
    if (/see presence notes/i.test(subject)) {
      if (tail) bucket.note_texts.push(tail);
      continue;
    }

    const normalizedDay = SCHOOL_DAYS.find(value => value.toLowerCase() === day.toLowerCase()) || null;
    const periodMatch = periodLabel.match(/period\s*([1-7])/i);
    const period = periodMatch ? periodMatch[1] : null;
    if (!normalizedDay || !period || /recess/i.test(periodLabel) || /recess/i.test(subject)) continue;

    bucket.schedule_rows.push({
      day: normalizedDay,
      period,
      class_name: subject || tail || 'Scheduled Class',
    });
  }

  return grouped;
}

function buildLivePeopleMap() {
  const rows = db.prepare(`
    SELECT
      p.id,
      p.full_name,
      p.phone,
      p.status,
      COALESCE(r.role_type, '') AS role_type,
      COALESCE(r.substitution_eligible, 0) AS substitution_eligible,
      COALESCE(pr.employment_type, 'full-time') AS employment_type,
      COALESCE(pr.days, 'Mon,Tue,Wed,Thu,Fri') AS days,
      COALESCE(pr.arrival_time, '08:00') AS arrival_time,
      COALESCE(pr.departure_time, '14:00') AS departure_time,
      COALESCE(pr.notes, '') AS presence_notes,
      (
        SELECT COUNT(*)
        FROM schedules s
        WHERE s.person_id = p.id
          AND s.academic_year = ?
      ) AS schedule_rows,
      (
        SELECT COUNT(*)
        FROM campus_periods cp
        WHERE cp.person_id = p.id
          AND cp.academic_year = ?
      ) AS campus_rows
    FROM people p
    LEFT JOIN roles r ON r.person_id = p.id
    LEFT JOIN presence pr ON pr.person_id = p.id
    WHERE p.status = 'active'
  `).all(ACADEMIC_YEAR, ACADEMIC_YEAR);

  return new Map(rows.map(row => [row.full_name, row]));
}

function resolveLiveName(sourceName, livePeople) {
  const exact = normalizeText(sourceName);
  if (livePeople.has(exact)) return exact;
  const alias = SAFE_ALIASES[exact];
  if (alias && livePeople.has(alias)) return alias;
  return null;
}

function replaceCampusPeriods(personId, selection) {
  const remove = db.prepare('DELETE FROM campus_periods WHERE person_id = ? AND academic_year = ?');
  const insert = db.prepare(`
    INSERT INTO campus_periods (person_id, academic_year, day, period, on_campus)
    VALUES (?, ?, ?, ?, ?)
  `);

  remove.run(personId, ACADEMIC_YEAR);
  for (const day of SCHOOL_DAYS) {
    const onCampus = new Set(selection?.[day] || []);
    for (const period of PERIODS) {
      insert.run(personId, ACADEMIC_YEAR, day, period, onCampus.has(period) ? 1 : 0);
    }
  }
}

function mergeSelectionWithSchedule(personId, selection) {
  const merged = emptySelection();
  for (const day of SCHOOL_DAYS) {
    merged[day] = [...new Set(selection?.[day] || [])];
  }

  const rows = db.prepare(`
    SELECT day, period
    FROM schedules
    WHERE person_id = ?
      AND academic_year = ?
  `).all(personId, ACADEMIC_YEAR);

  for (const row of rows) {
    if (!SCHOOL_DAYS.includes(row.day) || !PERIODS.includes(String(row.period))) continue;
    merged[row.day] = [...new Set([...(merged[row.day] || []), String(row.period)])].sort((left, right) => Number(left) - Number(right));
  }

  return merged;
}

function ensurePresenceRow(personId) {
  db.prepare(`
    INSERT OR IGNORE INTO presence (person_id, employment_type, days, arrival_time, departure_time, notes)
    VALUES (?, 'full-time', 'Mon,Tue,Wed,Thu,Fri', '08:00', '14:00', NULL)
  `).run(personId);
}

function updatePresenceRow(personId, payload = {}) {
  ensurePresenceRow(personId);
  db.prepare(`
    UPDATE presence
    SET employment_type = ?,
        days = ?,
        arrival_time = ?,
        departure_time = ?,
        notes = ?
    WHERE person_id = ?
  `).run(
    payload.employment_type,
    payload.days,
    payload.arrival_time,
    payload.departure_time,
    payload.notes,
    personId
  );
}

function insertScheduleRows(personId, entries = []) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO schedules (person_id, academic_year, day, period, class_name)
    VALUES (?, ?, ?, ?, ?)
  `);
  for (const entry of entries) {
    insert.run(personId, ACADEMIC_YEAR, entry.day, entry.period, entry.class_name);
  }
}

function refreshLivePerson(livePeople, fullName) {
  const row = db.prepare(`
    SELECT
      p.id,
      p.full_name,
      p.phone,
      p.status,
      COALESCE(r.role_type, '') AS role_type,
      COALESCE(r.substitution_eligible, 0) AS substitution_eligible,
      COALESCE(pr.employment_type, 'full-time') AS employment_type,
      COALESCE(pr.days, 'Mon,Tue,Wed,Thu,Fri') AS days,
      COALESCE(pr.arrival_time, '08:00') AS arrival_time,
      COALESCE(pr.departure_time, '14:00') AS departure_time,
      COALESCE(pr.notes, '') AS presence_notes,
      (
        SELECT COUNT(*)
        FROM schedules s
        WHERE s.person_id = p.id
          AND s.academic_year = ?
      ) AS schedule_rows,
      (
        SELECT COUNT(*)
        FROM campus_periods cp
        WHERE cp.person_id = p.id
          AND cp.academic_year = ?
      ) AS campus_rows
    FROM people p
    LEFT JOIN roles r ON r.person_id = p.id
    LEFT JOIN presence pr ON pr.person_id = p.id
    WHERE p.full_name = ?
  `).get(ACADEMIC_YEAR, ACADEMIC_YEAR, fullName);

  if (row) livePeople.set(fullName, row);
}

function sync() {
  const contacts = readContactsWorkbook();
  const scheduleGroups = readStaffScheduleWorkbook();
  const livePeople = buildLivePeopleMap();
  const contactMap = new Map();
  const actions = [];

  for (const contact of contacts) {
    const liveName = resolveLiveName(contact.source_name, livePeople);
    if (!liveName) continue;
    contactMap.set(liveName, contact);
  }

  const applySync = db.transaction(() => {
    for (const [sourceName, group] of scheduleGroups.entries()) {
      const liveName = resolveLiveName(sourceName, livePeople);
      if (!liveName) continue;

      const live = livePeople.get(liveName);
      if (!live) continue;

      if (group.schedule_rows.length && live.schedule_rows === 0) {
        insertScheduleRows(live.id, group.schedule_rows);
        actions.push(`${liveName}: imported ${group.schedule_rows.length} timed schedule rows from staff_schedules.xlsx`);
        refreshLivePerson(livePeople, liveName);
      }
    }

    for (const [liveName, live] of livePeople.entries()) {
      const contact = contactMap.get(liveName) || {};
      const scheduleGroup = [...scheduleGroups.values()].find(group => resolveLiveName(group.source_name, livePeople) === liveName) || null;
      const scheduleNote = scheduleGroup?.note_texts?.[0] || '';
      const primaryPresenceText = contact.presence_notes || scheduleNote;
      const parsed = deriveCampusSelection(primaryPresenceText, contact.employment_type || live.employment_type);
      const fallback = !parsed.selection ? deriveCampusFallback(contact, scheduleNote) : null;
      const rawSelection = parsed.selection || fallback?.selection || null;
      const finalSelection = rawSelection ? mergeSelectionWithSchedule(live.id, rawSelection) : null;
      const finalDays = finalSelection ? daysFromSelection(finalSelection) : ((parsed.days && parsed.days.length ? parsed.days : fallback?.days) || null);
      const finalArrival = parsed.arrival || fallback?.arrival || live.arrival_time || '08:00';
      const finalDeparture = parsed.departure || fallback?.departure || live.departure_time || '14:00';
      const finalNote = normalizeText(primaryPresenceText || fallback?.note || live.presence_notes);
      const finalEmployment = normalizeEmploymentType(contact.employment_type) || live.employment_type || 'full-time';

      const shouldWritePresence = !!contact.source_name || !!scheduleNote;
      if (!shouldWritePresence) continue;

      const nextDays = finalDays && finalDays.length ? abbreviateDays(finalDays) : live.days || 'Mon,Tue,Wed,Thu,Fri';
      const noteChanged = finalNote && finalNote !== live.presence_notes;
      const presenceChanged = finalEmployment !== live.employment_type
        || nextDays !== live.days
        || finalArrival !== live.arrival_time
        || finalDeparture !== live.departure_time
        || noteChanged;

      if (presenceChanged) {
        updatePresenceRow(live.id, {
          employment_type: finalEmployment,
          days: nextDays,
          arrival_time: finalArrival,
          departure_time: finalDeparture,
          notes: finalNote || null,
        });
        actions.push(`${liveName}: synced presence defaults (${nextDays} ${finalArrival}-${finalDeparture})`);
      }

      if (finalSelection && live.campus_rows === 0) {
        replaceCampusPeriods(live.id, finalSelection);
        actions.push(`${liveName}: wrote explicit campus-period map`);
      }

      refreshLivePerson(livePeople, liveName);
    }
  });

  applySync();
  return actions;
}

const actions = sync();
console.log('Operational source sync complete.');
console.log(`Actions applied: ${actions.length}`);
for (const action of actions) console.log(`- ${action}`);
