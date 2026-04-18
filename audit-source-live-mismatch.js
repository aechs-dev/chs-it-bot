'use strict';

const path = require('path');
const Database = require('better-sqlite3');
const XLSX = require('xlsx');

const ROOT = __dirname;
const db = new Database(path.join(ROOT, 'data', 'chs.db'));

const STAFF_SCHEDULES_FILE = path.join(ROOT, 'knowledge', 'staff_schedules.xlsx');
const CONTACTS_FILE = path.join(ROOT, 'knowledge', 'contacts.xlsx');
const ACADEMIC_YEAR = '2025-2026';

function readWorkbookRows(filePath) {
  const wb = XLSX.readFile(filePath, { cellText: true });
  const rowsBySheet = new Map();
  for (const sheetName of wb.SheetNames) {
    rowsBySheet.set(
      sheetName,
      XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' })
    );
  }
  return rowsBySheet;
}

function normalizeName(value) {
  return String(value || '')
    .replace(/â€”/g, '-')
    .replace(/â€“/g, '-')
    .replace(/Â©/g, '©')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstToken(name) {
  return normalizeName(name)
    .replace(/^(Mr\.?|Mrs\.?|Ms\.?|Miss|Dr\.?)\s+/i, '')
    .split(/\s+/)[0]
    .toLowerCase();
}

function aggregateSourceRows() {
  const rowsBySheet = readWorkbookRows(STAFF_SCHEDULES_FILE);
  const rows = rowsBySheet.get('schedules') || [];
  const source = new Map();

  for (const row of rows.slice(1)) {
    const [rawName, rawDay, rawTime, rawPeriod, rawSubject, rawTail] = row.map(cell => normalizeName(cell));
    if (!rawName) continue;

    if (!source.has(rawName)) {
      source.set(rawName, {
        name: rawName,
        total_rows: 0,
        teaching_rows: 0,
        recess_rows: 0,
        note_rows: 0,
        note_texts: new Set(),
        sample_entries: [],
      });
    }

    const item = source.get(rawName);
    item.total_rows += 1;

    if (/see presence notes/i.test(rawSubject)) {
      item.note_rows += 1;
      if (rawTail) item.note_texts.add(rawTail);
    }

    if (/recess/i.test(rawPeriod)) {
      item.recess_rows += 1;
      continue;
    }

    if (rawDay && !/^all week$/i.test(rawDay) && rawPeriod && rawPeriod !== '—') {
      item.teaching_rows += 1;
      if (item.sample_entries.length < 6) {
        item.sample_entries.push(`${rawDay} | ${rawPeriod} | ${rawSubject || rawTail || '-'}`);
      }
    }
  }

  return source;
}

function buildLivePeopleMap() {
  const rows = db.prepare(`
    SELECT
      p.id,
      p.full_name,
      p.status,
      p.american_program,
      COALESCE(r.role_type, '') AS role_type,
      COALESCE(r.clearance, '') AS clearance,
      COALESCE(r.substitution_eligible, 0) AS substitution_eligible,
      COALESCE(pr.employment_type, '') AS employment_type,
      COALESCE(pr.days, '') AS presence_days,
      COALESCE(pr.arrival_time, '') AS arrival_time,
      COALESCE(pr.departure_time, '') AS departure_time,
      (
        SELECT COUNT(*)
        FROM schedules s
        WHERE s.person_id = p.id
          AND s.academic_year = ?
      ) AS live_schedule_rows,
      (
        SELECT COUNT(*)
        FROM campus_periods cp
        WHERE cp.person_id = p.id
          AND cp.academic_year = ?
      ) AS live_campus_rows
    FROM people p
    LEFT JOIN roles r ON r.person_id = p.id
    LEFT JOIN presence pr ON pr.person_id = p.id
    WHERE p.status = 'active'
    ORDER BY p.full_name
  `).all(ACADEMIC_YEAR, ACADEMIC_YEAR);

  return new Map(rows.map(row => [row.full_name, row]));
}

function readContactRows() {
  const rowsBySheet = readWorkbookRows(CONTACTS_FILE);
  const rows = rowsBySheet.get('contacts') || [];
  return rows
    .slice(1)
    .map(row => row.map(cell => normalizeName(cell)))
    .filter(row => row.some(Boolean));
}

function findContactEvidence(contactRows, sourceName, candidates) {
  const sourceNeedle = normalizeName(sourceName).toLowerCase();
  const candidateNeedles = candidates.map(name => normalizeName(name).toLowerCase());
  const hits = [];

  for (const row of contactRows) {
    const rowText = row.join(' | ');
    const lower = rowText.toLowerCase();
    const sourceHit = sourceNeedle && lower.includes(sourceNeedle);
    const candidateHit = candidateNeedles.some(token => token && lower.includes(token));
    const aliasHit = /also listed as/i.test(lower);
    if (sourceHit || (candidateHit && aliasHit)) {
      hits.push(rowText);
    }
  }

  return hits;
}

function renderList(items, mapFn) {
  if (!items.length) return '- None';
  return items.map(mapFn).join('\n');
}

function buildReport() {
  const source = aggregateSourceRows();
  const liveByName = buildLivePeopleMap();
  const contactRows = readContactRows();
  const liveNames = [...liveByName.keys()];

  const exactTeachingMissing = [];
  const exactPresenceOnly = [];
  const sourceOnlyNames = [];
  const flaggedProfiles = [];

  for (const item of source.values()) {
    const live = liveByName.get(item.name);
    if (live) {
      if (item.teaching_rows > 0 && live.live_schedule_rows === 0) {
        exactTeachingMissing.push({ ...item, live });
      } else if (item.note_rows > 0 && item.teaching_rows === 0 && live.live_schedule_rows === 0 && live.live_campus_rows === 0) {
        exactPresenceOnly.push({ ...item, live });
      }
      continue;
    }

    if (item.total_rows <= 1) continue;

    const candidates = liveNames.filter(name => firstToken(name) === firstToken(item.name));
    sourceOnlyNames.push({
      ...item,
      candidates,
      contactEvidence: findContactEvidence(contactRows, item.name, candidates),
    });
  }

  const reviewRows = db.prepare(`
    SELECT
      p.full_name,
      COALESCE(r.role_type, '') AS role_type,
      COALESCE(pr.days, '') AS presence_days,
      COALESCE(pr.arrival_time, '') AS arrival_time,
      COALESCE(pr.departure_time, '') AS departure_time
    FROM people p
    LEFT JOIN roles r ON r.person_id = p.id
    LEFT JOIN presence pr ON pr.person_id = p.id
    WHERE p.status = 'active'
      AND (r.role_type = 'teacher' OR r.role_type = 'coordinator' OR r.role_type LIKE 'hod_%')
      AND (
        SELECT COUNT(*)
        FROM schedules s
        WHERE s.person_id = p.id
          AND s.academic_year = ?
      ) = 0
      AND (
        SELECT COUNT(*)
        FROM campus_periods cp
        WHERE cp.person_id = p.id
          AND cp.academic_year = ?
      ) = 0
    ORDER BY p.full_name
  `).all(ACADEMIC_YEAR, ACADEMIC_YEAR);

  for (const review of reviewRows) {
    const sourceMatch = source.get(review.full_name);
    const aliasCandidates = sourceOnlyNames.filter(item =>
      item.candidates.includes(review.full_name) ||
      firstToken(item.name) === firstToken(review.full_name)
    );

    flaggedProfiles.push({
      ...review,
      sourceMatch,
      aliasCandidates,
    });
  }

  exactTeachingMissing.sort((a, b) => a.name.localeCompare(b.name));
  exactPresenceOnly.sort((a, b) => a.name.localeCompare(b.name));
  sourceOnlyNames.sort((a, b) => a.name.localeCompare(b.name));
  flaggedProfiles.sort((a, b) => a.full_name.localeCompare(b.full_name));

  const lines = [];
  lines.push('# AECHS Source vs Live Schedule Audit');
  lines.push('');
  lines.push(`- Audit date: ${new Date().toISOString()}`);
  lines.push(`- Academic year: ${ACADEMIC_YEAR}`);
  lines.push(`- Source workbook: ${path.relative(ROOT, STAFF_SCHEDULES_FILE)}`);
  lines.push(`- Exact source names tracked: ${source.size}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Exact-match teachers/staff with timed source rows missing in live DB: ${exactTeachingMissing.length}`);
  lines.push(`- Exact-match source presence-note profiles missing operational mapping: ${exactPresenceOnly.length}`);
  lines.push(`- Source names not found in live people table: ${sourceOnlyNames.length}`);
  lines.push(`- Current live review-queue profiles checked against source: ${flaggedProfiles.length}`);
  lines.push('');
  lines.push('## Exact Teaching Rows Missing In Live DB');
  lines.push('');
  lines.push(renderList(exactTeachingMissing, item => {
    const samples = item.sample_entries.length ? ` | samples=${item.sample_entries.join(' ; ')}` : '';
    return `- ${item.name} | role=${item.live.role_type || '-'} | source_teaching_rows=${item.teaching_rows} | live_schedule_rows=${item.live.live_schedule_rows}${samples}`;
  }));
  lines.push('');
  lines.push('## Presence-Only Source Profiles Missing Operational Mapping');
  lines.push('');
  lines.push(renderList(exactPresenceOnly, item => {
    const notes = [...item.note_texts].join(' ; ') || '-';
    return `- ${item.name} | role=${item.live.role_type || '-'} | live_schedule_rows=${item.live.live_schedule_rows} | live_presence=${item.live.presence_days || '-'} ${item.live.arrival_time || '-'}-${item.live.departure_time || '-'} | source_note=${notes}`;
  }));
  lines.push('');
  lines.push('## Source Names Missing From Live People Table');
  lines.push('');
  lines.push(renderList(sourceOnlyNames, item => {
    const candidateText = item.candidates.length ? item.candidates.join('; ') : 'none';
    const evidence = item.contactEvidence.length ? ` | contacts=${item.contactEvidence.join(' || ')}` : '';
    return `- ${item.name} | teaching_rows=${item.teaching_rows} | candidates=${candidateText}${evidence}`;
  }));
  lines.push('');
  lines.push('## Review Queue Classification');
  lines.push('');
  lines.push(renderList(flaggedProfiles, item => {
    if (item.sourceMatch) {
      if (item.sourceMatch.teaching_rows > 0) {
        return `- ${item.full_name} | source-backed import gap | teaching_rows=${item.sourceMatch.teaching_rows} | presence=${item.presence_days || '-'} ${item.arrival_time || '-'}-${item.departure_time || '-'}`;
      }
      return `- ${item.full_name} | source-backed presence/admin note | note=${[...item.sourceMatch.note_texts].join(' ; ') || '-'} | live_presence=${item.presence_days || '-'} ${item.arrival_time || '-'}-${item.departure_time || '-'}`;
    }

    if (item.aliasCandidates.length) {
      const aliasText = item.aliasCandidates.map(candidate => candidate.name).join('; ');
      return `- ${item.full_name} | likely alias/name mismatch | source_candidates=${aliasText} | live_presence=${item.presence_days || '-'} ${item.arrival_time || '-'}-${item.departure_time || '-'}`;
    }

    return `- ${item.full_name} | no matching source evidence found yet | live_presence=${item.presence_days || '-'} ${item.arrival_time || '-'}-${item.departure_time || '-'}`;
  }));
  lines.push('');
  lines.push('## Recommendations');
  lines.push('');
  lines.push('- Import timed rows from `staff_schedules.xlsx` for exact-match gaps before editing people manually.');
  lines.push('- Add an alias map for names that changed between source files and live people records, especially `Ms. Nayiri Kazdjian` -> `Ms. Nayiri Israbian` if confirmed.');
  lines.push('- Convert source presence notes into explicit campus-period mappings for office/admin/coordinator profiles that do not teach periods.');
  lines.push('- Do not infer classroom availability for profiles with only note-based presence. They need explicit operational treatment.');

  return lines.join('\n');
}

console.log(buildReport());
