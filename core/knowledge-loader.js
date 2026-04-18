'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// knowledge-loader.js — CHS.ai Knowledge Base Loader
// AECHS 2025-2026
//
// Reads from: people, roles, presence, schedules, person_departments, access
// No legacy contacts/schedules tables.
//
// CLEARANCE RULES:
//   owner           — everything
//   office          — full directory + phones + all schedules + office wifi
//   hod             — their dept schedules, no phones
//   coordinator     — their subject schedules, no phones
//   teacher         — own schedule only, no other schedules, no phones
//   student         — study help only, no staff data
// ─────────────────────────────────────────────────────────────────────────────

const db = require('./database');

function displayClassLabel(label = '', profile = null) {
  const clean = String(label || '').trim().replace(/\bAp\b/g, 'AP').replace(/\bAmerican Program\b/gi, 'AP');
  if (!clean) return clean;
  const isAp = !!profile?.american_program || /\bap\b|american program/i.test(clean);
  if (!isAp) return clean;
  if (/\bap\b/i.test(clean)) return clean;
  if (!/\b(?:grade|gr)\s*(1[0-2]|[1-9])\b/i.test(clean)) return clean;
  return `AP ${clean}`;
}

const CLEARANCE_RANK = ['student','teacher','coordinator','hod','office','owner'];
function rankOf(c) { return CLEARANCE_RANK.indexOf(c ?? 'teacher'); }

// ── Get all active staff with role/presence ───────────────────────────────────
function getStaff() {
  return db.prepare(`
    SELECT
      p.id, p.full_name, p.title, p.first_name, p.last_name, p.phone, p.american_program,
      r.role_type, r.substitution_eligible,
      pr.employment_type, pr.days AS presence_days, pr.arrival_time, pr.departure_time
    FROM people p
    LEFT JOIN roles r     ON r.person_id = p.id
    LEFT JOIN presence pr ON pr.person_id = p.id
    WHERE p.status = 'active'
    ORDER BY p.last_name ASC, p.first_name ASC
  `).all();
}

function getPersonDepts(person_id) {
  return db.prepare(`
    SELECT d.name FROM person_departments pd
    JOIN departments d ON d.id = pd.dept_id
    WHERE pd.person_id = ?
    ORDER BY pd.is_primary DESC
  `).all(person_id).map(r => r.name);
}

function getSchedules() {
  return db.prepare(`
    SELECT p.full_name AS teacher, s.day, s.period, s.class_name
    FROM schedules s
    JOIN people p ON p.id = s.person_id
    WHERE s.academic_year = '2025-2026'
    ORDER BY p.last_name ASC,
      CASE s.day WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2
                 WHEN 'Wednesday' THEN 3 WHEN 'Thursday' THEN 4
                 WHEN 'Friday' THEN 5 END,
      CAST(s.period AS INTEGER) ASC
  `).all();
}

function getWifi() {
  try { return db.prepare('SELECT * FROM wifi').all(); } catch (_) { return []; }
}

function getCalendar() {
  try { return db.prepare('SELECT * FROM calendar ORDER BY date ASC').all(); } catch (_) { return []; }
}

// ── Role → display label ──────────────────────────────────────────────────────
function roleLabel(role_type) {
  const map = {
    teacher:              'Teacher',
    coordinator:          'Coordinator',
    hod_kg:               'Head of KG Dept',
    hod_elementary:       'Head of Elementary Dept',
    hod_intermediate:     'Head of Intermediate Dept',
    hod_secondary:        'Head of Secondary Dept',
    librarian:            'Librarian',
    nurse:                'Nurse',
    bookstore:            'Bookstore',
    secretary:            'Secretary',
    accountant:           'Accountant',
    academic_director:    'Academic Director',
    principal:            'Principal',
    it_manager:           'IT Manager',
    psychologist:         'Psychologist',
    counselor:            'Counselor',
    disciplinarian:       'Disciplinarian',
    government_relations: 'Government Relations',
  };
  return map[role_type] || role_type || 'Staff';
}

// ── WiFi access check ─────────────────────────────────────────────────────────
function canSeeWifi(wifiRow, clearanceLevel, profile) {
  const level   = (wifiRow.access_level || '').toLowerCase();
  const isOwner = clearanceLevel === 'owner';
  const isOffice = clearanceLevel === 'office' || isOwner;
  if (level === 'all_staff') return true;
  if (level === 'office') return isOffice;
  if (level === 'named') {
    if (isOwner) return true;
    const allowed = (wifiRow.allowed_users || '').split('|').map(s => s.trim().toLowerCase());
    const name = (profile?.full_name || '').toLowerCase();
    return allowed.some(a => name.includes(a) || a.includes(name.split(' ').pop()));
  }
  return false;
}

// ── Detect HoD department key from role_type ──────────────────────────────────
const HOD_DEPT_MAP = {
  'hod_kg':           ['KG'],
  'hod_elementary':   ['Elementary'],
  'hod_intermediate': ['Intermediate'],
  'hod_secondary':    ['Secondary'],
};

function getHodDepts(role_type) {
  return HOD_DEPT_MAP[role_type] || [];
}

// ── Detect coordinator subject from role ──────────────────────────────────────
const COORD_SUBJECT_KEYWORDS = {
  'Math':         ['math'],
  'English':      ['english'],
  'Arabic':       ['arabic'],
  'Armenian':     ['armenian'],
  'Biology':      ['biology'],
  'Physics':      ['physics'],
  'Chemistry':    ['chemistry'],
  'Social':       ['social', 'civics', 'geography', 'history'],
};

function getCoordSubjectFilter(profile) {
  if (!profile?.role_type) return null;
  const r = profile.role_type.toLowerCase();
  for (const [subject, keywords] of Object.entries(COORD_SUBJECT_KEYWORDS)) {
    if (keywords.some(k => r.includes(k))) return subject;
  }
  // Try full_name based detection (coordinators often have subject in role label)
  return null;
}

// ── Build personal context block ──────────────────────────────────────────────
function buildPersonalContext(clearanceLevel, profile) {
  if (!profile) return '';
  let ctx = '\n\n## YOUR IDENTITY\n';
  ctx += `Name: ${profile.full_name || profile.name || 'Unknown'}\n`;
  if (profile.role_type) ctx += `Role: ${roleLabel(profile.role_type)}\n`;
  if (profile.clearance) ctx += `Clearance: ${profile.clearance}\n`;
  if (profile.american_program) ctx += 'Program Track: American Program (AP)\n';
  if (profile.departments?.length) ctx += `Departments: ${profile.departments.map(d => d.name || d).join(', ')}\n`;
  return ctx;
}

// ── Build own schedule block ──────────────────────────────────────────────────
function buildOwnSchedule(profile) {
  if (!profile?.person_id) return '';
  const rows = db.prepare(`
    SELECT day, period, class_name FROM schedules
    WHERE person_id = ? AND academic_year = '2025-2026'
    ORDER BY CASE day WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2
                      WHEN 'Wednesday' THEN 3 WHEN 'Thursday' THEN 4
                      WHEN 'Friday' THEN 5 END,
             CAST(period AS INTEGER) ASC
  `).all(profile.person_id);

  if (!rows.length) return '\n## YOUR SCHEDULE\nNo classes scheduled.\n';

  let out = '\n## YOUR SCHEDULE\n';
  const byDay = {};
  for (const r of rows) {
    if (!byDay[r.day]) byDay[r.day] = [];
    byDay[r.day].push(`P${r.period}: ${displayClassLabel(r.class_name, profile)}`);
  }
  for (const [day, classes] of Object.entries(byDay)) {
    out += `${day}: ${classes.join(' | ')}\n`;
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// loadKnowledgeForQuery — query-aware loader (web chat)
// Only loads what's relevant to the current query intent.
// ─────────────────────────────────────────────────────────────────────────────
function loadKnowledgeForQuery(clearanceLevel, profile, recentMessages) {
  const msg = (recentMessages || '').toLowerCase();

  const intent = {
    schedule:    /schedule|class|period|teach|free|when|today|monday|tuesday|wednesday|thursday|friday/i.test(msg),
    directory:   /who is|staff|teacher|contact|phone|name|role|dept/i.test(msg),
    whereabouts: /where is|where's|which period|is .+ in|absent|substitute/i.test(msg),
    wifi:        /wifi|wi-fi|password|internet|network|connect/i.test(msg),
    calendar:    /holiday|vacation|school|calendar|event|break/i.test(msg),
    document:    /test|exam|quiz|lesson plan|document|generate|create|make/i.test(msg),
  };

  const isOwner  = clearanceLevel === 'owner';
  const isOffice = rankOf(clearanceLevel) >= rankOf('office');
  const isHod    = clearanceLevel === 'hod';
  const isCoord  = clearanceLevel === 'coordinator';

  let out = buildPersonalContext(clearanceLevel, profile);
  out += buildOwnSchedule(profile);

  // Staff directory
  if (intent.directory || intent.whereabouts || isOffice) {
    const staff = getStaff();
    out += '\n## STAFF DIRECTORY\n';
    if (isOffice) {
      out += 'Format: Name | Role | Departments | Employment | Phone\n';
    } else {
      out += 'Format: Name | Role | Departments\n';
      out += 'NOTE: Phone numbers not available here. Direct staff to Mrs. Lara Karghayan (Secretary).\n';
    }
    for (const s of staff) {
      const depts = getPersonDepts(s.id);
      let line = `${s.full_name} | ${roleLabel(s.role_type)} | ${depts.join(', ')}`;
      if (s.employment_type !== 'full-time') line += ` | ${s.employment_type}`;
      if (s.presence_days && s.employment_type === 'part-time') line += ` (${s.presence_days})`;
      if (isOffice && s.phone) line += ` | ${s.phone}`;
      out += line + '\n';
    }
  }

  // Schedules
  if (intent.schedule || intent.whereabouts) {
    const schedules = getSchedules();
    if (isOffice) {
      out += '\n## TEACHER SCHEDULES (Full)\n';
      out += 'Format: Teacher | Day | Period | Class\n';
      out += 'Period times: P1=08:00-08:45 P2=08:45-09:30 P3=09:30-10:15 P4=10:40-11:25 P5=11:25-12:10 P6=12:30-13:15 P7=13:15-14:00\n';
      for (const r of schedules) {
        out += `${r.teacher} | ${r.day} | P${r.period} | ${r.class_name}\n`;
      }
    } else if (isHod && profile?.role_type) {
      const hodDepts = getHodDepts(profile.role_type);
      if (hodDepts.length) {
        // Get teachers in HoD's departments
        const deptTeacherIds = db.prepare(`
          SELECT DISTINCT pd.person_id FROM person_departments pd
          JOIN departments d ON d.id = pd.dept_id
          WHERE d.name IN (${hodDepts.map(() => '?').join(',')})
        `).all(...hodDepts).map(r => r.person_id);

        if (deptTeacherIds.length) {
          const ph = deptTeacherIds.map(() => '?').join(',');
          const deptSchedules = db.prepare(`
            SELECT p.full_name AS teacher, s.day, s.period, s.class_name
            FROM schedules s JOIN people p ON p.id = s.person_id
            WHERE s.person_id IN (${ph}) AND s.academic_year = '2025-2026'
            ORDER BY p.last_name, CASE s.day WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2
              WHEN 'Wednesday' THEN 3 WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 END,
              CAST(s.period AS INTEGER)
          `).all(...deptTeacherIds);

          out += `\n## TEACHER SCHEDULES (${hodDepts.join('/')} Dept)\n`;
          for (const r of deptSchedules) {
            out += `${r.teacher} | ${r.day} | P${r.period} | ${r.class_name}\n`;
          }
        }
      }
    } else if (isCoord) {
      const subject = getCoordSubjectFilter(profile);
      if (subject) {
        const coordSchedules = schedules.filter(r => r.class_name.toLowerCase().includes(subject.toLowerCase()));
        out += `\n## TEACHER SCHEDULES (${subject} classes)\n`;
        for (const r of coordSchedules) {
          out += `${r.teacher} | ${r.day} | P${r.period} | ${r.class_name}\n`;
        }
      }
    } else {
      out += '\n## TEACHER SCHEDULES\nOther staff schedules: contact Mrs. Lara Karghayan (Secretary).\n';
    }
  }

  // WiFi
  if (intent.wifi) {
    const wifiRows = getWifi();
    const visible = wifiRows.filter(r => r.network_name && canSeeWifi(r, clearanceLevel, profile));
    if (visible.length) {
      out += '\n## WIFI NETWORKS\n';
      for (const r of visible) {
        out += `Network: ${r.network_name} | Password: ${r.password || 'none'}`;
        if (r.notes) out += ` | ${r.notes}`;
        out += '\n';
      }
    } else {
      out += '\n## WIFI\nContact Mr. Yeghia Boghossian (IT Manager) for WiFi access.\n';
    }
  }

  // Calendar
  if (intent.calendar) {
    const cal = getCalendar();
    if (cal.length) {
      out += '\n## ACADEMIC CALENDAR 2025-2026\n';
      for (const r of cal) {
        out += `${r.date} | ${r.title} | ${r.type || ''}\n`;
      }
    }
  }

  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// loadKnowledge — full loader for WhatsApp handler
// ─────────────────────────────────────────────────────────────────────────────
function loadKnowledge(clearanceLevel, profile) {
  const isOwner  = clearanceLevel === 'owner';
  const isOffice = rankOf(clearanceLevel) >= rankOf('office');
  const isHod    = clearanceLevel === 'hod';
  const isCoord  = clearanceLevel === 'coordinator';
  const isStudent = clearanceLevel === 'student';

  if (isStudent) {
    let out = '\n\nYou are assisting a student.\n';
    out += '- Do NOT share staff phone numbers, schedules, WiFi passwords, or internal school data.\n';
    out += '- Do NOT generate tests, exams, or answer keys.\n';
    out += '- You may help with: homework, subject explanations, translations, general school info.\n';
    const cal = getCalendar();
    if (cal.length) {
      out += '\n## ACADEMIC CALENDAR 2025-2026\n';
      for (const r of cal) out += `${r.date} | ${r.title}\n`;
    }
    return out;
  }

  let out = buildPersonalContext(clearanceLevel, profile);
  out += buildOwnSchedule(profile);

  // Staff directory
  const staff = getStaff();
  out += '\n## STAFF DIRECTORY\n';
  if (isOffice) {
    out += 'Format: Name | Role | Departments | Employment | Phone\n';
  } else {
    out += 'Format: Name | Role | Departments\n';
    out += 'NOTE: Phone numbers not available. Direct staff to Mrs. Lara Karghayan for contact details.\n';
  }
  for (const s of staff) {
    const depts = getPersonDepts(s.id);
    let line = `${s.full_name} | ${roleLabel(s.role_type)} | ${depts.join(', ')}`;
    if (s.employment_type !== 'full-time') line += ` | ${s.employment_type}`;
    if (s.presence_days && s.employment_type === 'part-time') line += ` (${s.presence_days})`;
    if (isOffice && s.phone) line += ` | ${s.phone}`;
    out += line + '\n';
  }

  // Schedules
  const schedules = getSchedules();
  if (isOffice) {
    out += '\n## TEACHER SCHEDULES (Full)\n';
    out += 'Period times: P1=08:00-08:45 P2=08:45-09:30 P3=09:30-10:15 P4=10:40-11:25 P5=11:25-12:10 P6=12:30-13:15 P7=13:15-14:00\n';
    for (const r of schedules) {
      out += `${r.teacher} | ${r.day} | P${r.period} | ${r.class_name}\n`;
    }
  } else if (isHod && profile?.role_type) {
    const hodDepts = getHodDepts(profile.role_type);
    if (hodDepts.length) {
      const deptTeacherIds = db.prepare(`
        SELECT DISTINCT pd.person_id FROM person_departments pd
        JOIN departments d ON d.id = pd.dept_id
        WHERE d.name IN (${hodDepts.map(() => '?').join(',')})
      `).all(...hodDepts).map(r => r.person_id);

      if (deptTeacherIds.length) {
        const ph = deptTeacherIds.map(() => '?').join(',');
        const deptSchedules = db.prepare(`
          SELECT p.full_name AS teacher, s.day, s.period, s.class_name
          FROM schedules s JOIN people p ON p.id = s.person_id
          WHERE s.person_id IN (${ph}) AND s.academic_year = '2025-2026'
          ORDER BY p.last_name, CASE s.day WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2
            WHEN 'Wednesday' THEN 3 WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 END,
            CAST(s.period AS INTEGER)
        `).all(...deptTeacherIds);
        out += `\n## TEACHER SCHEDULES (${hodDepts.join('/')} Dept)\n`;
        for (const r of deptSchedules) out += `${r.teacher} | ${r.day} | P${r.period} | ${r.class_name}\n`;
      }
    }
  } else if (isCoord) {
    const subject = getCoordSubjectFilter(profile);
    if (subject) {
      const coordSchedules = schedules.filter(r => r.class_name.toLowerCase().includes(subject.toLowerCase()));
      out += `\n## TEACHER SCHEDULES (${subject})\n`;
      for (const r of coordSchedules) out += `${r.teacher} | ${r.day} | P${r.period} | ${r.class_name}\n`;
    }
  } else {
    out += '\n## TEACHER SCHEDULES\nOther staff schedules: contact Mrs. Lara Karghayan (Secretary).\n';
  }

  // WiFi
  const wifiRows = getWifi();
  const visible = wifiRows.filter(r => r.network_name && canSeeWifi(r, clearanceLevel, profile));
  if (visible.length) {
    out += '\n## WIFI NETWORKS\n';
    for (const r of visible) {
      out += `Network: ${r.network_name} | Password: ${r.password || 'none'}`;
      if (r.notes) out += ` | ${r.notes}`;
      out += '\n';
    }
  } else {
    out += '\n## WIFI\nContact Mr. Yeghia Boghossian (IT Manager) for WiFi access.\n';
  }

  // Calendar
  const cal = getCalendar();
  if (cal.length) {
    out += '\n## ACADEMIC CALENDAR 2025-2026\n';
    for (const r of cal) out += `${r.date} | ${r.title} | ${r.type || ''}\n`;
  }

  return out;
}

function loadCredentials() { return ''; } // Credentials table not yet implemented

module.exports = { loadKnowledge, loadKnowledgeForQuery, loadCredentials };
