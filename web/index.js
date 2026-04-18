'use strict';

/**
 * web/index.js — CHS.ai Dashboard Router
 *
 * Assembles all sub-routers. Each domain has its own file.
 * Legacy routes kept with clear markers until old tables are dropped (Part 5 cleanup).
 */

const express  = require('express');
const path     = require('path');
const router   = express.Router();
const fs       = require('fs');

const db           = require('../core/database');
const { getLogs, logError } = require('../core/logger');
const { loadKnowledgeForQuery } = require('../core/knowledge-loader');
const { tryDirectLookup }       = require('../core/lookup-engine');
const {
  attachSession,
  setSession,
  clearSession,
  hasAdminPanelAccess,
  hasSimulationsAccess,
} = require('./auth');
const {
  ACADEMIC_YEAR,
  listOperationalPeople,
  listDepartmentsForPerson,
  buildOperationalSchedule,
  getCurrentSchoolContext,
  getSubstituteSuggestions,
} = require('../core/ops-engine');

// ── Sub-routers ───────────────────────────────────────────────────────────────
const peopleRouter   = require('./routes/people');
const identityRouter = require('./routes/identity');
const { generateSimulation } = require('../core/handler');
const { resolveIdentity } = require('./routes/identity');
const PROMPT_FILE = path.join(__dirname, '..', 'data', 'system_prompt.txt');

router.use(attachSession);

function currentSession(req) {
  return req.dashboardSession || null;
}

function isApiRequest(req) {
  const url = req.originalUrl || `${req.baseUrl || ''}${req.path || ''}` || req.url || '';
  return url.includes('/api/');
}

function requireDashboardAuth(req, res, next) {
  if (currentSession(req)) return next();
  if (isApiRequest(req)) return res.status(401).json({ error: 'Authentication required' });
  return res.redirect('/dashboard/chat');
}

function requireAdminAccess(req, res, next) {
  const session = currentSession(req);
  if (session?.admin_access || hasAdminPanelAccess(session)) return next();
  if (isApiRequest(req)) {
    return res.status(session ? 403 : 401).json({ error: session ? 'IT access required' : 'Authentication required' });
  }
  return res.redirect('/dashboard/chat');
}

function requireDirectoryAccess(req, res, next) {
  const session = currentSession(req);
  if (session?.admin_access || hasAdminPanelAccess(session) || session?.directory_access) return next();
  if (isApiRequest(req)) {
    return res.status(session ? 403 : 401).json({ error: session ? 'Directory access required' : 'Authentication required' });
  }
  return res.redirect('/dashboard/chat');
}

function requireSimulationsAccess(req, res, next) {
  const session = currentSession(req);
  if (hasSimulationsAccess(session)) return next();
  if (isApiRequest(req)) {
    return res.status(session ? 403 : 401).json({ error: session ? 'Simulations Lab access required' : 'Authentication required' });
  }
  return res.redirect('/dashboard/chat');
}

function buildLegacySession(user) {
  const role_type = user?.mode === 'admin' ? 'it_manager' : user?.mode === 'student' ? 'student' : 'teacher';
  const clearance = user?.mode === 'admin' ? 'owner' : user?.mode === 'student' ? 'student' : 'teacher';
  return {
    person_id: null,
    full_name: user?.name || 'Legacy User',
    first_name: String(user?.name || '').split(' ')[0] || 'Legacy',
    last_name: String(user?.name || '').split(' ').slice(1).join(' '),
    title: '',
    role_type,
    clearance,
    web_code: user?.code || '',
    web_mode: user?.mode || 'auto',
    departments: [],
    legacy: true,
  };
}

// ── Page routes ───────────────────────────────────────────────────────────────
router.post('/api/session/login', (req, res) => {
  try {
    const code = String(req.body?.code || '').trim();
    if (!code) return res.status(400).json({ error: 'Access code required' });

    const identity = resolveIdentity(code);
    if (identity) {
      setSession(res, identity);
      return res.json({ ok: true, session: {
        ...identity,
        admin_access: hasAdminPanelAccess(identity),
        directory_access: identity.directory_access || 0,
        simulations_access: hasSimulationsAccess({ ...identity, admin_access: hasAdminPanelAccess(identity) }) ? 1 : 0,
      }});
    }

    const legacyUser = db.prepare('SELECT name, code, mode FROM users WHERE code = ?').get(code);
    if (!legacyUser) return res.status(404).json({ error: 'Unknown access code' });

    const session = buildLegacySession(legacyUser);
    setSession(res, session);
    res.json({ ok: true, session: { ...session, admin_access: hasAdminPanelAccess(session) } });
  } catch (e) {
    sendApiError(res, 500, '/api/session/login [POST]', e, e.message);
  }
});

router.get('/api/session', (req, res) => {
  const session = currentSession(req);
  if (!session) return res.status(401).json({ error: 'No active session' });
  res.json({ ok: true, session: {
    ...session,
    admin_access: hasAdminPanelAccess(session),
    directory_access: session.directory_access || 0,
    simulations_access: hasSimulationsAccess(session) ? 1 : 0,
  }});
});

router.post('/api/session/logout', (_req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

router.use('/api/people', (req, res, next) => {
  // Read-only endpoints are available to directory-access users; writes require admin
  if (req.method === 'GET') return requireDirectoryAccess(req, res, next);
  return requireAdminAccess(req, res, next);
}, peopleRouter);
router.use('/api/identity', requireAdminAccess, identityRouter);

const page = f => (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (f.endsWith('.js')) res.type('application/javascript');
  res.sendFile(path.join(__dirname, f));
};

router.get('/', (req, res) => {
  if (currentSession(req)?.admin_access) return res.sendFile(path.join(__dirname, 'index.html'));
  return res.redirect('/dashboard/chat');
});
router.get('/admin',         requireAdminAccess, page('admin.html'));
router.get('/notifications', requireAdminAccess, page('notifications.html'));
router.get('/train',     requireAdminAccess, page('admin.html'));    // legacy alias
router.get('/chat',      page('chat.html'));
router.get('/chat-app.js', page('chat-app.js'));
router.get('/brand.css', page('brand.css'));
router.get('/logo.jpeg', (_req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.sendFile(path.join(__dirname, 'square-logo.png'));
});
router.get('/full-logo.png', (_req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.sendFile(path.join(__dirname, 'full-logo.png'));
});
router.get('/full-logo.webp', (_req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.sendFile(path.join(__dirname, 'full-logo.webp'));
});
router.get('/square-logo.png', (_req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.sendFile(path.join(__dirname, 'square-logo.png'));
});
router.get('/bot-logo.png', (_req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.sendFile(path.join(__dirname, 'bot-logo.png'));
});
router.get('/intro.mp4', (_req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.sendFile(path.join(__dirname, 'intro.mp4'));
});
router.get('/circle-logo.png', (_req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.sendFile(path.join(__dirname, 'circle-logo.png'));
});
router.get('/stimulation-logo.png', (_req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.sendFile(path.join(__dirname, 'stimulation-logo.png'));
});

// ── Simulations Lab page (access-gated) ───────────────────────────────────────
router.get('/sim-lab', requireSimulationsAccess, page('sim-lab.html'));

// ── Simulations — serve generated HTML files ──────────────────────────────────
router.get('/simulations/:filename', (req, res) => {
  const simDir  = path.join(__dirname, 'simulations');
  const filename = req.params.filename;
  // Security: only allow .html files, no path traversal
  if (!/^[a-z0-9_-]+\.html$/i.test(filename)) {
    return res.status(400).send('Invalid filename');
  }
  const filepath = path.join(simDir, filename);
  if (!fs.existsSync(filepath)) return res.status(404).send('Simulation not found');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(filepath);
});
router.get('/people',    requireDirectoryAccess, page('people.html'));  // staff directory (view-only for non-admins)
router.get('/staff/:id', requireDirectoryAccess, page('staff.html'));   // per-person detail (view-only for non-admins)
router.get('/users',     requireAdminAccess, page('users.html'));    // legacy — keep for now
router.get('/profile/:code', requireAdminAccess, (req, res) => {
  // Legacy: redirect to new people/:id if we can resolve it
  try {
    const code    = decodeURIComponent(req.params.code);
    const identity = resolveIdentity(code);
    if (identity?.person_id) return res.redirect(`/dashboard/staff/${identity.person_id}`);
    res.sendFile(path.join(__dirname, 'profile.html'));
  } catch (_) {
    res.sendFile(path.join(__dirname, 'profile.html'));
  }
});

// ── Utility ───────────────────────────────────────────────────────────────────
function extractPlainText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map(i => (i?.text || '')).filter(Boolean).join(' ').trim();
  }
  return content?.text || '';
}

function readDashboardPrompt() {
  return fs.existsSync(PROMPT_FILE)
    ? fs.readFileSync(PROMPT_FILE, 'utf8')
    : (process.env.BOT_SYSTEM_PROMPT || '');
}

function resolveSessionIdentity(session) {
  if (!session) return null;
  if (session.web_code) {
    const identity = resolveIdentity(session.web_code);
    if (identity) return identity;
  }
  return {
    person_id: session.person_id || null,
    full_name: session.full_name || '',
    first_name: session.first_name || '',
    last_name: session.last_name || '',
    title: session.title || '',
    american_program: session.american_program || 0,
    role_type: session.role_type || 'teacher',
    clearance: session.clearance || 'teacher',
    web_code: session.web_code || '',
    web_mode: session.web_mode || 'auto',
    departments: Array.isArray(session.departments) ? session.departments : [],
    legacy: !!session.legacy,
  };
}

function buildStructuredOutputContract() {
  return [
    'Reply using valid JSON only. Never wrap in markdown fences.',
    'For normal replies use: {"action":"text","reply":"..."}',
    'For documents use: {"action":"document","reply":"Here is your document.","documentSpec":{...}}',
    'You may optionally include "answerKeySpec" with the same structure.',
    'documentSpec format: {"docCategory":"test","title":"...","subtitle":"Grade X | Subject","sections":[{"title":"Section A","content":["Q1. ...","a) ...","b) ...","c) ...","d) ...","Q2. ..."]},...],"footer_note":""}',
    'Allowed docCategory values: test, exam, quiz, worksheet, handout, lesson_plan, letter.',
    'IMPORTANT: When generating a document, produce the COMPLETE content in a single response.',
    'Do not ask for confirmation before generating — generate immediately.',
    'Each section content array holds plain strings (one question, option, or line per element).',
    'For test/exam/quiz: the cover page already contains Student Name, Date, Subject, Class/Grade, Teacher, and Score fields. Do NOT add a "Student Information" section or any Name/Date/Score fields in the document sections.',
  ].join('\n');
}

function sanitizeChatPreferences(preferences = {}) {
  const responseFormat = ['structured', 'plain'].includes(preferences?.response_format) ? preferences.response_format : 'structured';
  const responseLength = ['concise', 'balanced', 'detailed'].includes(preferences?.response_length) ? preferences.response_length : 'balanced';
  const assistantTone = ['supportive', 'direct', 'formal'].includes(preferences?.assistant_tone) ? preferences.assistant_tone : 'supportive';
  const language = ['auto', 'english', 'arabic', 'french', 'armenian'].includes(preferences?.language) ? preferences.language : 'auto';
  return { response_format: responseFormat, response_length: responseLength, assistant_tone: assistantTone, language };
}

function buildPreferencePrompt(preferences = {}) {
  const prefs = sanitizeChatPreferences(preferences);
  const lengthText = prefs.response_length === 'concise'
    ? 'Keep replies concise and high-signal.'
    : prefs.response_length === 'detailed'
      ? 'Give fuller detail when helpful, but stay organized.'
      : 'Keep replies balanced in length and easy to scan.';
  const formatText = prefs.response_format === 'structured'
    ? 'Prefer structured formatting with bullets or short sections when the answer contains multiple items.'
    : 'Prefer simple prose unless bullets are clearly better.';
  const toneText = prefs.assistant_tone === 'direct'
    ? 'Use a direct, efficient tone.'
    : prefs.assistant_tone === 'formal'
      ? 'Use a formal professional tone.'
      : 'Use a supportive, clear tone.';
  const languageText = prefs.language === 'english'
    ? 'Reply in English.'
    : prefs.language === 'arabic'
      ? 'Reply in Arabic unless the user asks otherwise.'
      : prefs.language === 'french'
        ? 'Reply in French unless the user asks otherwise.'
        : prefs.language === 'armenian'
          ? 'Reply in Western Armenian (Mesrobian/Lebanese dialect, Armenian script). This is NOT Eastern Armenian.'
          : 'Match the user language when possible.';

  return [
    'Personal Chat Preferences:',
    lengthText,
    formatText,
    toneText,
    languageText,
    'For vague, troubleshooting, or open-ended requests, behave like a real assistant: ask a short clarifying question instead of forcing a factual lookup.',
  ].join('\n');
}

function buildChatSystemPrompt(identity, preferences = {}) {
  const actor = identity || {};
  const deptNames = (actor.departments || []).map(dept => dept?.name).filter(Boolean).join(', ') || 'None';
  const basePrompt = readDashboardPrompt() || 'You are CHS.ai for AECHS in Beirut. Be accurate, concise, and useful. Prefer factual school answers when the question is about schedules, staff operations, or known school data.';

  // Current date/time — injected server-side so it's always accurate
  const _now = new Date();
  const _days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const _months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const _dateStr = `${_days[_now.getDay()]}, ${_months[_now.getMonth()]} ${_now.getDate()}, ${_now.getFullYear()}`;
  const _timeStr = _now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return [
    basePrompt,
    '',
    `CURRENT DATE & TIME: ${_dateStr} at ${_timeStr}. Use this to correctly answer questions about today, tomorrow, yesterday, and the current day of the week.`,
    '',
    'Identity Context:',
    `User name: ${actor.full_name || ''}`,
    `Role: ${actor.role_type || 'staff'}`,
    `Clearance: ${actor.clearance || 'teacher'}`,
    `Departments: ${deptNames}`,
    `American Program Teacher: ${actor.american_program ? 'Yes' : 'No'}`,
    '',
    'School Program Notes:',
    'AP = American Program.',
    'AP runs from Grade 7 through Grade 12.',
    'AP students follow an English alternative program instead of Arabic-taught Arabic and Arabic social studies.',
    'For teachers marked as American Program, grade labels like "Grade 7/8" or "Grade 9/10" usually refer to AP groups unless the user says otherwise.',
    '',
    buildPreferencePrompt(preferences),
    '',
    'Structured Output Contract:',
    buildStructuredOutputContract(),
  ].join('\n');
}

function normalizeLookupText(text = '') {
  return String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function isDirectLookupCandidate(text = '') {
  const msg = normalizeLookupText(text);
  if (!msg) return false;

  const ownSchedule = /my (schedule|classes|periods|timetable|free|lessons|duty|presence)|what do i teach|when am i free|my (monday|tuesday|wednesday|thursday|friday|today|tomorrow|yesterday)|\b(what|which)\s+(grade|grades|class|classes)\s+do\s+i\s+teach\b|do i (have|need) to (be at|come to)\s+(school|campus)|am i (at school|on campus|on duty|working)|my (working|work|school) days|which days (do i|am i)|when (do i|am i).*(school|campus|work)/i.test(msg);
  const commonFree = /common.*(free|period|slot|time)|free.*(common|shared|both|together)|when (are|is).*(both|free).*(free|available)|(free|available|meet).*(both|together)/i.test(msg);
  const whereabouts = /(where is|which period|is .+ (in|free)).*(period|p\d|\d(st|nd|rd|th)? period|monday|tuesday|wednesday|thursday|friday|today|tomorrow)/i.test(msg);
  const substitutes = /absent|substitute|sub |cover|covering|replacement|assign.*teacher/i.test(msg);
  const schedule = /schedule|when is|when are|free period|free on|classes on/i.test(msg) && /(monday|tuesday|wednesday|thursday|friday|today|tomorrow|yesterday)/i.test(msg);
  const namedSchedule = /(schedule|timetable|classes|periods|lessons|free|teach|teaches)/i.test(msg)
    && (/\b(this week|weekly)\b/i.test(msg) || /\b(mr|mrs|ms|miss|dr)\.?\s+[a-z]/i.test(msg));
  const whoTeaches = /who teach|who is the.*teacher|teaches|what teacher|which teacher/i.test(msg);
  const wifi = /\b(wifi|wi-fi|wireless|ssid|internet)\b/i.test(msg) || (/\bpassword\b/i.test(msg) && /\b(wifi|wi-fi|wireless|internet|network)\b/i.test(msg));
  const calendar = /holiday|vacation|no school|school day|calendar|is there school|when is .*(break|off)/i.test(msg);

  return ownSchedule || commonFree || whereabouts || substitutes || schedule || namedSchedule || whoTeaches || wifi || calendar;
}

function isContextualLookupFollowup(text = '') {
  const msg = normalizeLookupText(text);
  if (!msg) return false;

  const hasPronoun = /\b(she|he|they|her|him|them|his|their)\b/i.test(msg);
  const followupIntent = /substitute|replacement|cover|covering|classes|periods|schedule|free/i.test(msg);
  return hasPronoun && followupIntent;
}

async function readErrorBody(response) {
  const raw = await response.text().catch(() => '');
  if (!raw) return { message: 'API error', rawText: '' };
  try {
    const p = JSON.parse(raw);
    return { message: p.error?.message || p.message || 'API error', rawText: raw };
  } catch (_) {
    return { message: raw.slice(0, 500), rawText: raw };
  }
}

function sendApiError(res, status, context, err, fallbackMsg, extra = {}) {
  logError(context, err, extra);
  if (!res.headersSent) res.status(status).json({ error: fallbackMsg || err?.message || 'Server error' });
}

// ── Logs ──────────────────────────────────────────────────────────────────────
router.use(['/api/chat', '/api/chat-stream', '/api/generate', '/api/generate-from-prompt', '/api/download', '/api/flag'], requireDashboardAuth);
router.use(['/api/simulation', '/api/simulations', '/api/simulate'], requireSimulationsAccess);
router.use([
  '/api/logs',
  '/api/ops',
  '/api/knowledge',
  '/api/kb-status',
  '/api/presence',
  '/api/user-schedule',
  '/api/user-mode',
  '/api/users',
  '/api/staff-directory',
  '/api/staff',
  '/api/memory',
  '/api/flags',
  '/api/profiles',
  '/api/documents',
], requireAdminAccess);

router.get('/api/logs', (req, res) => res.json(getLogs()));

router.get('/api/ops/overview', (req, res) => {
  try {
    const currentContext = getCurrentSchoolContext();
    const staff = listOperationalPeople()
      .filter(person => person.status !== 'inactive')
      .map(person => {
        const departments = listDepartmentsForPerson(person.id);
        const operational = buildOperationalSchedule(person, { departments });
        return {
          ...person,
          departments,
          primary_department: operational.primary_department,
          department_pools: operational.department_pools,
          current_status: operational.current_status,
          schedule_summary: operational.summary,
          data_quality: operational.data_quality,
        };
      });

    const departmentCounts = new Map();
    for (const person of staff) {
      const primary = person.primary_department?.name || 'Unassigned';
      departmentCounts.set(primary, (departmentCounts.get(primary) || 0) + 1);
    }

    const board = staff
      .map(person => ({
        id: person.id,
        full_name: person.full_name,
        role_type: person.role_type,
        phone: person.phone,
        employment_type: person.employment_type,
        web_code: person.web_code,
        substitution_eligible: !!person.substitution_eligible,
        primary_department: person.primary_department?.name || null,
        departments: person.departments,
        current_status: person.current_status,
        schedule_summary: person.schedule_summary,
        data_quality: person.data_quality,
      }))
      .sort((a, b) => {
        const priority = { free: 1, on_duty: 2, campus_only: 3, meeting: 4, class: 5, off_campus: 6, campus_day: 7, needs_review: 8, needs_review_day: 9, off_campus_day: 10, off_schedule: 11 };
        const aScore = priority[a.current_status?.code] || 99;
        const bScore = priority[b.current_status?.code] || 99;
        if (aScore !== bScore) return aScore - bScore;
        return a.full_name.localeCompare(b.full_name);
      });

    res.json({
      academic_year: ACADEMIC_YEAR,
      current_context: currentContext,
      stats: {
        total_staff: staff.length,
        teacher_like: staff.filter(person => ['teacher', 'coordinator'].includes(person.role_type) || String(person.role_type || '').startsWith('hod_')).length,
        web_access_enabled: staff.filter(person => !!person.web_code).length,
        on_campus_now: board.filter(person => ['class', 'meeting', 'free', 'on_duty', 'campus_only'].includes(person.current_status?.code)).length,
        free_teachers_now: board.filter(person => person.current_status?.code === 'free' && person.substitution_eligible).length,
        in_class_now: board.filter(person => person.current_status?.code === 'class').length,
        in_meeting_now: board.filter(person => person.current_status?.code === 'meeting').length,
        availability_review_needed: board.filter(person => person.data_quality?.availability_review_required).length,
      },
      departments: [...departmentCounts.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
      board,
      teacher_options: staff
        .filter(person => person.schedule_summary.class_periods > 0)
        .map(person => ({
          id: person.id,
          full_name: person.full_name,
          role_type: person.role_type,
          departments: person.departments,
          class_periods: person.schedule_summary.class_periods,
        }))
        .sort((a, b) => a.full_name.localeCompare(b.full_name)),
      missing_access: board
        .filter(person => !person.web_code)
        .slice(0, 12),
      needs_schedule_review: board
        .filter(person => person.data_quality?.availability_review_required)
        .slice(0, 12),
      recent_logs: getLogs().slice(-16).reverse(),
    });
  } catch (e) {
    sendApiError(res, 500, '/api/ops/overview [GET]', e, e.message);
  }
});

router.get('/api/ops/substitutions', (req, res) => {
  try {
    const personId = parseInt(req.query.person_id, 10);
    const day = req.query.day;
    if (!personId) return res.status(400).json({ error: 'person_id required' });
    if (!day) return res.status(400).json({ error: 'day required' });

    const suggestions = getSubstituteSuggestions(personId, day, ACADEMIC_YEAR);
    res.json(suggestions);
  } catch (e) {
    sendApiError(res, 500, '/api/ops/substitutions [GET]', e, e.message, { person_id: req.query.person_id, day: req.query.day });
  }
});

// ── Chat (non-streaming) ──────────────────────────────────────────────────────
router.post('/api/chat', async (req, res) => {
  try {
    const { messages, preferences } = req.body;
    const session = currentSession(req);
    if (!session) return res.status(401).json({ error: 'Authentication required' });
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array required' });
    }

    const identity = resolveSessionIdentity(session);
    let system = buildChatSystemPrompt(identity, preferences);
    const recentMsgs = messages
      .filter(m => m?.role === 'user')
      .slice(-3)
      .map(m => extractPlainText(m?.content))
      .join(' ');
    const kb = loadKnowledgeForQuery(identity?.clearance || session.clearance || 'teacher', identity, recentMsgs);
    if (kb) system += kb;

    const fetch = (...a) => import('node-fetch').then(({ default: f }) => f(...a));
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 4000, system, messages }),
    });
    if (!response.ok) {
      const e = await readErrorBody(response);
      return sendApiError(res, 500, '/api/chat', new Error(e.message), e.message);
    }
    res.json(await response.json());
  } catch (e) {
    sendApiError(res, 500, '/api/chat [POST]', e, e.message);
  }
});

// ── Chat (streaming) ──────────────────────────────────────────────────────────
router.post('/api/chat-stream', async (req, res) => {
  try {
    const { messages, preferences } = req.body;
    const session = currentSession(req);
    if (!session) return res.status(401).json({ error: 'Authentication required' });
    const fetch = (...a) => import('node-fetch').then(({ default: f }) => f(...a));

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array required' });
    }

    // ── Identity resolution (new path) ────────────────────────────────────────
    const identity = resolveSessionIdentity(session);
    let enrichedSystem = buildChatSystemPrompt(identity, preferences);

    try {
      if (identity) {
        const recentMsgs = messages
          .filter(m => m?.role === 'user')
          .slice(-3)
          .map(m => extractPlainText(m?.content))
          .join(' ');
        const kb = loadKnowledgeForQuery(identity.clearance, identity, recentMsgs);
        if (kb) enrichedSystem += kb;
      }
    } catch (kbErr) {
      logError('/api/chat-stream [KB inject]', kbErr, { web_code: session.web_code });
    }

    // ── Direct lookup ─────────────────────────────────────────────────────────
    try {
      const userTexts = messages
        .filter(m => m?.role === 'user')
        .map(m => extractPlainText(m?.content))
        .filter(Boolean);
      const lastText = userTexts[userTexts.length - 1] || '';
      const recentContext = userTexts.slice(-3).join('\n');
      const clearance = identity?.clearance || session.clearance || 'teacher';
      let lookup = { handled: false };
      if (isDirectLookupCandidate(lastText)) {
        lookup = tryDirectLookup(lastText, clearance, identity, preferences);
      }
      if (!lookup.handled && isContextualLookupFollowup(lastText) && recentContext && recentContext !== lastText) {
        lookup = tryDirectLookup(recentContext, clearance, identity, preferences);
      }
      if (lookup.handled) {
        console.log('[DirectLookup] web chat hit — skipping Sonnet');
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        if (typeof res.flushHeaders === 'function') res.flushHeaders();
        res.write(`data: ${JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text: lookup.reply } })}\n\n`);
        res.write('data: [DONE]\n\n');
        return res.end();
      }
    } catch (lookupErr) {
      console.error('[DirectLookup] error:', lookupErr.message);
    }

    // ── Anthropic streaming ───────────────────────────────────────────────────
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 8000,
        stream: true,
        system: enrichedSystem,
        messages: messages.slice(-6),
      }),
    });

    if (!response.ok) {
      const e = await readErrorBody(response);
      return sendApiError(res, 500, '/api/chat-stream [Anthropic]', new Error(e.message), e.message, { web_code: session.web_code });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    if (typeof res.flushHeaders === 'function') res.flushHeaders();

    for await (const chunk of response.body) {
      for (const line of chunk.toString().split('\n')) {
        if (line.startsWith('data: ')) res.write(line + '\n\n');
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (e) {
    logError('/api/chat-stream [POST]', e, { bodyKeys: Object.keys(req.body || {}) });
    if (!res.headersSent) res.status(500).json({ error: e.message });
    else res.end();
  }
});

// ── Knowledge Base ────────────────────────────────────────────────────────────
const KB_TABLE_MAP = {
  contacts:          'contacts',
  staff_schedules:   'schedules',
  subjects:          'subjects',
  wifi:              'wifi',
  calendar:          'calendar',
  academic_calendar: 'calendar',
  eskool:            'eskool',
  passwords:         'passwords',
  devices:           'devices',
};

router.get('/api/knowledge/:file', (req, res) => {
  const file  = req.params.file.replace(/[^a-z0-9_-]/gi, '');
  const table = KB_TABLE_MAP[file];
  if (!table) return res.status(404).json({ error: `Unknown knowledge file: ${file}` });
  try {
    res.json(db.prepare(`SELECT * FROM ${table}`).all());
  } catch (e) {
    sendApiError(res, 500, '/api/knowledge/:file [GET]', e, e.message, { file });
  }
});

router.post('/api/knowledge/:file', (req, res) => {
  const file  = req.params.file.replace(/[^a-z0-9_-]/gi, '');
  const table = KB_TABLE_MAP[file];
  if (!table) return res.status(404).json({ error: `Unknown knowledge file: ${file}` });
  try {
    const rows = req.body;
    if (!Array.isArray(rows))   return res.status(400).json({ error: 'Expected array' });
    if (rows.length === 0)      return res.json({ ok: true, rows: 0 });
    const cols = Object.keys(rows[0]);
    const stmt = db.prepare(`INSERT OR REPLACE INTO ${table} (${cols.map(c => `"${c}"`).join(',')}) VALUES (${cols.map(() => '?').join(',')})`);
    db.transaction(() => {
      db.prepare(`DELETE FROM ${table}`).run();
      for (const row of rows) stmt.run(cols.map(c => row[c] ?? null));
    })();
    res.json({ ok: true, rows: rows.length });
  } catch (e) {
    sendApiError(res, 500, '/api/knowledge/:file [POST]', e, e.message, { file });
  }
});

router.get('/api/kb-status', (req, res) => {
  try {
    const tables = ['contacts', 'schedules', 'subjects', 'wifi', 'calendar', 'eskool'];
    const status = tables.map(t => ({ table: t, rows: db.prepare(`SELECT COUNT(*) AS c FROM ${t}`).get().c }));
    res.json({ ok: true, tables: status, source: 'SQLite — chs.db' });
  } catch (e) {
    sendApiError(res, 500, '/api/kb-status [GET]', e, e.message);
  }
});

// ── Presence Board ────────────────────────────────────────────────────────────
router.get('/api/presence', (req, res) => {
  try {
    const now  = new Date();
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const today = days[now.getDay()];
    const mins  = now.getHours() * 60 + now.getMinutes();

    const PERIODS = [
      { p: '1', start: 480,  end: 525  },
      { p: '2', start: 525,  end: 570  },
      { p: '3', start: 570,  end: 615  },
      { p: '4', start: 640,  end: 685  },
      { p: '5', start: 685,  end: 730  },
      { p: '6', start: 750,  end: 795  },
      { p: '7', start: 795,  end: 840  },
    ];
    const currentPeriod = PERIODS.find(p => mins >= p.start && mins <= p.end) || null;

    // Read from new people+presence+schedules
    const staff = db.prepare(`
      SELECT p.id, p.full_name, p.title, r.role_type, pr.employment_type, pr.days AS presence_days
      FROM people p
      LEFT JOIN roles r     ON r.person_id = p.id
      LEFT JOIN presence pr ON pr.person_id = p.id
      WHERE p.status = 'active'
    `).all();

    const result = staff.map(s => {
      const isPartTime = s.employment_type === 'part-time';
      let onCampus = true;
      if (isPartTime && s.presence_days) {
        const dayAbbr = today.slice(0, 3).toLowerCase();
        onCampus = s.presence_days.toLowerCase().includes(dayAbbr);
      }

      let currentClass = null;
      if (onCampus && currentPeriod) {
        const row = db.prepare(
          "SELECT class_name FROM schedules WHERE person_id = ? AND day = ? AND period = ? AND academic_year = '2025-2026'"
        ).get(s.id, today, currentPeriod.p);
        currentClass = row?.class_name || null;
      }

      return {
        id:            s.id,
        name:          s.full_name,
        role:          s.role_type || '',
        onCampus,
        currentPeriod: currentPeriod?.p || null,
        currentClass,
        status: !onCampus ? 'off_campus' : currentClass ? 'in_class' : currentPeriod ? 'free' : 'available',
      };
    });

    res.json({ today, currentPeriod: currentPeriod || null, staff: result });
  } catch (e) {
    sendApiError(res, 500, '/api/presence [GET]', e, e.message);
  }
});

// ── Schedule lookup (used by staff.html) ─────────────────────────────────────
router.get('/api/user-schedule', (req, res) => {
  try {
    const { name, person_id } = req.query;

    if (person_id) {
      // Preferred: by person_id
      const rows = db.prepare(`
        SELECT day, period, class_name FROM schedules
        WHERE person_id = ? AND academic_year = '2025-2026'
        ORDER BY CASE day WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3 WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 END, CAST(period AS INTEGER)
      `).all(parseInt(person_id));
      return res.json({ schedule: rows, matched: 'person_id:' + person_id });
    }

    if (!name) return res.status(400).json({ error: 'name or person_id required' });

    // Legacy fallback: fuzzy name match in schedules via people.full_name
    let rows = [];
    const person = db.prepare("SELECT id FROM people WHERE full_name LIKE ? LIMIT 1").get(`%${name}%`);
    if (person) {
      rows = db.prepare(`
        SELECT day, period, class_name FROM schedules
        WHERE person_id = ? AND academic_year = '2025-2026'
      `).all(person.id);
    }
    res.json({ schedule: rows, matched: person ? person.id : null });
  } catch (e) {
    sendApiError(res, 500, '/api/user-schedule [GET]', e, e.message);
  }
});

// ── Legacy: /api/user-mode — kept for backward compat, reads new tables ───────
router.get('/api/user-mode', (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).json({ error: 'Code required' });
    const identity = resolveIdentity(code);
    if (!identity) return res.json({ mode: 'auto', clearance: null });
    res.json({
      mode:        identity.web_mode || 'auto',
      clearance:   identity.clearance,
      name:        identity.full_name,
      role:        identity.role_type,
      full_name:   identity.full_name,
      person_id:   identity.person_id,
      departments: identity.departments,
    });
  } catch (e) {
    sendApiError(res, 500, '/api/user-mode [GET]', e, e.message);
  }
});

// ── /api/me — current session info (used by sim-lab, etc.) ───────────────────
router.get('/api/me', requireDashboardAuth, (req, res) => {
  const s = currentSession(req);
  res.json({
    full_name: s?.full_name || '',
    person_id: s?.person_id || null,
    role_type: s?.role_type || '',
    clearance: s?.clearance || '',
    admin_access:       !!s?.admin_access,
    directory_access:   !!s?.directory_access,
    simulations_access: hasSimulationsAccess(s),
  });
});

// ── Legacy: /api/users — merged from users table + access table (active staff) ──
router.get('/api/users', (req, res) => {
  try {
    const legacyUsers = db.prepare('SELECT name, code, mode FROM users ORDER BY name ASC').all();
    const accessUsers = db.prepare(`
      SELECT p.full_name AS name, a.web_code AS code, a.web_mode AS mode
      FROM access a
      JOIN people p ON p.id = a.person_id
      WHERE p.status = 'active'
      ORDER BY p.full_name ASC
    `).all();
    // Merge; access table entries take priority. Deduplicate by code.
    const merged = new Map();
    legacyUsers.forEach(u => merged.set(u.code, u));
    accessUsers.forEach(u => merged.set(u.code, u));
    res.json([...merged.values()]);
  } catch (e) { sendApiError(res, 500, '/api/users [GET]', e, e.message); }
});

router.post('/api/users', (req, res) => {
  try {
    const { name, code, contact_id } = req.body;
    if (!name || !code)   return res.status(400).json({ error: 'Name and code required.' });
    if (code.length < 6)  return res.status(400).json({ error: 'Code must be at least 6 characters.' });
    const exists = db.prepare('SELECT 1 FROM users WHERE code = ?').get(code);
    if (exists) return res.status(400).json({ error: 'Code already exists.' });
    db.prepare('INSERT INTO users (name, code, mode, contact_id) VALUES (?, ?, ?, ?)').run(name, code, 'auto', contact_id || null);
    res.json({ ok: true });
  } catch (e) { sendApiError(res, 500, '/api/users [POST]', e, e.message); }
});

router.delete('/api/users/:code', (req, res) => {
  try {
    db.prepare('DELETE FROM users WHERE code = ?').run(decodeURIComponent(req.params.code));
    res.json({ ok: true });
  } catch (e) { sendApiError(res, 500, '/api/users/:code [DELETE]', e, e.message); }
});

router.patch('/api/users/:code/mode', (req, res) => {
  try {
    const code = decodeURIComponent(req.params.code);
    const { mode } = req.body;
    const user = db.prepare('SELECT 1 FROM users WHERE code = ?').get(code);
    if (!user) return res.status(404).json({ error: 'User not found' });
    db.prepare('UPDATE users SET mode = ? WHERE code = ?').run(mode || 'auto', code);
    res.json({ ok: true });
  } catch (e) { sendApiError(res, 500, '/api/users/:code/mode [PATCH]', e, e.message); }
});

// ── Legacy: /api/staff-directory — now proxies to people table ────────────────
router.get('/api/staff-directory', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT p.id, p.full_name, p.title, p.first_name, p.last_name, p.phone, p.status, p.american_program,
             r.role_type, pr.employment_type, a.web_code, a.clearance, a.whatsapp_lid
      FROM people p
      LEFT JOIN roles r     ON r.person_id = p.id
      LEFT JOIN presence pr ON pr.person_id = p.id
      LEFT JOIN access a    ON a.person_id = p.id
      WHERE p.status != 'inactive'
      ORDER BY p.last_name ASC, p.first_name ASC
    `).all();
    res.json(rows);
  } catch (e) { sendApiError(res, 500, '/api/staff-directory [GET]', e, e.message); }
});

// ── /api/staff/:id — reads from people table (rewired) ───────────────────────
router.get('/api/staff/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid ID' });

    const person = db.prepare(`
      SELECT p.*, r.role_type, r.substitution_eligible,
             pr.employment_type, pr.days AS presence_days, pr.arrival_time, pr.departure_time, pr.notes AS presence_notes,
             a.web_code, a.web_mode, a.whatsapp_lid, a.clearance
      FROM people p
      LEFT JOIN roles r     ON r.person_id = p.id
      LEFT JOIN presence pr ON pr.person_id = p.id
      LEFT JOIN access a    ON a.person_id = p.id
      WHERE p.id = ?
    `).get(id);

    if (!person) return res.status(404).json({ error: 'Staff member not found' });

    const departments = db.prepare(`
      SELECT d.id, d.name, d.color, pd.is_primary
      FROM person_departments pd JOIN departments d ON d.id = pd.dept_id
      WHERE pd.person_id = ?
      ORDER BY pd.is_primary DESC
    `).all(id);

    const schedule = db.prepare(`
      SELECT day, period, class_name FROM schedules
      WHERE person_id = ? AND academic_year = '2025-2026'
      ORDER BY CASE day WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3 WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 END, CAST(period AS INTEGER)
    `).all(id);

    // WA profile from file system
    let waProfile = null;
    if (person.whatsapp_lid) {
      try {
        const fs   = require('fs');
        const pb   = path.join(__dirname, '..', 'profiles');
        const fn   = person.whatsapp_lid.replace(/[^a-zA-Z0-9@]/g, '_') + '.json';
        if (fs.existsSync(pb)) {
          for (const folder of require('fs').readdirSync(pb)) {
            const fp = path.join(pb, folder, fn);
            if (fs.existsSync(fp)) { waProfile = JSON.parse(fs.readFileSync(fp, 'utf8')); break; }
          }
        }
      } catch (_) {}
    }

    res.json({ person, departments, schedule, waProfile });
  } catch (e) {
    sendApiError(res, 500, '/api/staff/:id [GET]', e, e.message, { id: req.params.id });
  }
});

// PATCH /api/staff/:id — rewired to people table
router.patch('/api/staff/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid ID' });

    const exists = db.prepare('SELECT id FROM people WHERE id = ?').get(id);
    if (!exists) return res.status(404).json({ error: 'Staff member not found' });

    // Delegate to people PATCH logic (reuse same update path)
    const { resolveIdentity: _, ...body } = req.body; // strip any injected fields
    req.params.id = String(id);

    // Direct update — same logic as people.js PATCH
    const allowed = {
      people:   ['first_name','last_name','title','phone','american_program'],
      presence: ['employment_type','days','arrival_time','departure_time'],
      access:   ['web_code','web_mode','clearance','whatsapp_lid'],
      roles:    ['role_type','substitution_eligible'],
    };

    db.transaction(() => {
      // people
      const pf = [], pv = [];
      for (const f of allowed.people) {
        if (body[f] !== undefined) { pf.push(`${f} = ?`); pv.push(body[f]); }
      }
      if (body.first_name !== undefined || body.last_name !== undefined || body.title !== undefined) {
        const cur  = db.prepare('SELECT first_name, last_name, title FROM people WHERE id = ?').get(id);
        const full = `${(body.title ?? cur.title) ? (body.title ?? cur.title) + ' ' : ''}${body.first_name ?? cur.first_name} ${body.last_name ?? cur.last_name}`.trim();
        pf.push('full_name = ?'); pv.push(full);
      }
      if (pf.length) db.prepare(`UPDATE people SET ${pf.join(',')} WHERE id = ?`).run(...pv, id);

      // roles
      if (body.role_type !== undefined) {
        const sub = body.substitution_eligible !== undefined ? body.substitution_eligible : (body.role_type === 'teacher' ? 1 : 0);
        db.prepare('UPDATE roles SET role_type = ?, substitution_eligible = ? WHERE person_id = ? ').run(body.role_type, sub, id);
      }

      // presence
      const prf = [], prv = [];
      for (const f of allowed.presence) {
        if (body[f] !== undefined) { prf.push(`${f} = ?`); prv.push(body[f]); }
      }
      if (prf.length) db.prepare(`UPDATE presence SET ${prf.join(',')} WHERE person_id = ?`).run(...prv, id);

      // access
      const af = [], av = [];
      for (const f of allowed.access) {
        if (body[f] !== undefined) { af.push(`${f} = ?`); av.push(body[f]); }
      }
      if (af.length) db.prepare(`UPDATE access SET ${af.join(',')} WHERE person_id = ?`).run(...av, id);
    })();

    res.json({ ok: true });
  } catch (e) {
    sendApiError(res, 500, '/api/staff/:id [PATCH]', e, e.message, { id: req.params.id });
  }
});

// ── Memory ────────────────────────────────────────────────────────────────────
const MEMORY_DIR  = path.join(__dirname, '..', 'memory');
const MEMORY_FILE = path.join(MEMORY_DIR, 'yeghia.json');
const OWNER_CODE  = process.env.OWNER_WEB_CODE || 'CHS2526';
if (!fs.existsSync(MEMORY_DIR)) fs.mkdirSync(MEMORY_DIR);

function readMemory()  { try { return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8')); } catch { return { facts: [], preferences: [], issues: [], updatedAt: null }; } }
function writeMemory(d){ d.updatedAt = new Date().toISOString(); fs.writeFileSync(MEMORY_FILE, JSON.stringify(d, null, 2)); }

router.get('/api/memory',   (req, res) => { if (req.query.code !== OWNER_CODE) return res.status(403).json({ error: 'Unauthorized' }); res.json(readMemory()); });
router.post('/api/memory',  (req, res) => {
  const { code, type, content } = req.body;
  if (code !== OWNER_CODE) return res.status(403).json({ error: 'Unauthorized' });
  if (!content) return res.status(400).json({ error: 'Content required' });
  const mem = readMemory();
  const t   = ['facts','preferences','issues'].includes(type) ? type : 'facts';
  mem[t].push({ content, addedAt: new Date().toISOString() });
  writeMemory(mem);
  res.json({ ok: true });
});
router.delete('/api/memory/:type/:index', (req, res) => {
  const code = req.body?.code || req.query?.code;
  if (code !== OWNER_CODE) return res.status(403).json({ error: 'Unauthorized' });
  const mem = readMemory();
  if (mem[req.params.type]?.[+req.params.index] !== undefined) { mem[req.params.type].splice(+req.params.index, 1); writeMemory(mem); }
  res.json({ ok: true });
});
router.post('/api/memory/extract', async (req, res) => {
  const { code, message, reply } = req.body;
  if (code !== OWNER_CODE) return res.status(403).json({ error: 'Unauthorized' });
  try {
    const fetch = (...a) => import('node-fetch').then(({ default: f }) => f(...a));
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001', max_tokens: 300,
        system: 'Extract memorable facts. Return ONLY a JSON array of strings, or [].',
        messages: [{ role: 'user', content: `User: "${message}"\nAssistant: "${reply}"\n\nExtract as JSON array:` }],
      }),
    });
    const data  = await response.json();
    const text  = data.content?.[0]?.text || '[]';
    const facts = JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
    if (facts.length > 0) {
      const mem = readMemory();
      for (const f of facts) mem.facts.push({ content: f, addedAt: new Date().toISOString(), auto: true });
      writeMemory(mem);
    }
    res.json({ ok: true, extracted: facts });
  } catch (e) { logError('/api/memory/extract', e); res.json({ ok: true, extracted: [] }); }
});

// ── Flags ─────────────────────────────────────────────────────────────────────
try {
  db.prepare(`CREATE TABLE IF NOT EXISTS flags (
    id TEXT PRIMARY KEY, question TEXT DEFAULT '', response TEXT NOT NULL,
    note TEXT DEFAULT '', "from" TEXT DEFAULT 'unknown', source TEXT DEFAULT 'chat',
    timestamp TEXT NOT NULL, resolved INTEGER DEFAULT 0, resolvedAt TEXT
  )`).run();
} catch (_) {}

router.post('/api/flag', (req, res) => {
  try {
    const session = currentSession(req);
    const { question, response, note, from, source } = req.body;
    if (!response) return res.status(400).json({ error: 'Response text required' });
    const id = Date.now().toString();
    const reporter = session?.full_name || from || 'unknown';
    db.prepare(`INSERT INTO flags (id,question,response,note,"from",source,timestamp,resolved) VALUES (?,?,?,?,?,?,?,0)`)
      .run(id, question||'', response, note||'', reporter, source||'chat', new Date().toISOString());
    res.json({ ok: true, id });
  } catch (e) { sendApiError(res, 500, '/api/flag [POST]', e, e.message); }
});
router.get('/api/flags',             (req, res) => { try { res.json(db.prepare('SELECT * FROM flags ORDER BY timestamp DESC LIMIT 200').all().map(f => ({ ...f, resolved: f.resolved === 1 }))); } catch (e) { sendApiError(res, 500, '/api/flags', e, e.message); } });
router.post('/api/flags/:id/resolve',(req, res) => { try { const r = db.prepare('UPDATE flags SET resolved=1,resolvedAt=? WHERE id=?').run(new Date().toISOString(), req.params.id); if (!r.changes) return res.status(404).json({ error: 'Not found' }); res.json({ ok: true }); } catch (e) { sendApiError(res, 500, '/api/flags/resolve', e, e.message); } });
router.post('/api/flags/:id/note',   (req, res) => { try { const r = db.prepare('UPDATE flags SET note=? WHERE id=?').run(req.body.note||'', req.params.id); if (!r.changes) return res.status(404).json({ error: 'Not found' }); res.json({ ok: true }); } catch (e) { sendApiError(res, 500, '/api/flags/note', e, e.message); } });
router.delete('/api/flags/:id',      (req, res) => { try { db.prepare('DELETE FROM flags WHERE id=?').run(req.params.id); res.json({ ok: true }); } catch (e) { sendApiError(res, 500, '/api/flags/delete', e, e.message); } });
router.get('/api/flags/export', (req, res) => {
  try {
    const flags = db.prepare('SELECT * FROM flags ORDER BY timestamp DESC').all().map(f => ({ ...f, resolved: f.resolved === 1 }));
    const lines = [`CHS.ai — Bad Responses Report`, '='.repeat(50), `Generated: ${new Date().toLocaleString('en-GB')}`, `Total: ${flags.length}`, ''];
    flags.forEach((f, i) => {
      lines.push(`[${i+1}] ${new Date(f.timestamp).toLocaleString('en-GB')} | ${f.resolved?'RESOLVED':'OPEN'}`);
      if (f.from) lines.push(`From: ${f.from}`);
      if (f.question) lines.push(`Question: ${f.question}`);
      lines.push(`Reply: ${f.response}`);
      if (f.note) lines.push(`Note: ${f.note}`);
      lines.push('-'.repeat(50));
    });
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename="chs-ai-bad-responses.txt"');
    res.send(lines.join('\n'));
  } catch (e) { sendApiError(res, 500, '/api/flags/export', e, e.message); }
});

// ── Profiles (WhatsApp user profiles) ────────────────────────────────────────
const { loadProfile, saveProfile } = require('../core/profile-manager');
const PROFILES_BASE = path.join(__dirname, '..', 'profiles');

router.get('/api/profiles', (req, res) => {
  try {
    if (!fs.existsSync(PROFILES_BASE)) return res.json([]);
    const profiles = [];
    for (const folder of fs.readdirSync(PROFILES_BASE).filter(f => fs.statSync(path.join(PROFILES_BASE, f)).isDirectory())) {
      for (const file of fs.readdirSync(path.join(PROFILES_BASE, folder)).filter(f => f.endsWith('.json'))) {
        try { profiles.push({ ...JSON.parse(fs.readFileSync(path.join(PROFILES_BASE, folder, file), 'utf8')), _folder: folder }); } catch (_) {}
      }
    }
    profiles.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    res.json(profiles);
  } catch (e) { sendApiError(res, 500, '/api/profiles [GET]', e, e.message); }
});
router.get('/api/profiles/:lid',    (req, res) => { try { const p = loadProfile(decodeURIComponent(req.params.lid)); if (!p) return res.status(404).json({ error: 'Not found' }); res.json(p); } catch (e) { sendApiError(res, 500, '/api/profiles/:lid [GET]', e, e.message); } });
router.post('/api/profiles/:lid',   (req, res) => {
  try {
    const lid = decodeURIComponent(req.params.lid);
    const p   = loadProfile(lid);
    if (!p) return res.status(404).json({ error: 'Not found' });
    for (const k of ['name','title','role','division','subject','classes','phone','languageStyle','devices','preferences']) {
      if (req.body[k] !== undefined) p[k] = req.body[k];
    }
    p.lastSeen = new Date().toISOString().split('T')[0];
    saveProfile(p);
    res.json({ ok: true, profile: p });
  } catch (e) { sendApiError(res, 500, '/api/profiles/:lid [POST]', e, e.message); }
});
router.delete('/api/profiles/:lid', (req, res) => {
  try {
    if (!fs.existsSync(PROFILES_BASE)) return res.status(404).json({ error: 'Not found' });
    const lid = decodeURIComponent(req.params.lid);
    const fn  = lid.replace(/[^a-zA-Z0-9@]/g, '_') + '.json';
    let deleted = false;
    for (const folder of fs.readdirSync(PROFILES_BASE).filter(f => fs.statSync(path.join(PROFILES_BASE, f)).isDirectory())) {
      const fp = path.join(PROFILES_BASE, folder, fn);
      if (fs.existsSync(fp)) { fs.unlinkSync(fp); deleted = true; break; }
    }
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) { sendApiError(res, 500, '/api/profiles/:lid [DELETE]', e, e.message); }
});

// ── Document generation ───────────────────────────────────────────────────────
const { generateDocument } = require('../core/document-generator');
const GENERATED_DIR = path.join(__dirname, '..', 'generated_docs');
if (!fs.existsSync(GENERATED_DIR)) fs.mkdirSync(GENERATED_DIR);

function normalizeDashboardDownloadPath(downloadPath) {
  if (!downloadPath) return null;
  return downloadPath.startsWith('/dashboard/')
    ? downloadPath
    : `/dashboard${downloadPath.startsWith('/') ? '' : '/'}${downloadPath}`;
}

router.post('/api/generate', async (req, res) => {
  try {
    const spec = req.body?.documentSpec || req.body;
    const result = await generateDocument(spec);
    res.json({
      success: true,
      filename: result.filename,
      downloadPath: normalizeDashboardDownloadPath(result.downloadPath),
      title: spec?.title || 'Document',
      preview: result.preview || null,
    });
  } catch (e) { sendApiError(res, 500, '/api/generate [POST]', e, 'Document generation failed'); }
});

// ── Simulations library API ───────────────────────────────────────────────────

// List: pre-built + teacher's own
router.get('/api/simulations', (req, res) => {
  try {
    const session = currentSession(req);
    const personId = session?.person_id || null;
    const prebuilt = db.prepare(
      'SELECT id, title, subject, grade, filename, is_prebuilt, created_at FROM simulations WHERE is_prebuilt=1 ORDER BY id ASC'
    ).all();
    const mine = personId
      ? db.prepare(
          'SELECT id, title, subject, grade, filename, is_prebuilt, created_at FROM simulations WHERE is_prebuilt=0 AND person_id=? ORDER BY created_at DESC'
        ).all(personId)
      : [];
    res.json({ success: true, prebuilt, mine });
  } catch(e) {
    console.error('[GET /api/simulations]', e.message);
    res.status(500).json({ success: false, error: 'Failed to load simulations' });
  }
});

// Dedicated simulation generation endpoint (used by Simulations Lab wizard)
router.post('/api/simulate', async (req, res) => {
  try {
    const { topic, subject, grade, focus } = req.body;
    if (!topic) return res.status(400).json({ success: false, error: 'topic is required' });

    const session = currentSession(req);
    const profile = session ? { name: session.full_name, title: '' } : null;

    const result = await generateSimulation(
      `Generate simulation for ${topic}`,
      [],
      profile,
      { simTopic: topic, simSubject: subject || '', simGrade: grade || '', simFocus: focus || '' }
    );

    if (!result?.simulationSpec?.html) {
      return res.status(500).json({ success: false, error: result?.reply || 'Generation failed' });
    }

    res.json({ success: true, simulationSpec: { ...result.simulationSpec, grade: grade || null } });
  } catch(e) {
    console.error('[POST /api/simulate]', e.message);
    res.status(500).json({ success: false, error: e.message || 'Simulation generation failed' });
  }
});

// Save — writes file + stores DB row
router.post('/api/simulation', async (req, res) => {
  try {
    const { simulationSpec } = req.body;
    if (!simulationSpec || !simulationSpec.html) {
      return res.status(400).json({ success: false, error: 'Missing simulationSpec.html' });
    }

    const simDir = path.join(__dirname, 'simulations');
    if (!fs.existsSync(simDir)) fs.mkdirSync(simDir, { recursive: true });

    const safeTitle = (simulationSpec.title || 'simulation')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 60);
    const filename = safeTitle + '-' + Date.now() + '.html';
    const filepath = path.join(simDir, filename);

    fs.writeFileSync(filepath, simulationSpec.html, 'utf8');

    const session = currentSession(req);
    const personId = session?.person_id || null;
    const info = db.prepare(
      'INSERT INTO simulations (person_id, title, subject, grade, filename, is_prebuilt) VALUES (?,?,?,?,?,0)'
    ).run(
      personId,
      simulationSpec.title  || 'Interactive Simulation',
      simulationSpec.subject|| 'physics',
      simulationSpec.grade  || null,
      filename
    );

    res.json({
      success: true,
      id: info.lastInsertRowid,
      title: simulationSpec.title || 'Interactive Simulation',
      subject: simulationSpec.subject || 'physics',
      grade: simulationSpec.grade || null,
      filename,
      url: '/dashboard/simulations/' + filename,
    });
  } catch(e) {
    console.error('[POST /api/simulation]', e.message);
    res.status(500).json({ success: false, error: 'Failed to save simulation' });
  }
});

// Delete — only own simulations
router.delete('/api/simulations/:id', (req, res) => {
  try {
    const session = currentSession(req);
    const personId = session?.person_id || null;
    const id = parseInt(req.params.id, 10);
    const row = db.prepare('SELECT * FROM simulations WHERE id=? AND is_prebuilt=0').get(id);
    if (!row) return res.status(404).json({ success: false, error: 'Not found' });
    if (row.person_id && row.person_id !== personId) {
      return res.status(403).json({ success: false, error: 'Not your simulation' });
    }
    // Delete file
    const fp = path.join(__dirname, 'simulations', row.filename);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
    db.prepare('DELETE FROM simulations WHERE id=?').run(id);
    res.json({ success: true });
  } catch(e) {
    console.error('[DELETE /api/simulations]', e.message);
    res.status(500).json({ success: false, error: 'Failed to delete simulation' });
  }
});

router.get('/api/download/:filename', (req, res) => {
  const { filename } = req.params;
  if (!/^[\w\-\.]+\.docx$/.test(filename)) return res.status(400).send('Invalid filename');
  const fp = path.join(GENERATED_DIR, filename);
  if (!fs.existsSync(fp)) return res.status(404).send('File not found');
  res.download(fp, filename, err => { if (err && !res.headersSent) res.status(500).send('Download failed'); });
});

router.post('/api/generate-from-prompt', async (req, res) => {
  try {
    const { userRequest } = req.body;
    if (!userRequest) return res.status(400).json({ error: 'Missing userRequest' });
    const fetch = (...a) => import('node-fetch').then(({ default: f }) => f(...a));
    const docSystem = fs.existsSync(path.join(__dirname, '..', 'data', 'system_prompt.txt'))
      ? fs.readFileSync(path.join(__dirname, '..', 'data', 'system_prompt.txt'), 'utf8')
      : '';
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 4000, system: docSystem, messages: [{ role: 'user', content: userRequest }] }),
    });
    if (!response.ok) { const e = await readErrorBody(response); return sendApiError(res, 500, '/api/generate-from-prompt', new Error(e.message), e.message); }
    const data  = await response.json();
    const raw   = data.content?.[0]?.text || '';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: 'Could not parse doc spec' });
    const spec   = JSON.parse(match[0]);
    const result = await generateDocument(spec);
    res.json({ success: true, filename: result.filename, downloadPath: normalizeDashboardDownloadPath(result.downloadPath), title: spec.title || 'Document' });
  } catch (e) { sendApiError(res, 500, '/api/generate-from-prompt [POST]', e, 'Generation failed'); }
});

router.get('/api/documents', (req, res) => {
  try {
    if (!fs.existsSync(GENERATED_DIR)) return res.json([]);
    const files = fs.readdirSync(GENERATED_DIR)
      .filter(f => f.endsWith('.docx') && !f.startsWith('_'))
      .map(f => {
        const stat  = fs.statSync(path.join(GENERATED_DIR, f));
        const title = f.replace(/_[a-f0-9]{8}\.docx$/, '').replace(/_/g, ' ');
        const tl    = title.toLowerCase();
        const type  = tl.includes('exam') ? 'exam' : tl.includes('quiz') ? 'quiz' : tl.includes('lesson') ? 'lesson_plan' : tl.includes('letter') || tl.includes('circular') ? 'letter' : tl.includes('worksheet') ? 'worksheet' : 'generic';
        return { filename: f, title, type, timestamp: stat.mtime.toISOString(), sizeKB: Math.round(stat.size / 1024), downloadPath: `/dashboard/api/download/${f}` };
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 100);
    res.json(files);
  } catch (e) { sendApiError(res, 500, '/api/documents [GET]', e, e.message); }
});

// ── System prompt ─────────────────────────────────────────────────────────────
router.get('/api/prompt',  requireAdminAccess, (req, res) => { try { res.json({ prompt: readDashboardPrompt() }); } catch (e) { sendApiError(res, 500, '/api/prompt [GET]', e, e.message); } });
router.post('/api/prompt', requireAdminAccess, (req, res) => { try { if (typeof req.body.prompt !== 'string') return res.status(400).json({ error: 'Invalid prompt' }); fs.writeFileSync(PROMPT_FILE, req.body.prompt, 'utf8'); res.json({ ok: true }); } catch (e) { sendApiError(res, 500, '/api/prompt [POST]', e, e.message); } });

module.exports = router;
