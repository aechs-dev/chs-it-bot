'use strict';

const db = require('./core/database');

const ACADEMIC_YEAR = '2025-2026';
const PERIOD_WINDOWS = {
  '1': { start: 480, end: 525, label: '08:00-08:45' },
  '2': { start: 525, end: 570, label: '08:45-09:30' },
  '3': { start: 570, end: 615, label: '09:30-10:15' },
  '4': { start: 640, end: 685, label: '10:40-11:25' },
  '5': { start: 685, end: 730, label: '11:25-12:10' },
  '6': { start: 750, end: 795, label: '12:30-13:15' },
  '7': { start: 795, end: 840, label: '13:15-14:00' },
};

const DAY_MAP = {
  mon: 'Monday',
  monday: 'Monday',
  tue: 'Tuesday',
  tues: 'Tuesday',
  tuesday: 'Tuesday',
  wed: 'Wednesday',
  wednesday: 'Wednesday',
  thu: 'Thursday',
  thur: 'Thursday',
  thurs: 'Thursday',
  thursday: 'Thursday',
  fri: 'Friday',
  friday: 'Friday',
};

function minutesFromTime(value) {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return (Number(match[1]) * 60) + Number(match[2]);
}

function parsePresenceDays(rawDays) {
  return new Set(
    String(rawDays || '')
      .split(/[ ,|/]+/)
      .map(item => item.trim().toLowerCase())
      .filter(Boolean)
      .map(item => DAY_MAP[item] || item)
  );
}

function academicRows() {
  const rows = db.prepare(`
    SELECT
      p.id,
      p.full_name,
      p.american_program,
      r.role_type,
      pr.employment_type,
      pr.days AS presence_days,
      pr.arrival_time,
      pr.departure_time,
      (SELECT COUNT(*) FROM schedules s WHERE s.person_id = p.id AND s.academic_year = ?) AS schedule_rows,
      (SELECT COUNT(*) FROM campus_periods cp WHERE cp.person_id = p.id AND cp.academic_year = ?) AS campus_rows,
      (SELECT COUNT(*) FROM access a WHERE a.person_id = p.id AND a.web_code IS NOT NULL AND a.web_code != '') AS web_codes
    FROM people p
    LEFT JOIN roles r ON r.person_id = p.id
    LEFT JOIN presence pr ON pr.person_id = p.id
    WHERE p.status = 'active'
      AND (r.role_type = 'teacher' OR r.role_type = 'coordinator' OR r.role_type LIKE 'hod_%')
    ORDER BY p.full_name
  `).all(ACADEMIC_YEAR, ACADEMIC_YEAR);

  return rows;
}

function campusRows() {
  const rows = db.prepare(`
    SELECT person_id, day, period, on_campus
    FROM campus_periods
    WHERE academic_year = ?
  `).all(ACADEMIC_YEAR);

  const byPerson = new Map();
  for (const row of rows) {
    if (!byPerson.has(row.person_id)) byPerson.set(row.person_id, new Map());
    byPerson.get(row.person_id).set(`${row.day}|${row.period}`, !!row.on_campus);
  }
  return byPerson;
}

function duplicateSlots() {
  return db.prepare(`
    SELECT
      p.full_name,
      s.day,
      s.period,
      COUNT(*) AS count,
      GROUP_CONCAT(s.class_name, ' | ') AS labels
    FROM schedules s
    JOIN people p ON p.id = s.person_id
    WHERE s.academic_year = ?
    GROUP BY s.person_id, s.day, s.period
    HAVING COUNT(*) > 1
    ORDER BY p.full_name, s.day, CAST(s.period AS INTEGER)
  `).all(ACADEMIC_YEAR);
}

function schedulePresenceConflicts() {
  const campusByPerson = campusRows();
  const rows = db.prepare(`
    SELECT
      p.id AS person_id,
      p.full_name,
      r.role_type,
      pr.days AS presence_days,
      pr.arrival_time,
      pr.departure_time,
      s.day,
      s.period,
      s.class_name
    FROM schedules s
    JOIN people p ON p.id = s.person_id
    LEFT JOIN roles r ON r.person_id = p.id
    LEFT JOIN presence pr ON pr.person_id = p.id
    WHERE s.academic_year = ?
      AND (r.role_type = 'teacher' OR r.role_type = 'coordinator' OR r.role_type LIKE 'hod_%')
    ORDER BY p.full_name, s.day, CAST(s.period AS INTEGER)
  `).all(ACADEMIC_YEAR);

  return rows
    .map(row => {
      const issues = [];
      const campusMap = campusByPerson.get(row.person_id);
      if (campusMap) {
        if (!campusMap.get(`${row.day}|${row.period}`)) issues.push('scheduled outside explicit campus map');
        return issues.length ? { ...row, issues } : null;
      }

      const days = parsePresenceDays(row.presence_days);
      const window = PERIOD_WINDOWS[String(row.period)];
      const arrival = minutesFromTime(row.arrival_time);
      const departure = minutesFromTime(row.departure_time);

      if (days.size && !days.has(row.day)) issues.push('scheduled outside presence days');
      if (window && arrival !== null && departure !== null) {
        if (window.start < arrival) issues.push('period starts before arrival');
        if (window.end > departure) issues.push('period ends after departure');
      }

      return issues.length ? { ...row, issues } : null;
    })
    .filter(Boolean);
}

function scheduleDayMismatches() {
  const campusByPerson = campusRows();
  const rows = db.prepare(`
    SELECT
      p.id AS person_id,
      p.full_name,
      r.role_type,
      pr.days AS presence_days,
      (SELECT GROUP_CONCAT(DISTINCT s.day) FROM schedules s WHERE s.person_id = p.id AND s.academic_year = ?) AS schedule_days
    FROM people p
    LEFT JOIN roles r ON r.person_id = p.id
    LEFT JOIN presence pr ON pr.person_id = p.id
    WHERE p.status = 'active'
      AND (r.role_type = 'teacher' OR r.role_type = 'coordinator' OR r.role_type LIKE 'hod_%')
  `).all(ACADEMIC_YEAR);

  return rows
    .map(row => {
      const campusMap = campusByPerson.get(row.person_id);
      const presenceDays = campusMap
        ? new Set(
            [...campusMap.entries()]
              .filter(([, onCampus]) => onCampus)
              .map(([key]) => key.split('|')[0])
          )
        : parsePresenceDays(row.presence_days);
      const scheduleDays = parsePresenceDays(row.schedule_days);
      const outside = [...scheduleDays].filter(day => !presenceDays.has(day));
      return outside.length ? { ...row, outside_schedule_days: outside } : null;
    })
    .filter(Boolean);
}

function malformedLabels() {
  return db.prepare(`
    SELECT DISTINCT class_name
    FROM schedules
    WHERE class_name LIKE '%' || char(10) || '%'
       OR class_name LIKE '%' || char(13) || '%'
       OR class_name LIKE '%©%'
    ORDER BY class_name
  `).all();
}

function customCampusProfiles() {
  return db.prepare(`
    SELECT
      p.full_name,
      r.role_type,
      (SELECT COUNT(*) FROM campus_periods cp WHERE cp.person_id = p.id AND cp.academic_year = ?) AS campus_rows,
      (SELECT COUNT(*) FROM campus_periods cp WHERE cp.person_id = p.id AND cp.academic_year = ? AND cp.on_campus = 1) AS campus_on_rows,
      (SELECT GROUP_CONCAT(DISTINCT cp.day) FROM campus_periods cp WHERE cp.person_id = p.id AND cp.academic_year = ? AND cp.on_campus = 1) AS campus_days
    FROM people p
    LEFT JOIN roles r ON r.person_id = p.id
    WHERE p.status = 'active'
    ORDER BY p.full_name
  `).all(ACADEMIC_YEAR, ACADEMIC_YEAR, ACADEMIC_YEAR).filter(row => row.campus_rows > 0);
}

function apTrackRows() {
  const rows = db.prepare(`
    SELECT
      p.full_name,
      p.american_program,
      s.class_name
    FROM schedules s
    JOIN people p ON p.id = s.person_id
    LEFT JOIN roles r ON r.person_id = p.id
    WHERE s.academic_year = ?
      AND (r.role_type = 'teacher' OR r.role_type = 'coordinator' OR r.role_type LIKE 'hod_%')
    ORDER BY p.full_name
  `).all(ACADEMIC_YEAR);

  const byPerson = new Map();
  for (const row of rows) {
    if (!byPerson.has(row.full_name)) {
      byPerson.set(row.full_name, {
        full_name: row.full_name,
        american_program: !!row.american_program,
        explicit_ap_rows: new Set(),
        social_study_rows: new Set(),
        plain_grade_rows: new Set(),
      });
    }

    const item = byPerson.get(row.full_name);
    const label = String(row.class_name || '');
    if (/\bap\b|american program/i.test(label)) item.explicit_ap_rows.add(label);
    else if (/social study/i.test(label)) item.social_study_rows.add(label);
    else if (/\bgrade\b|\bgr\b/i.test(label)) item.plain_grade_rows.add(label);
  }

  return [...byPerson.values()]
    .map(item => ({
      full_name: item.full_name,
      american_program: item.american_program,
      explicit_ap_rows: [...item.explicit_ap_rows],
      social_study_rows: [...item.social_study_rows],
      plain_grade_rows: [...item.plain_grade_rows],
    }))
    .filter(item => item.american_program || item.explicit_ap_rows.length || item.social_study_rows.length);
}

function renderList(items, mapFn) {
  if (!items.length) return '- None';
  return items.map(mapFn).join('\n');
}

function buildReport() {
  const academic = academicRows();
  const duplicates = duplicateSlots();
  const timingConflicts = schedulePresenceConflicts();
  const dayConflicts = scheduleDayMismatches();
  const malformed = malformedLabels();
  const customCampus = customCampusProfiles();
  const apTracks = apTrackRows();

  const noScheduleNoCampus = academic.filter(row => row.schedule_rows === 0 && row.campus_rows === 0);
  const noScheduleWithCampus = academic.filter(row => row.schedule_rows === 0 && row.campus_rows > 0);
  const hasScheduleNoCampus = academic.filter(row => row.schedule_rows > 0 && row.campus_rows === 0);
  const hasScheduleWithCampus = academic.filter(row => row.schedule_rows > 0 && row.campus_rows > 0);

  const lines = [];
  lines.push('# AECHS Operational Data Audit');
  lines.push('');
  lines.push(`- Audit date: ${new Date().toISOString()}`);
  lines.push(`- Academic year: ${ACADEMIC_YEAR}`);
  lines.push(`- Active academic profiles: ${academic.length}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- No schedule rows and no campus map: ${noScheduleNoCampus.length}`);
  lines.push(`- No schedule rows but explicit campus map: ${noScheduleWithCampus.length}`);
  lines.push(`- Has schedule rows and inferred campus only: ${hasScheduleNoCampus.length}`);
  lines.push(`- Has schedule rows and explicit campus map: ${hasScheduleWithCampus.length}`);
  lines.push(`- Duplicate schedule slots: ${duplicates.length}`);
  lines.push(`- Schedule vs presence conflicts: ${timingConflicts.length}`);
  lines.push(`- Day-only presence mismatches: ${dayConflicts.length}`);
  lines.push(`- Malformed schedule labels: ${malformed.length}`);
  lines.push('');
  lines.push('## High Risk Profiles');
  lines.push('');
  lines.push(renderList(noScheduleNoCampus, row => `- ${row.full_name} | ${row.role_type} | ${row.employment_type || 'unknown'} | days=${row.presence_days || '-'} | ${row.arrival_time || '-'}-${row.departure_time || '-'}`));
  lines.push('');
  lines.push('## Presence and Schedule Conflicts');
  lines.push('');
  lines.push(renderList(timingConflicts, row => `- ${row.full_name} | ${row.day} P${row.period} | ${row.class_name} | ${row.issues.join(', ')}`));
  lines.push('');
  lines.push('## Schedule Day Mismatches');
  lines.push('');
  lines.push(renderList(dayConflicts, row => `- ${row.full_name} | presence=${row.presence_days || '-'} | schedule outside presence=${row.outside_schedule_days.join(', ')}`));
  lines.push('');
  lines.push('## AP and Mixed-Track Review');
  lines.push('');
  lines.push(renderList(apTracks, row => {
    const notes = [];
    if (row.american_program) notes.push('profile marked AP');
    if (row.explicit_ap_rows.length) notes.push(`explicit AP labels: ${row.explicit_ap_rows.join('; ')}`);
    if (row.social_study_rows.length) notes.push(`social study labels: ${row.social_study_rows.join('; ')}`);
    if (row.plain_grade_rows.length) notes.push(`plain grade labels: ${row.plain_grade_rows.slice(0, 8).join('; ')}`);
    return `- ${row.full_name} | ${notes.join(' | ')}`;
  }));
  lines.push('');
  lines.push('## Custom Campus Maps');
  lines.push('');
  lines.push(renderList(customCampus, row => `- ${row.full_name} | ${row.role_type} | rows=${row.campus_rows} | on-campus rows=${row.campus_on_rows} | days=${row.campus_days}`));
  lines.push('');
  lines.push('## Label Hygiene');
  lines.push('');
  lines.push(renderList(malformed, row => `- ${JSON.stringify(row.class_name)}`));
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- Days with no classes are not automatically errors. They only become high-risk when schedule rows and campus-period rows are both missing.');
  lines.push('- Person-level `american_program` is not sufficient for mixed teachers like Ms. Rima Cholakian. Program track should move to the schedule-row level.');
  lines.push('- The system now marks no-schedule/no-campus academic profiles as `Availability needs review` instead of falsely showing them as free/on campus.');

  return lines.join('\n');
}

console.log(buildReport());
