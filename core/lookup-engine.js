'use strict';

// lookup-engine.js - CHS.ai direct lookup engine
// Reads from the live school tables and returns deterministic replies for
// schedules, substitutes, staff availability, WiFi, and calendar requests.

const db = require('./database');
const {
  getSubstituteSuggestions,
  buildOperationalSchedule,
  listDepartmentsForPerson,
} = require('./ops-engine');

const PERIOD_TIMES = {
  '1': '08:00-08:45',
  '2': '08:45-09:30',
  '3': '09:30-10:15',
  '4': '10:40-11:25',
  '5': '11:25-12:10',
  '6': '12:30-13:15',
  '7': '13:15-14:00',
};

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const CLEARANCE_RANK = ['student', 'teacher', 'coordinator', 'hod', 'office', 'owner'];

function rankOf(clearance) {
  return CLEARANCE_RANK.indexOf(clearance ?? 'teacher');
}

function poolForDepartment(name) {
  if (!name) return null;
  return name === 'Intermediate' || name === 'Secondary' ? 'Upper School' : name;
}

function resolveClearance(clearanceLevel, profile) {
  if (profile?.clearance && rankOf(profile.clearance) >= 0) return profile.clearance;
  return clearanceLevel || 'teacher';
}

function normalizePreferences(preferences = {}) {
  return {
    response_format: ['structured', 'plain'].includes(preferences?.response_format) ? preferences.response_format : 'structured',
    response_length: ['concise', 'balanced', 'detailed'].includes(preferences?.response_length) ? preferences.response_length : 'balanced',
  };
}

function wantsStructured(preferences = {}) {
  return normalizePreferences(preferences).response_format !== 'plain';
}

function choiceLimit(preferences = {}) {
  const prefs = normalizePreferences(preferences);
  if (prefs.response_length === 'concise') return 2;
  if (prefs.response_length === 'detailed') return 5;
  return 3;
}

function dedupe(items = []) {
  return [...new Set(items.filter(Boolean))];
}

function joinNatural(items = []) {
  if (!items.length) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function isMeetingLabel(label = '') {
  return /\b(meeting|coordination|briefing|accreditation|club|training|assembly|workshop)\b/i.test(label);
}

function isAmericanProgramTrack(profileOrPerson, label = '') {
  return !!profileOrPerson?.american_program || /\bap\b|american program/i.test(String(label || ''));
}

function normalizeApPrefix(label = '') {
  return String(label || '').replace(/\bAp\b/g, 'AP').replace(/\bAmerican Program\b/gi, 'AP');
}

function extractGradeBand(label = '') {
  const clean = String(label || '').trim();
  if (!clean) return null;

  const range = clean.match(/\b(?:ap\s*)?(?:grade|gr)\s*(1[0-2]|[1-9])(?:\s*\([^)]+\))?\s*\/\s*(1[0-2]|[1-9])\b/i);
  if (range) {
    return { start: Number(range[1]), end: Number(range[2]) };
  }

  const single = clean.match(/\b(?:ap\s*)?(?:grade|gr)\s*(1[0-2]|[1-9])\b/i);
  if (single) {
    return { start: Number(single[1]), end: Number(single[1]) };
  }

  const trailing = clean.match(/\b(1[0-2]|[1-9])\b(?!.*\b(1[0-2]|[1-9])\b)/);
  if (trailing) {
    return { start: Number(trailing[1]), end: Number(trailing[1]) };
  }

  return null;
}

function displayClassLabel(label = '', profileOrPerson = null) {
  const clean = normalizeApPrefix(label).trim();
  if (!clean) return clean;
  if (!isAmericanProgramTrack(profileOrPerson, clean)) return clean;
  if (/\bap\b/i.test(clean)) return clean;
  if (!/\b(?:grade|gr)\s*(1[0-2]|[1-9])\b/i.test(clean)) return clean;
  return `AP ${clean}`;
}

function teachingGroupLabel(label = '', profileOrPerson = null) {
  const band = extractGradeBand(label);
  if (!band) return null;
  const prefix = isAmericanProgramTrack(profileOrPerson, label) ? 'AP ' : '';
  if (band.start === band.end) return `${prefix}Grade ${band.start}`;
  return `${prefix}Grades ${band.start}-${band.end}`;
}

function periodLabel(period) {
  return `P${period}${PERIOD_TIMES[String(period)] ? ` (${PERIOD_TIMES[String(period)]})` : ''}`;
}

function formatListReply(title, lines, preferences = {}, emptyText = 'No items found.') {
  if (!lines.length) return emptyText;
  if (!wantsStructured(preferences)) return `${title}: ${lines.join('; ')}`;
  return [`**${title}**`, ...lines.map(line => `- ${line}`)].join('\n');
}

function formatScheduleReply(title, rows, freePeriods, preferences = {}, freeLabel = 'Free') {
  const busyLines = rows.map(row => `${periodLabel(row.period)}: ${row.display_name || row.class_name}`);
  if (!wantsStructured(preferences)) {
    let reply = `${title}: ${busyLines.join('; ')}`;
    if (freePeriods.length) reply += `. ${freeLabel}: ${joinNatural(freePeriods)}.`;
    return reply;
  }

  const lines = [...busyLines];
  if (freePeriods.length) lines.push(`${freeLabel}: ${freePeriods.join(', ')}`);
  return [`**${title}**`, ...lines.map(line => `- ${line}`)].join('\n');
}

function getPeople() {
  return db.prepare(`
    SELECT p.id, p.full_name, p.first_name, p.last_name, p.title, p.phone, p.status, p.american_program,
           r.role_type, r.substitution_eligible,
           pr.employment_type, pr.days AS presence_days,
           pr.arrival_time, pr.departure_time, pr.notes AS presence_notes
    FROM people p
    LEFT JOIN roles r ON r.person_id = p.id
    LEFT JOIN presence pr ON pr.person_id = p.id
    WHERE p.status = 'active'
  `).all();
}

function getOperationalView(person) {
  const personId = person?.id || person?.person_id || null;
  if (!personId) return null;
  if (!person.__operational) {
    const departments = listDepartmentsForPerson(personId);
    person.__operational = buildOperationalSchedule({ ...person, id: personId }, { departments });
  }
  return person.__operational;
}

function getPersonDepartments(person) {
  if (Array.isArray(person?.departments) && person.departments.length) return person.departments;
  const personId = person?.id || person?.person_id || null;
  if (!personId) return [];
  if (!person.__departments) {
    person.__departments = listDepartmentsForPerson(personId);
  }
  return person.__departments;
}

function isSamePerson(left, right) {
  const leftId = left?.person_id || left?.id || null;
  const rightId = right?.person_id || right?.id || null;
  if (leftId && rightId) return leftId === rightId;
  const leftName = String(left?.full_name || '').trim().toLowerCase();
  const rightName = String(right?.full_name || '').trim().toLowerCase();
  return !!leftName && leftName === rightName;
}

function formatAccessReply(message, preferences = {}) {
  if (!wantsStructured(preferences)) return message;
  return ['**Access Limited**', `- ${message}`].join('\n');
}

function canViewPersonSchedule(targetPerson, clearanceLevel, requesterProfile) {
  if (!targetPerson) return { allowed: false, reason: null };
  if (isSamePerson(requesterProfile, targetPerson)) return { allowed: true, reason: null };
  if (rankOf(clearanceLevel) >= rankOf('office')) return { allowed: true, reason: null };

  if (clearanceLevel === 'hod') {
    const requesterDepartments = new Set(
      getPersonDepartments(requesterProfile)
        .map(dept => dept?.name)
        .filter(Boolean)
    );
    const targetDepartments = getPersonDepartments(targetPerson)
      .map(dept => dept?.name)
      .filter(Boolean);
    const sharedDepartment = targetDepartments.find(name => requesterDepartments.has(name));

    if (sharedDepartment) {
      return { allowed: true, reason: null };
    }

    return {
      allowed: false,
      reason: 'You can view schedules only for staff in your department.',
    };
  }

  return {
    allowed: false,
    reason: 'You can view your own schedule only. Other staff schedules are limited to HoD and office access.',
  };
}

function formatCampusOnlyDayReply(title, dayRow, preferences = {}) {
  if (!dayRow) return null;
  const onCampus = dayRow.slots.filter(slot => slot.state === 'campus_only');
  if (!onCampus.length) return null;

  const onCampusLabels = onCampus.map(slot => periodLabel(slot.period));
  const offCampus = dayRow.slots.filter(slot => slot.state === 'off_campus').map(slot => `P${slot.period}`);
  const lines = [
    `On campus: ${onCampusLabels.join(', ')}`,
    'Detailed timetable: not mapped yet',
  ];
  if (offCampus.length) lines.push(`Off campus: ${offCampus.join(', ')}`);
  return formatListReply(title, lines, preferences, `${title}: detailed timetable not mapped yet.`);
}

function formatCampusOnlyWeekReply(title, operational, preferences = {}) {
  if (!operational?.matrix?.length) return null;
  const lines = operational.matrix
    .map(dayRow => {
      const onCampus = dayRow.slots.filter(slot => slot.state === 'campus_only').map(slot => `P${slot.period}`);
      if (!onCampus.length) return null;
      return `${dayRow.day}: On campus ${onCampus.join(', ')} | Detailed timetable not mapped`;
    })
    .filter(Boolean);

  if (!lines.length) return null;
  return formatListReply(title, lines, preferences, 'Detailed timetable not mapped yet.');
}

function extractDay(msg) {
  for (const day of DAYS) {
    if (msg.includes(day)) return day.charAt(0).toUpperCase() + day.slice(1);
  }
  const _now = new Date();
  const today = _now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  if (msg.includes('today') && DAYS.includes(today)) {
    return today.charAt(0).toUpperCase() + today.slice(1);
  }
  if (msg.includes('tomorrow')) {
    const tmrw = new Date(_now); tmrw.setDate(_now.getDate() + 1);
    const tmrwDay = tmrw.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    if (DAYS.includes(tmrwDay)) return tmrwDay.charAt(0).toUpperCase() + tmrwDay.slice(1);
  }
  if (msg.includes('yesterday')) {
    const yest = new Date(_now); yest.setDate(_now.getDate() - 1);
    const yestDay = yest.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    if (DAYS.includes(yestDay)) return yestDay.charAt(0).toUpperCase() + yestDay.slice(1);
  }
  return null;
}

function extractPeriod(msg) {
  const match = msg.match(/period\s*(\d)|p(\d)\b|(\d)(st|nd|rd|th)?\s*period/i);
  return match ? match[1] || match[2] || match[3] : null;
}

function extractPerson(msg) {
  const people = getPeople();
  let best = null;
  let bestLen = 0;

  for (const person of people) {
    if (!person.full_name) continue;
    const lastName = (person.last_name || '').toLowerCase();
    const firstName = (person.first_name || '').toLowerCase();
    const fullLower = person.full_name.toLowerCase().replace(/^(mr\.|mrs\.|ms\.|miss|dr\.)\s*/i, '');

    if (fullLower.length > 3 && msg.includes(fullLower) && fullLower.length > bestLen) {
      best = person;
      bestLen = fullLower.length;
      continue;
    }
    if (lastName.length >= 4 && msg.includes(lastName) && lastName.length > bestLen) {
      best = person;
      bestLen = lastName.length;
      continue;
    }
    if (firstName.length >= 4 && msg.includes(firstName) && firstName.length > bestLen) {
      best = person;
      bestLen = firstName.length;
    }
  }

  return best || null;
}

// Returns ALL people matched in a message (for "common free period for X and Y")
function extractPeople(msg) {
  const people = getPeople();
  const matched = [];
  for (const person of people) {
    if (!person.full_name) continue;
    const lastName = (person.last_name || '').toLowerCase();
    const firstName = (person.first_name || '').toLowerCase();
    const fullLower = person.full_name.toLowerCase().replace(/^(mr\.|mrs\.|ms\.|miss|dr\.)\s*/i, '');
    if ((fullLower.length > 3 && msg.includes(fullLower))
      || (lastName.length >= 4 && msg.includes(lastName))
      || (firstName.length >= 4 && msg.includes(firstName))) {
      if (!matched.find(p => p.id === person.id)) matched.push(person);
    }
  }
  return matched;
}

function getPronoun(person) {
  if (!person) return 'they';
  const title = (person.title || '').toLowerCase();
  if (['mrs.', 'ms.', 'miss'].includes(title)) return 'she';
  if (title === 'mr.') return 'he';
  if (/^mr\./i.test(person.full_name)) return 'he';
  if (/^(mrs\.|ms\.|miss)/i.test(person.full_name)) return 'she';
  return 'they';
}

function getScheduleForDay(personId, day) {
  return db.prepare(`
    SELECT day, period, class_name
    FROM schedules
    WHERE person_id = ? AND day = ? AND academic_year = '2025-2026'
    ORDER BY CAST(period AS INTEGER) ASC
  `).all(personId, day);
}

function getFullSchedule(personId) {
  return db.prepare(`
    SELECT day, period, class_name
    FROM schedules
    WHERE person_id = ? AND academic_year = '2025-2026'
    ORDER BY
      CASE day
        WHEN 'Monday' THEN 1
        WHEN 'Tuesday' THEN 2
        WHEN 'Wednesday' THEN 3
        WHEN 'Thursday' THEN 4
        WHEN 'Friday' THEN 5
      END,
      CAST(period AS INTEGER) ASC
  `).all(personId);
}

function isOnCampusDay(person, day) {
  if (person.employment_type !== 'part-time') return true;
  if (!person.presence_days) return true;
  const abbr = day.slice(0, 3).toLowerCase();
  return person.presence_days.toLowerCase().includes(abbr);
}

function freePeriodsFromRows(rows) {
  const busyPeriods = new Set(rows.map(row => String(row.period)));
  return Object.entries(PERIOD_TIMES)
    .filter(([period]) => !busyPeriods.has(period))
    .map(([period, time]) => `P${period} (${time})`);
}

// Builds a lines array from the operational matrix for a single day.
// Reads the actual computed slot states — never raw rows.
// Returns [] if person is entirely off campus that day.
function operationalDayLines(dayRow, person) {
  if (!dayRow) return [];
  const classSlots    = dayRow.slots.filter(s => s.state === 'class' || s.state === 'meeting');
  const freeSlots     = dayRow.slots.filter(s => s.state === 'free');
  const onDutySlots   = dayRow.slots.filter(s => s.state === 'on_duty');
  const campusOnly    = dayRow.slots.filter(s => s.state === 'campus_only');
  const anyOnCampus   = classSlots.length || freeSlots.length || onDutySlots.length || campusOnly.length;
  if (!anyOnCampus) return [];

  const lines = [];
  for (const slot of classSlots) {
    lines.push(`${periodLabel(slot.period)}: ${displayClassLabel(slot.title, person)}`);
  }
  if (freeSlots.length) {
    lines.push(`Free: ${freeSlots.map(s => `P${s.period}`).join(', ')}`);
  }
  if (onDutySlots.length) {
    lines.push(`On Duty: ${onDutySlots.map(s => `P${s.period}`).join(', ')}`);
  }
  if (campusOnly.length) {
    lines.push(`On Campus (schedule not mapped): ${campusOnly.map(s => `P${s.period}`).join(', ')}`);
  }
  return lines;
}

function lookupOwnSchedule(msg, profile, preferences = {}) {
  if (!profile?.person_id) return null;
  const operational = getOperationalView(profile);

  const day = extractDay(msg);
  const wantsTeachingGroups = /\b(what|which)\s+(grade|grades|class|classes)\s+do\s+i\s+teach\b/i.test(msg)
    || (/\bwhat\s+do\s+i\s+teach\b/i.test(msg) && !day);

  if (wantsTeachingGroups) {
    const rows = getFullSchedule(profile.person_id).filter(row => !isMeetingLabel(row.class_name));
    if (!rows.length) {
      if (operational?.data_quality?.campus_only_mapping) {
        return 'Your campus availability is mapped, but your detailed teaching timetable is not mapped yet.';
      }
      return 'You do not have any teaching periods scheduled this week.';
    }

    const groups = dedupe(rows.map(row => teachingGroupLabel(row.class_name, profile)));
    if (!groups.length) {
      const labels = dedupe(rows.map(row => displayClassLabel(row.class_name, profile)));
      return formatListReply('You teach', labels, preferences, 'You do not have any teaching periods scheduled this week.');
    }

    if (!wantsStructured(preferences)) {
      return `You teach ${joinNatural(groups)}.`;
    }

    return ['**You teach**', ...groups.map(group => `- ${group}`)].join('\n');
  }

  if (day) {
    const dayRow = operational?.matrix?.find(r => r.day === day);
    const lines = operationalDayLines(dayRow, profile);
    if (!lines.length) {
      return `You are not on campus on ${day}s.`;
    }
    if (!wantsStructured(preferences)) {
      return `Your ${day}: ${lines.join('. ')}.`;
    }
    return [`**Your ${day} schedule**`, ...lines.map(l => `- ${l}`)].join('\n');
  }

  // ── Week view ─────────────────────────────────────────────────────────────
  const weekLines = [];
  for (const dayRow of operational?.matrix || []) {
    const lines = operationalDayLines(dayRow, profile);
    if (!lines.length) continue; // off campus this whole day
    weekLines.push(`${dayRow.day}: ${lines.join(' | ')}`);
  }
  if (!weekLines.length) return 'You have no scheduled campus time this week.';
  return formatListReply('Your weekly schedule', weekLines, preferences, 'You have no scheduled campus time this week.');
}

function lookupWhereabouts(msg, clearanceLevel, requesterProfile, preferences = {}) {
  const person = extractPerson(msg);
  if (!person) return null;

  const access = canViewPersonSchedule(person, clearanceLevel, requesterProfile);
  if (!access.allowed) {
    return formatAccessReply(access.reason, preferences);
  }

  const day = extractDay(msg);
  const period = extractPeriod(msg);
  if (!day || !period) return null;

  if (!isOnCampusDay(person, day)) {
    return `${person.full_name} is not on campus on ${day}s.`;
  }

  const row = db.prepare(`
    SELECT class_name FROM schedules
    WHERE person_id = ? AND day = ? AND period = ? AND academic_year = '2025-2026'
  `).get(person.id, day, String(period));
  const classLabel = row ? displayClassLabel(row.class_name, person) : null;
  const slot = getOperationalView(person)?.slot_map?.[day]?.[String(period)] || null;

  const slotState = slot?.state || (row ? 'class' : 'off_campus');
  const statusLabel = row
    ? classLabel
    : slotState === 'free'        ? 'Free'
    : slotState === 'on_duty'     ? 'On Duty (no class this period)'
    : slotState === 'campus_only' ? 'On Campus (timetable not mapped)'
    : slotState === 'off_campus'  ? 'Off Campus'
    : 'Status unknown';

  if (!wantsStructured(preferences)) {
    if (row)                        return `${person.full_name} has ${classLabel} during ${day} ${periodLabel(period)}.`;
    if (slotState === 'off_campus') return `${person.full_name} is not on campus during ${day} ${periodLabel(period)}.`;
    if (slotState === 'on_duty')    return `${person.full_name} is on campus but on duty (no class) during ${day} ${periodLabel(period)}.`;
    if (slotState === 'campus_only') return `${person.full_name} is on campus during ${day} ${periodLabel(period)}, but the detailed timetable is not mapped yet.`;
    return `${person.full_name} is free during ${day} ${periodLabel(period)}.`;
  }

  const lines = [
    `Time: ${PERIOD_TIMES[String(period)] || 'Unknown'}`,
    `Status: ${statusLabel}`,
  ];
  return [`**${person.full_name} | ${day} P${period}**`, ...lines.map(line => `- ${line}`)].join('\n');
}

function lookupSchedule(msg, clearanceLevel, requesterProfile, preferences = {}) {
  const person = extractPerson(msg);
  if (!person) return null;

  if (isSamePerson(requesterProfile, person)) {
    return null;
  }

  const access = canViewPersonSchedule(person, clearanceLevel, requesterProfile);
  if (!access.allowed) {
    return formatAccessReply(access.reason, preferences);
  }

  const day = extractDay(msg);
  const operational = getOperationalView(person);

  if (day) {
    const dayRow = operational?.matrix?.find(r => r.day === day);
    const lines = operationalDayLines(dayRow, person);
    if (!lines.length) {
      return `${person.full_name} is not on campus on ${day}s.`;
    }
    if (!wantsStructured(preferences)) {
      return `${person.full_name} on ${day}: ${lines.join('. ')}.`;
    }
    return [`**${person.full_name} — ${day} schedule**`, ...lines.map(l => `- ${l}`)].join('\n');
  }

  // ── Week view ─────────────────────────────────────────────────────────────
  const weekLines = [];
  for (const dayRow of operational?.matrix || []) {
    const lines = operationalDayLines(dayRow, person);
    if (!lines.length) continue;
    weekLines.push(`${dayRow.day}: ${lines.join(' | ')}`);
  }
  if (!weekLines.length) return `No schedule data found for ${person.full_name}.`;
  return formatListReply(`${person.full_name}'s weekly schedule`, weekLines, preferences, `No schedule data found for ${person.full_name}.`);
}

function lookupWhoTeaches(msg, preferences = {}) {
  const gradeMatch = msg.match(/grade\s*(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)/i);
  const grade = gradeMatch ? gradeMatch[0] : null;

  const rows = db.prepare(`
    SELECT p.full_name, s.class_name, s.day, s.period
    FROM schedules s
    JOIN people p ON p.id = s.person_id
    WHERE s.academic_year = '2025-2026'
    ${grade ? `AND LOWER(s.class_name) LIKE '%${grade.toLowerCase()}%'` : ''}
    LIMIT 20
  `).all();

  if (!rows.length) return null;

  const teachers = [...new Set(rows.map(row => row.full_name))];
  if (teachers.length === 1) return `${teachers[0]} teaches ${grade || 'that class'}.`;
  return wantsStructured(preferences)
    ? [`**Teachers for ${grade || 'that class'}**`, ...teachers.map(name => `- ${name}`)].join('\n')
    : `Teachers for ${grade || 'that class'}: ${joinNatural(teachers)}.`;
}

function lookupSubstitutes(msg, clearanceLevel, profile, preferences = {}) {
  if (rankOf(clearanceLevel) < rankOf('hod')) return null;

  const person = extractPerson(msg);
  if (!person) return null;

  const day = extractDay(msg);
  if (!day) return null;

  const candidateCap = choiceLimit(preferences);

  try {
    const plan = getSubstituteSuggestions(person.id, day);
    if (!plan.affected_periods.length) {
      return `${person.full_name} has no teaching periods on ${day}, so no substitute cover is needed.`;
    }

    const requesterPools = new Set(
      (profile?.departments || [])
        .map(dept => poolForDepartment(dept?.name))
        .filter(Boolean)
    );

    const scopedPeriods = plan.affected_periods.filter(slot => {
      if (clearanceLevel !== 'hod' || requesterPools.size === 0) return true;
      const slotPool = slot.substitution_pool || poolForDepartment(slot.department);
      return requesterPools.has(slotPool);
    });

    if (!scopedPeriods.length) {
      return `${person.full_name}'s ${day} classes are outside your department scope.`;
    }

    if (!wantsStructured(preferences)) {
      const parts = scopedPeriods.map(slot => {
        const names = slot.suggestions.slice(0, candidateCap).map(candidate => candidate.full_name);
        return `${periodLabel(slot.period)} ${displayClassLabel(slot.class_name, person)}: ${names.length ? joinNatural(names) : 'no available substitute'}`;
      });
      return `Substitute plan for ${person.full_name} on ${day}: ${parts.join('; ')}.`;
    }

    const lines = [
      '**Substitute Plan**',
      `- Teacher: ${person.full_name}`,
      `- Day: ${day}`,
      '',
    ];

    for (const slot of scopedPeriods) {
      const names = slot.suggestions.slice(0, candidateCap).map(candidate => candidate.full_name);
      const extraCount = Math.max(slot.suggestions.length - names.length, 0);
      lines.push(`**P${slot.period} | ${displayClassLabel(slot.class_name, person)}${slot.department ? ` | ${slot.department}` : ''}**`);
      lines.push(`- Time: ${slot.time?.label || PERIOD_TIMES[String(slot.period)] || 'Unknown'}`);
      lines.push(`- Best options: ${names.length ? names.join(', ') : 'No available substitute'}`);
      if (extraCount > 0) lines.push(`- More available: ${extraCount} more`);
      lines.push('');
    }

    return lines.join('\n').trim();
  } catch (_) {}

  const absentSchedule = getScheduleForDay(person.id, day);
  if (!absentSchedule.length) {
    return `${person.full_name} has no classes on ${day} - no substitutes needed.`;
  }

  const departments = db.prepare(`
    SELECT dept_id FROM person_departments WHERE person_id = ?
  `).all(person.id).map(row => row.dept_id);

  if (!departments.length) {
    return `${person.full_name} has no department assigned - cannot find substitutes.`;
  }

  const placeholders = departments.map(() => '?').join(',');
  const candidates = db.prepare(`
    SELECT DISTINCT p.id, p.full_name, pr.employment_type, pr.days AS presence_days
    FROM people p
    JOIN roles r ON r.person_id = p.id AND r.substitution_eligible = 1
    JOIN person_departments pd ON pd.person_id = p.id AND pd.dept_id IN (${placeholders})
    JOIN presence pr ON pr.person_id = p.id
    WHERE p.status = 'active' AND p.id != ?
  `).all(...departments, person.id);

  const periodPlans = absentSchedule.map(slot => {
    const available = [];
    for (const candidate of candidates) {
      if (!isOnCampusDay(candidate, day)) continue;
      const busy = db.prepare(`
        SELECT 1
        FROM schedules
        WHERE person_id = ? AND day = ? AND period = ? AND academic_year = '2025-2026'
      `).get(candidate.id, day, slot.period);
      if (!busy) available.push(candidate.full_name);
    }
    return { slot, available };
  });

  if (!wantsStructured(preferences)) {
    const parts = periodPlans.map(({ slot, available }) => `${periodLabel(slot.period)} ${displayClassLabel(slot.class_name, person)}: ${available.length ? joinNatural(available.slice(0, candidateCap)) : 'no available substitute'}`);
    return `Substitute plan for ${person.full_name} on ${day}: ${parts.join('; ')}.`;
  }

  const lines = [
    '**Substitute Plan**',
    `- Teacher: ${person.full_name}`,
    `- Day: ${day}`,
    '',
  ];
  for (const { slot, available } of periodPlans) {
    const names = available.slice(0, candidateCap);
    const extraCount = Math.max(available.length - names.length, 0);
    lines.push(`**P${slot.period} | ${displayClassLabel(slot.class_name, person)}**`);
    lines.push(`- Time: ${PERIOD_TIMES[String(slot.period)] || 'Unknown'}`);
    lines.push(`- Best options: ${names.length ? names.join(', ') : 'No available substitute'}`);
    if (extraCount > 0) lines.push(`- More available: ${extraCount} more`);
    lines.push('');
  }

  return lines.join('\n').trim();
}

function lookupWifi(_msg, clearanceLevel, profile, preferences = {}) {
  try {
    const rows = db.prepare('SELECT * FROM wifi').all();
    if (!rows.length) return 'WiFi information is not yet configured. Contact Mr. Yeghia Boghossian.';

    const isOwner = clearanceLevel === 'owner';
    const isOffice = clearanceLevel === 'office' || isOwner;
    const name = (profile?.full_name || '').toLowerCase();

    const visible = rows.filter(row => {
      const level = (row.access_level || '').toLowerCase();
      if (level === 'all_staff') return true;
      if (level === 'office') return isOffice;
      if (level === 'named') {
        if (isOwner) return true;
        const allowed = (row.allowed_users || '').split('|').map(item => item.trim().toLowerCase());
        return allowed.some(item => name.includes(item) || item.includes(name.split(' ').pop()));
      }
      return false;
    });

    if (!visible.length) return 'No WiFi networks available for your access level. Contact Mr. Yeghia Boghossian.';

    const lines = visible.map(row => `${row.network_name}: ${row.password || '(no password)'}${row.notes ? ` - ${row.notes}` : ''}`);
    return formatListReply('Available WiFi networks', lines, preferences, 'No WiFi networks available for your access level.');
  } catch (_) {
    return null;
  }
}

function lookupCalendar(_msg, preferences = {}) {
  try {
    const rows = db.prepare('SELECT * FROM calendar ORDER BY date ASC').all();
    if (!rows.length) return null;

    const today = new Date().toISOString().split('T')[0];
    const upcoming = rows.filter(row => row.date >= today).slice(0, 5);
    if (!upcoming.length) return 'No upcoming events in the calendar.';

    const lines = upcoming.map(row => {
      const title = row.title || row.event || 'School event';
      const type = row.type || row.school_day || '';
      const detail = row.description || '';
      return `${row.date} - ${title}${type ? ` (${type})` : ''}${detail ? `: ${detail}` : ''}`;
    });
    return formatListReply('Upcoming school events', lines, preferences, 'No upcoming events in the calendar.');
  } catch (_) {
    return null;
  }
}

function tryDirectLookup(message, clearanceLevel, profile, preferences = {}) {
  if (!message) return { handled: false };
  const msg = message.toLowerCase().trim();
  const effectiveClearance = resolveClearance(clearanceLevel, profile);

  try {
    const isOwnSchedule = /my (schedule|classes|periods|timetable|free|lessons|duty|presence)|what do i teach|when am i free|my (monday|tuesday|wednesday|thursday|friday|tomorrow|today|yesterday)|\b(what|which)\s+(grade|grades|class|classes)\s+do\s+i\s+teach\b|do i (have|need) to (be at|come to)\s+(school|campus)|am i (at school|on campus|on duty|working)|my (working|work|school) days|which days (do i|am i)|when (do i|am i).*(school|campus|work)/i.test(msg);
    if (isOwnSchedule && profile) {
      const reply = lookupOwnSchedule(msg, profile, preferences);
      if (reply) {
        console.log('[DirectLookup] own-schedule hit');
        return { handled: true, reply };
      }
    }

    const referencedPerson = extractPerson(msg);
    const referencesOtherPerson = referencedPerson && !isSamePerson(profile, referencedPerson);
    const isWhereabouts = /where is|where('s| is)\b|which period|is .+ (in|free)/i.test(msg) && extractPeriod(msg);
    if (isWhereabouts) {
      const reply = lookupWhereabouts(msg, effectiveClearance, profile, preferences);
      if (reply) {
        console.log('[DirectLookup] whereabouts hit');
        return { handled: true, reply };
      }
    }

    const isSubstitute = /absent|substitute|sub |cover|covering|replacement|assign.*teacher/i.test(msg);
    if (isSubstitute) {
      const reply = lookupSubstitutes(msg, effectiveClearance, profile, preferences);
      if (reply) {
        console.log('[DirectLookup] substitute hit');
        return { handled: true, reply };
      }
    }

    // ── Common free periods for two people ──────────────────────────────────
    const isCommonFree = /common.*(free|period|slot|time)|free.*(common|shared|both|together)|when (are|is).*(both|free).*(free|available)|(free|available|meet).*(both|together)/i.test(msg);

    if (rankOf(effectiveClearance) >= rankOf('office') && !isCommonFree) {
      const day = extractDay(msg);
      if (day) {
        const person = extractPerson(msg);
        if (person) {
          const ownName = (profile?.full_name || '').toLowerCase();
          if (!ownName || !person.full_name.toLowerCase().includes(ownName.split(' ').pop())) {
            const reply = lookupSchedule(msg, effectiveClearance, profile?.full_name, preferences);
            if (reply) {
              console.log('[DirectLookup] name-first schedule hit');
              return { handled: true, reply };
            }
          }
        }
      }
    }
    if (isCommonFree) {
      let people = extractPeople(msg);
      const day = extractDay(msg);
      // If only one person found and user refers to themselves ("me","I","we","my","us"),
      // inject the logged-in user as the other person
      if (people.length === 1 && profile && /\b(me|my|i|we|us)\b/i.test(msg)) {
        const selfPerson = getPeople().find(p => p.id === profile.person_id || p.id === profile.id);
        if (selfPerson && !people.find(p => p.id === selfPerson.id)) {
          people = [selfPerson, ...people];
        }
      }
      if (people.length >= 2 && day) {
        const [p1, p2] = people;
        const access1 = canViewPersonSchedule(p1, effectiveClearance, profile);
        const access2 = canViewPersonSchedule(p2, effectiveClearance, profile);
        if (!access1.allowed || !access2.allowed) {
          return { handled: true, reply: formatAccessReply('You need higher clearance to view both schedules.', preferences) };
        }

        // Use operational matrix — not raw rows.
        // A period counts as "available" when the person is on campus and NOT in class/meeting.
        // This correctly handles: off_campus (not available), on_duty (available for meeting),
        // free (available), and campus_only (available, schedule not mapped).
        const oper1 = getOperationalView(p1);
        const oper2 = getOperationalView(p2);
        const ALL_PERIODS = ['1','2','3','4','5','6','7'];

        const available1 = new Set(ALL_PERIODS.filter(p => {
          const s = oper1?.slot_map?.[day]?.[p];
          return s && s.state !== 'off_campus' && s.state !== 'class' && s.state !== 'meeting';
        }));
        const available2 = new Set(ALL_PERIODS.filter(p => {
          const s = oper2?.slot_map?.[day]?.[p];
          return s && s.state !== 'off_campus' && s.state !== 'class' && s.state !== 'meeting';
        }));
        const common = ALL_PERIODS.filter(p => available1.has(p) && available2.has(p));

        if (!common.length) {
          return { handled: true, reply: `**${p1.full_name}** and **${p2.full_name}** have no common available periods on ${day}.` };
        }

        // Label each common period with both people's actual states for transparency
        const lines = common.map(p => {
          const s1 = oper1?.slot_map?.[day]?.[p]?.state;
          const s2 = oper2?.slot_map?.[day]?.[p]?.state;
          const stateLabel = (s) => s === 'free' ? 'free' : s === 'on_duty' ? 'on duty' : 'on campus';
          return `- ${periodLabel(p)} (${p1.first_name || p1.full_name}: ${stateLabel(s1)}, ${p2.first_name || p2.full_name}: ${stateLabel(s2)})`;
        });
        return { handled: true, reply: [`**Common available periods on ${day} — ${p1.full_name} & ${p2.full_name}**`, ...lines].join('\n') };
      }
    }

    const isNamedSchedule = referencesOtherPerson
      && /(schedule|timetable|classes|periods|lessons|free|teach|teaches|this week|weekly|today|monday|tuesday|wednesday|thursday|friday)/i.test(msg);
    if (isNamedSchedule) {
      const reply = lookupSchedule(msg, effectiveClearance, profile, preferences);
      if (reply) {
        console.log('[DirectLookup] named schedule hit');
        return { handled: true, reply };
      }
    }

    const isSchedule = /schedule|when is|when are|free period|free on|classes on/i.test(msg) && extractDay(msg);
    if (isSchedule) {
      const reply = lookupSchedule(msg, effectiveClearance, profile, preferences);
      if (reply) {
        console.log('[DirectLookup] schedule hit');
        return { handled: true, reply };
      }
    }

    const isWhoTeaches = /who teach|who is the.*teacher|teaches|what teacher|which teacher/i.test(msg);
    if (isWhoTeaches) {
      const reply = lookupWhoTeaches(msg, preferences);
      if (reply) {
        console.log('[DirectLookup] who_teaches hit');
        return { handled: true, reply };
      }
    }

    const isWifi = /\b(wifi|wi-fi|wireless|ssid|internet)\b/i.test(msg)
      || (/\bpassword\b/i.test(msg) && /\b(wifi|wi-fi|wireless|internet|network)\b/i.test(msg));
    if (isWifi) {
      const reply = lookupWifi(msg, effectiveClearance, profile, preferences);
      if (reply) {
        console.log('[DirectLookup] wifi hit');
        return { handled: true, reply };
      }
    }

    const isCalendar = /holiday|vacation|no school|school day|calendar|is there school|when is .*(break|off)/i.test(msg);
    if (isCalendar) {
      const reply = lookupCalendar(msg, preferences);
      if (reply) {
        console.log('[DirectLookup] calendar hit');
        return { handled: true, reply };
      }
    }
  } catch (err) {
    console.error('[DirectLookup] error:', err.message);
  }

  return { handled: false };
}

module.exports = { tryDirectLookup };
