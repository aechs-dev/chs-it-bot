'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// knowledge-loader.js — CHS.ai Knowledge Base Loader
// AECHS 2025-2026
//
// CLEARANCE RULES:
//
// 'teacher'
//   - Staff directory: name, role, dept, subjects only (NO phones)
//   - Subject→teacher reference: YES
//   - Other teachers' schedules: NO — redirect to Mrs. Lara (Secretary)
//   - WiFi: AECHS_UNIFI only (all_staff networks)
//   - ESkool: YES
//   - Devices: NO | Passwords: NO
//
// 'coordinator'
//   - Staff directory: no phones
//   - Schedules: their subject's periods only
//   - WiFi: AECHS_UNIFI only (all_staff)
//   - ESkool: YES | Devices: NO | Passwords: NO
//
// 'hod'
//   - Staff directory: no phones
//   - Schedules: their department's teachers only
//   - WiFi: AECHS_UNIFI only (all_staff)
//   - ESkool: YES | Devices: NO | Passwords: NO
//
// 'office'
//   - Staff directory: FULL including phones
//   - Schedules: ALL teachers, full period-by-period
//   - WiFi: all_staff + office networks
//   - ESkool: YES | Devices: YES | Passwords: NO
//
// 'owner'  (Mr. Yeghia)
//   - EVERYTHING + named networks where allowed + credentials
//
// WiFi per-network access:
//   access_level = "all_staff"  → teacher / coordinator / hod / office / owner
//   access_level = "office"     → office / owner
//   access_level = "named"      → only if profile.name appears in allowed_users, or owner
// ─────────────────────────────────────────────────────────────────────────────

const path = require('path');
const fs   = require('fs');
const xlsx = require('xlsx');

const KNOWLEDGE_DIR = path.join(__dirname, '..', 'knowledge');

// ── Read xlsx safely ──────────────────────────────────────────────────────────
function readXlsx(filename) {
  const filePath = path.join(KNOWLEDGE_DIR, filename);
  if (!fs.existsSync(filePath)) return [];
  try {
    const wb = xlsx.readFile(filePath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    return xlsx.utils.sheet_to_json(ws, { defval: '' });
  } catch (e) {
    console.error(`[knowledge-loader] Failed to read ${filename}:`, e.message);
    return [];
  }
}

// ── Rows → compact plain text ─────────────────────────────────────────────────
function rowsToText(rows) {
  if (!rows.length) return '';
  const keys = Object.keys(rows[0]);
  return rows
    .filter(r => Object.values(r).some(v => v))
    .map(r => keys.map(k => r[k] || '').filter(Boolean).join(' | '))
    .filter(Boolean)
    .join('\n');
}

// ── Department fragments for HoD filtering ───────────────────────────────────
const HOD_DEPT_MAP = {
  'kg':           ['KG', 'Kindergarten'],
  'elementary':   ['Elementary'],
  'specialed':    ['Special Ed', 'Special Education'],
  'intermediate': ['Intermediate'],
  'secondary':    ['Secondary'],
  'american':     ['American Program', 'American Department'],
};

// ── Subject fragments for Coordinator filtering ──────────────────────────────
const COORDINATOR_SUBJECT_MAP = {
  'math':          ['Math'],
  'english':       ['English'],
  'arabic':        ['Arabic'],
  'armenian':      ['Armenian'],
  'biology':       ['Biology'],
  'physics':       ['Physics'],
  'chemistry':     ['Chemistry'],
  'socialstudies': ['Social Studies', 'Geography', 'Civics', 'History'],
};

// ── Detect clearance from profile ────────────────────────────────────────────
// Staff explicitly granted office-level whereabouts access by name
// Regardless of how their role is stored in the profile
const WHEREABOUTS_ACCESS = [
  'lara karghayan',
  'maral deyirmenjian',
  'taline messerlian',
  'yeghia boghossian',
];

function detectClearance(profile) {
  if (!profile || !profile.role) {
    // Even without a role, check by name for whereabouts access
    const pname = ((profile && profile.name) || '').toLowerCase();
    if (WHEREABOUTS_ACCESS.some(n => pname.includes(n) || n.includes(pname.split(' ').pop()))) return 'office';
    return 'teacher';
  }

  const r    = (profile.role + ' ' + (profile.department || '')).toLowerCase();
  const name = ((profile.name) || '').toLowerCase();

  // Named whereabouts access — always office regardless of role string
  if (WHEREABOUTS_ACCESS.some(n => name.includes(n) || n.includes(name.split(' ').pop()))) return 'office';

  if (r.includes('principal')          || r.includes('academic director') ||
      r.includes('secretary')           || r.includes('disciplinarian')   ||
      r.includes('accountant')          || r.includes('government relation') ||
      r.includes('bookstore')           || r.includes('it manager')) return 'office';

  if (r.includes('head of department') || r.includes('hod') ||
      r.includes('head of dept')        || r.includes('department head')) return 'hod';

  if (r.includes('coordinator')) return 'coordinator';

  // #40: Student tier — lowest clearance
  if (r.includes('student')) return 'student';

  return 'teacher';
}

function detectHodDept(profile) {
  const r = ((profile.role || '') + ' ' + (profile.department || '')).toLowerCase();
  for (const [key, frags] of Object.entries(HOD_DEPT_MAP)) {
    if (frags.some(f => r.includes(f.toLowerCase()))) return key;
  }
  return null;
}

function detectCoordSubject(profile) {
  const r = ((profile.role || '') + ' ' + (profile.department || '')).toLowerCase();
  for (const [key, frags] of Object.entries(COORDINATOR_SUBJECT_MAP)) {
    if (frags.some(f => r.includes(f.toLowerCase()))) return key;
  }
  return null;
}

function deptMatches(deptStr, hodDeptKey) {
  if (!hodDeptKey || !deptStr) return false;
  return (HOD_DEPT_MAP[hodDeptKey] || []).some(f => deptStr.toLowerCase().includes(f.toLowerCase()));
}

function subjectMatches(subjectStr, coordSubjectKey) {
  if (!coordSubjectKey || !subjectStr) return false;
  return (COORDINATOR_SUBJECT_MAP[coordSubjectKey] || []).some(f => subjectStr.toLowerCase().includes(f.toLowerCase()));
}

// ── WiFi access check ─────────────────────────────────────────────────────────
// Returns true if this user/clearance combo can see a given WiFi network row
function canSeeWifi(wifiRow, clearanceLevel, profile) {
  const level       = (wifiRow['Access Level'] || '').trim().toLowerCase();
  const allowedRaw  = wifiRow['Allowed Users'] || '';
  const isOwner     = clearanceLevel === 'owner';
  const isOffice    = clearanceLevel === 'office' || isOwner;
  const userName    = ((profile && profile.name) || '').toLowerCase().trim();
  const userRole    = ((profile && profile.role) || '').toLowerCase().trim();

  if (level === 'all_staff') return true;  // every registered staff member

  if (level === 'office') return isOffice;

  if (level === 'named') {
    if (isOwner) return true;
    // Check if the user's name or role appears in the pipe-separated allowed list
    const allowed = allowedRaw.split('|').map(s => s.trim().toLowerCase());
    // Match by name fragment or role fragment
    return allowed.some(a =>
      (userName && (userName.includes(a) || a.includes(userName.split(' ').pop()))) ||
      (userRole  && a.includes(userRole))
    );
  }

  return false;  // unknown level — deny by default
}

// ─────────────────────────────────────────────────────────────────────────────
// loadKnowledge(clearanceLevel, profile)
// ─────────────────────────────────────────────────────────────────────────────
function loadKnowledge(clearanceLevel, profile) {

  if (!clearanceLevel || clearanceLevel === 'auto') {
    clearanceLevel = detectClearance(profile);
  }

  const isOwner       = clearanceLevel === 'owner';
  const isOffice      = clearanceLevel === 'office' || isOwner;
  const isHod         = clearanceLevel === 'hod';
  const isCoordinator = clearanceLevel === 'coordinator';
  const isTeacher     = clearanceLevel === 'teacher';
  const isStudent     = clearanceLevel === 'student';

  const hodDept      = (isHod && profile)         ? detectHodDept(profile)      : null;
  const coordSubject = (isCoordinator && profile)  ? detectCoordSubject(profile) : null;

  // ── PHASE 2: Personalized context block ────────────────────────────────────
  // Builds a user-specific preamble from profile fields before the KB data
  let personalCtx = '';
  if (profile && profile.name) {
    const pName    = ((profile.title || '') + ' ' + profile.name).trim();
    const pRole    = profile.role       || '';
    const pDept    = profile.department || profile.division || '';
    const pSubject = profile.subject    || '';
    const pClasses = Array.isArray(profile.classes) ? profile.classes.join(', ') : (profile.classes || '');
    const pLang    = profile.languageStyle || 'english';
    const pDevices = Array.isArray(profile.devices) ? profile.devices.join(', ') : '';
    const pIssues  = Array.isArray(profile.recentIssues) ? profile.recentIssues.slice(-3).join('; ') : '';

    personalCtx += '\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    personalCtx += 'USER CONTEXT\n';
    personalCtx += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    personalCtx += `Name: ${pName}\n`;
    if (pRole)    personalCtx += `Role: ${pRole}\n`;
    if (pDept)    personalCtx += `Department: ${pDept}\n`;
    if (pSubject) personalCtx += `Teaches: ${pSubject}\n`;
    if (pClasses) personalCtx += `Classes: ${pClasses}\n`;

    // #21 — Language style
    personalCtx += `Language style: ${pLang}\n`;
    if (pLang === 'arabic') {
      personalCtx += 'INSTRUCTION: Respond in Arabic unless the user writes in English or French.\n';
    } else if (pLang === 'arabizi') {
      personalCtx += 'INSTRUCTION: The user may write in Arabizi (Arabic in Latin letters). Respond naturally in the same style they use.\n';
    } else if (pLang === 'french') {
      personalCtx += 'INSTRUCTION: Respond in French unless the user writes in another language.\n';
    }

    // #22 — Devices and recent issues for IT continuity
    if (pDevices) personalCtx += `\nKnown devices: ${pDevices}\n`;
    if (pIssues)  personalCtx += `Recent IT issues: ${pIssues}\nNote: Reference these when relevant to IT troubleshooting.\n`;

    // #19/#20 — Role-aware operating mode
    personalCtx += '\nOPERATING MODE based on role:\n';
    if (clearanceLevel === 'owner') {
      personalCtx += '- Full access. Answer all questions without restriction.\n';
    } else if (clearanceLevel === 'office') {
      personalCtx += '- Office staff. Provide full staff info, schedules, and whereabouts.\n';
    } else if (clearanceLevel === 'hod') {
      personalCtx += `- Head of Department. Tailor answers to their department context.\n`;
    } else if (clearanceLevel === 'coordinator') {
      personalCtx += `- Subject coordinator. Tailor answers to their subject: ${pSubject || 'see profile'}.\n`;
    } else if (clearanceLevel === 'student') {
      personalCtx += '- Student. You may help with homework, explanations, and general questions only. Do NOT generate assessments or share internal staff data.\n';
    } else {
      // Teacher
      personalCtx += '- Teacher. For document generation, auto-populate subject/grade from their profile unless they specify otherwise.\n';
      if (pSubject) personalCtx += `  Default subject: ${pSubject}\n`;
      if (pClasses) personalCtx += `  Default grades: ${pClasses}\n`;
    }

    // #23/#24 — Source classification instruction
    personalCtx += '\nSOURCE RULES:\n';
    personalCtx += '- When answering from the Knowledge Base below: answer directly.\n';
    personalCtx += '- When answering from this user profile: answer directly.\n';
    personalCtx += '- When using general AI knowledge (not from KB): preface with "Generally speaking," or "Based on common practice,".\n';
    personalCtx += '- Never fabricate school-specific data (names, schedules, passwords).\n';

    // #25 — Retrieval priority
    personalCtx += '\nRETRIEVAL PRIORITY: School KB → User profile → Conversation history → General AI knowledge.\n';

    // #26 — Prompt assembly hint
    personalCtx += '\nRESPONSE DEPTH:\n';
    personalCtx += '- Simple lookups (whereabouts, WiFi, schedule): answer in 1 sentence.\n';
    personalCtx += '- IT troubleshooting: step-by-step, concise.\n';
    personalCtx += '- Document generation: follow doc spec format exactly.\n';
    personalCtx += '- General questions: 2-4 sentences max unless detail is explicitly requested.\n';
  }

  // ── #40: Student tier — very restricted KB ──────────────────────────────
  if (isStudent) {
    let studentOut = '\n\nYou are assisting a student. Restrictions:\n';
    studentOut += '- Do NOT share staff phone numbers, schedules, WiFi passwords, or internal school data.\n';
    studentOut += '- Do NOT generate tests, exams, or answer keys.\n';
    studentOut += '- You may help with: homework questions, subject explanations, translations, general school info.\n';
    studentOut += '- Academic calendar and general school info only.\n';
    const cal = readXlsx('academic_calendar.xlsx');
    if (cal.length) {
      studentOut += '\n## ACADEMIC CALENDAR 2025-2026\n';
      for (const r of cal) {
        if (!r['Date'] || !r['Event / Note']) continue;
        studentOut += `${r['Date']} | ${r['Event / Note']} | ${r['School Day?'] || ''}\n`;
      }
    }
    return studentOut;
  }

  let out = '\n\n─────────────────────────────────────\nSCHOOL KNOWLEDGE BASE — AECHS 2025-2026\n─────────────────────────────────────\n';
  out = personalCtx + out;
  out += '\nSCHOOL PERIOD STRUCTURE:\n';
  out += 'Period 1: 08:00–08:45 | Period 2: 08:45–09:30 | Period 3: 09:30–10:15\n';
  out += 'RECESS: 10:15–10:40\n';
  out += 'Period 4: 10:40–11:25 | Period 5: 11:25–12:10\n';
  out += 'RECESS: 12:10–12:30\n';
  out += 'Period 6: 12:30–13:15 | Period 7: 13:15–14:00\n';
  out += 'Early slots (dept meetings): 07:15–08:00 and 07:30–08:00\n';
  out += '\nIMPORTANT RULES FOR AVAILABILITY & WHEREABOUTS QUESTIONS:\n';
  out += '- Part-time teachers are NOT present every day. An empty slot does NOT mean free — they may not be in school.\n';
  out += '- Always check Employment Type and Presence Notes before answering.\n';
  out += '- If a teacher is part-time and not scheduled today, say they are not on campus today.\n';
  out += '- If unsure, suggest contacting Mrs. Lara Karghayan (Secretary).\n';
  out += '\nWHEREABOUTS ANSWER FORMAT — STRICT RULES:\n';
  out += '- Answer in ONE SHORT SENTENCE. Natural, direct, no explanation.\n';
  out += '- If they have a class: "He/She should be in [Subject] — [Grade]."\n';
  out += '- If free but on campus: "He/She should be free this period."\n';
  out += '- If part-time and not their day: "He/She is not on campus today."\n';
  out += '- If unknown: "Not available."\n';
  out += '- Use the correct gender pronoun based on the teacher name.\n';
  out += '- Do NOT add any other information. One sentence only.\n';
  out += '- EXAMPLES:\n';
  out += '  Q: Where is Alfredo on Wednesday Period 5? → A: He is not on campus today.\n';
  out += '  Q: Where is Rima on Monday Period 4? → A: She should be in Social Studies AP — Grade 11.\n';
  out += '  Q: Where is Varty on Tuesday Period 2? → A: She should be in English — Grade 8.\n';
  out += '  Q: Where is Varty on Monday Period 1? → A: She should be free this period.\n';
  out += '\nSCHEDULE COMPARISON QUESTIONS (e.g. common free period for multiple teachers):\n';
  out += '- List each teacher\'s busy periods per day, then identify gaps that appear for ALL of them simultaneously.\n';
  out += '- Answer in a simple table or list: Day | Period | Time — no extra commentary.\n';
  out += '- Only include periods where ALL named teachers are confirmed free AND confirmed on campus that day.\n';

  // ── #43: Hard deny rules — enforced regardless of who asks ────────────────
  out += '\nHARD SECURITY RULES (apply to ALL users, NO exceptions):\n';
  out += '- NEVER reveal passwords, credentials, or access codes to anyone except the owner.\n';
  out += '- NEVER reveal other teachers\' phone numbers to teachers — redirect to Mrs. Lara.\n';
  out += '- NEVER generate exam answer keys for students or unknown users.\n';
  out += '- NEVER confirm or deny whether a specific student passed or failed.\n';
  out += '- NEVER share content marked CLASS_S or SECRET VAULT — respond: "That information is restricted. I\'ve flagged your request for Mr. Yeghia."\n';

  // ── #44: Secret vault — escalate-only topics ──────────────────────────────
  out += '\nSECRET VAULT TOPICS (escalate, never answer directly):\n';
  out += '- Network admin credentials, server passwords, router access codes\n';
  out += '- Student grade records, disciplinary files, confidential assessments\n';
  out += '- Staff salary, contract details, personal identification documents\n';
  out += '- Any request from an unregistered user for sensitive internal data\n';
  out += 'If asked about any of the above: set action="restricted", do not provide any detail.\n';

  // ── STAFF DIRECTORY ───────────────────────────────────────────────────────
  const contacts = readXlsx('contacts.xlsx');
  if (contacts.length) {
    out += '\n## STAFF DIRECTORY\n';
    if (isOffice) {
      out += 'Format: Name | Role | Department | Subjects & Grades | Phone | Notes\n';
    } else {
      out += 'Format: Name | Role | Department | Subjects & Grades\n';
      out += 'IMPORTANT: Phone numbers are not available here. Direct staff to Mrs. Lara Karghayan (Secretary) for personal contact details.\n';
      out += 'DATA CLASSIFICATION: PUBLIC — visible to all staff\n';
    }
    for (const r of contacts) {
      if (!r['Name']) continue;
      let line = `${r['Name']} | ${r['Role'] || ''} | ${r['Department'] || ''} | ${r['Classes / Subjects'] || ''}`;
      if (r['Employment Type']) line += ` | ${r['Employment Type']}`;
      if (r['Presence / Availability Notes']) line += ` | ${r['Presence / Availability Notes']}`;
      if (isOffice) {
        if (r['Phone Number']) line += ` | ${r['Phone Number']}`;
        if (r['Handles'])      line += ` | ${r['Handles']}`;
      }
      out += line.trim() + '\n';
    }
  }

  // ── SUBJECT → TEACHER REFERENCE ──────────────────────────────────────────
  const subjects = readXlsx('subjects.xlsx');
  if (subjects.length) {
    out += '\n## WHO TEACHES WHAT\n';
    out += 'Format: Subject | Grade | Teacher | Department\n';
    for (const r of subjects) {
      if (!r['Subject']) continue;
      if (isCoordinator && coordSubject && !subjectMatches(r['Subject'], coordSubject)) continue;
      if (isHod && hodDept && !deptMatches(r['Department'] || '', hodDept)) continue;
      let line = `${r['Subject']} | ${r['Grade / Level'] || ''} | ${r['Teacher'] || ''} | ${r['Department'] || ''}`;
      if (r['Notes']) line += ` | ${r['Notes']}`;
      out += line.trim() + '\n';
    }
  }

  // ── TEACHER SCHEDULES ─────────────────────────────────────────────────────
  const schedules = readXlsx('staff_schedules.xlsx');
  if (schedules.length) {
    if (isOffice) {
      out += '\n## TEACHER SCHEDULES (Full)\n';
      out += 'Format: Teacher | Day | Period | Time | Class/Subject\n';
      for (const r of schedules) {
        if (!r['Teacher'] || !r['Class / Subject']) continue;
        out += `${r['Teacher']} | ${r['Day']} | ${r['Period'] || ''} | ${r['Time']} | ${r['Class / Subject']}${r['Notes'] ? ' | ' + r['Notes'] : ''}\n`;
      }
    } else if (isHod && hodDept) {
      const deptTeachers = new Set(
        contacts
          .filter(r => r['Name'] && deptMatches(r['Department'] || '', hodDept))
          .map(r => r['Name'].trim())
      );
      out += '\n## TEACHER SCHEDULES (Your Department)\n';
      out += 'Format: Teacher | Day | Period | Time | Class/Subject\n';
      let found = false;
      for (const r of schedules) {
        if (!r['Teacher'] || !r['Class / Subject']) continue;
        if (!deptTeachers.has(r['Teacher'].trim())) continue;
        out += `${r['Teacher']} | ${r['Day']} | ${r['Period'] || ''} | ${r['Time']} | ${r['Class / Subject']}\n`;
        found = true;
      }
      if (!found) out += '(No schedule data found for your department.)\n';
    } else if (isCoordinator && coordSubject) {
      out += '\n## TEACHER SCHEDULES (Your Subject)\n';
      out += 'Format: Teacher | Day | Period | Time | Class/Subject\n';
      let found = false;
      for (const r of schedules) {
        if (!r['Teacher'] || !r['Class / Subject']) continue;
        if (!subjectMatches(r['Class / Subject'], coordSubject)) continue;
        out += `${r['Teacher']} | ${r['Day']} | ${r['Period'] || ''} | ${r['Time']} | ${r['Class / Subject']}\n`;
        found = true;
      }
      if (!found) out += '(No schedule data found for your subject.)\n';
    } else {
      // Teacher level — no schedule data for others
      out += '\n## TEACHER SCHEDULES\n';
      out += 'Schedule information for other staff is not available through CHS.ai.\n';
      out += 'For schedule queries about colleagues, please contact Mrs. Lara Karghayan (Secretary).\n';
    }
  }

  // ── WIFI ──────────────────────────────────────────────────────────────────
  const wifiRows = readXlsx('wifi.xlsx');
  const visibleWifi = wifiRows.filter(r =>
    r['Network Name (SSID)'] && canSeeWifi(r, clearanceLevel, profile)
  );

  if (visibleWifi.length) {
    out += '\n## WIFI NETWORKS\n';
    for (const r of visibleWifi) {
      const ssid     = r['Network Name (SSID)']  || '';
      const password = r['Password']              || '';
      const notes    = r['Location / Notes']      || '';
      const loginReq = (r['Login Required'] || '').toLowerCase() === 'yes';
      const loginU   = r['Login Username']        || '';
      const loginP   = r['Login Password']        || '';

      out += `Network: ${ssid}\n`;
      out += `  WiFi Password: ${password}\n`;
      if (notes)    out += `  Notes: ${notes}\n`;
      if (loginReq) {
        out += `  Portal Login Required: Yes\n`;
        out += `  Login Username: ${loginU}\n`;
        out += `  Login Password: ${loginP}\n`;
      }
      out += '\n';
    }
  } else if (isTeacher || isCoordinator || isHod) {
    out += '\n## WIFI NETWORKS\n';
    out += 'Contact Mr. Yeghia Boghossian (IT Manager) for WiFi access.\n';
  }

  // ── ACADEMIC CALENDAR ──────────────────────────────────────────────────────
  const calendar = readXlsx('academic_calendar.xlsx');
  if (calendar.length) {
    out += '\n## ACADEMIC CALENDAR 2025-2026\n';
    out += 'Term 1: Sep 18, 2025 – Jan 21, 2026 | MYE: Jan 23-30 | Term 2: Feb 2 – Jun 10, 2026 | FE: Jun 12-18\n';
    out += 'Format: Date | Day | Event | Type | School Day\n';
    for (const r of calendar) {
      if (!r['Date'] || !r['Event / Note']) continue;
      out += `${r['Date']} | ${r['Day'] || ''} | ${r['Event / Note']} | ${r['Type'] || ''} | ${r['School Day?'] || ''}\n`;
    }
  }

  // ── ESKOOL ────────────────────────────────────────────────────────────────
  const eskool = readXlsx('eskool.xlsx');
  if (eskool.length) {
    out += '\n## ESKOOL SYSTEM INFO\n';
    // #41/#42: Filter out CLASS_S entries for non-owners
    const eskoolFiltered = isOwner ? eskool : eskool.filter(r => (r['Classification'] || '').toUpperCase() !== 'CLASS_S');
    out += rowsToText(eskoolFiltered) + '\n';
  }

  // ── DEVICES ───────────────────────────────────────────────────────────────
  const devices = readXlsx('devices.xlsx');
  if (devices.length && isOffice) {
    out += '\n## SCHOOL DEVICES\n';
    out += rowsToText(devices) + '\n';
  }

  return out;
}

// ── loadCredentials() — owner only ───────────────────────────────────────────
function loadCredentials() {
  const passwords = readXlsx('passwords.xlsx');
  if (!passwords.length) return '';
  let out = '\n\n## CREDENTIALS & PASSWORDS (Owner Only)\n';
  out += rowsToText(passwords) + '\n';
  return out;
}

module.exports = { loadKnowledge, loadCredentials };
