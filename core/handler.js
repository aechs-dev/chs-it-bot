require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { logMessage } = require('./logger');
const { loadKnowledge, loadCredentials } = require('./knowledge-loader');
const {
  loadProfile, createProfile, updateProfile,
  buildProfileContext, logIssue
} = require('./profile-manager');
const { generateWorksheetPDF } = require('./worksheet-generator');
const path = require('path');
const fs   = require('fs');
const os   = require('os');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const conversations        = new Map(); // history per user
const pendingEscalations   = new Map();
const pendingRegistrations = new Set();
const askedAnswerKey       = new Set(); // track who we've asked about answer key
const ESCALATION_NUMBER    = '96170688510';
const SAFE_PROFILE_FIELDS  = ['languageStyle', 'devices', 'preferences', 'recentIssues'];

const OWNER_IDS = [
  '213081917517870@lid',
  '96170688510',
  '96170688510@c.us',
  '70688510',
  process.env.OWNER_NUMBER,
  process.env.ESCALATION_LID,
].filter(Boolean);

let basePrompt = process.env.BOT_SYSTEM_PROMPT || '';

function isOwner(from) { return OWNER_IDS.includes(from); }

// ── Registration helpers ──────────────────────────────────────────────────────
function isRegistered(from) {
  try {
    const p = path.join(__dirname, '..', 'logs', 'registrations.txt');
    return fs.existsSync(p) && fs.readFileSync(p, 'utf8').includes('ID: ' + from);
  } catch { return false; }
}

function logRegistration(from, data) {
  try {
    const p = path.join(__dirname, '..', 'logs', 'registrations.txt');
    fs.appendFileSync(p, '---\n[' + new Date().toISOString() + ']\nID: ' + from + '\n' + data + '\n');
    console.log('Registration logged: ' + from);
  } catch (e) { console.error('Registration log error:', e.message); }
}

function getRegistrations() {
  try {
    const p = path.join(__dirname, '..', 'logs', 'registrations.txt');
    if (!fs.existsSync(p)) return 'No registrations yet.';
    const c = fs.readFileSync(p, 'utf8').trim();
    if (!c) return 'No registrations yet.';
    return 'Registrations (' + c.split('---').filter(e => e.trim()).length + '):\n\n' + c;
  } catch { return 'Error reading registrations.'; }
}

function looksLikeRegistrationInfo(body) {
  if (!body || body.trim().length < 15) return false;
  const lower = body.toLowerCase();
  const vague = /^(ok|okay|sure|i will|will do|later|yes|yep|yeah|alright|noted|thanks|thank you|merci|inshallah|yalla|tekram)[\s!.]*$/i;
  if (vague.test(body.trim())) return false;
  const hasRole = lower.includes('teacher') || lower.includes('coordinator') || lower.includes('head') ||
    lower.includes('principal') || lower.includes('secretary') || lower.includes('nurse') ||
    lower.includes('librarian') || lower.includes('bookstore') || lower.includes('director');
  const hasNumber = /\d{7,}/.test(body);
  return hasRole || hasNumber;
}

// ── Safe profile update ───────────────────────────────────────────────────────
function safeProfileUpdate(from, profileUpdates) {
  if (!profileUpdates || Object.keys(profileUpdates).length === 0) return;
  if (isOwner(from)) return;
  try {
    const safe = {};
    for (const f of SAFE_PROFILE_FIELDS) {
      if (profileUpdates[f] !== undefined) safe[f] = profileUpdates[f];
    }
    if (Object.keys(safe).length > 0) updateProfile(from, safe);
  } catch (e) { console.error('Profile update error:', e.message); }
}

// ── System prompt builder ─────────────────────────────────────────────────────
function getSystemPrompt(from, profile) {
  let prompt = basePrompt;
  if (profile) prompt += buildProfileContext(profile);
  if (isOwner(from)) {
    prompt += '\n\nOWNER: This is Mr. Yeghia Boghossian, IT Manager and bot owner. Never ask him to identify himself. Full access to all information including credentials.';
    prompt += loadKnowledge('owner', profile);
    prompt += loadCredentials();
  } else {
    if ((!profile || !profile.name) && !pendingRegistrations.has(from)) {
      prompt += '\n\nUNKNOWN USER: You do not have this person on file. After helping, ask ONCE naturally for their name, phone number, and position at school. Only ask in this message — never again.';
      pendingRegistrations.add(from); // mark as asked
    }
    prompt += loadKnowledge(null, profile); // clearance auto-detected from profile.role + name
  }
  return prompt;
}

// ── CALL 1: Router (Haiku) ────────────────────────────────────────────────────
// Fast, cheap classification. Returns structured routing decision.
async function routeMessage(body, history, profile) {
  const recentHistory = history.slice(-6).map(m =>
    (m.role === 'user' ? 'User: ' : 'Bot: ') +
    (typeof m.content === 'string' ? m.content : '[media]')
  ).join('\n');

  const profileCtx = profile && profile.name
    ? `Known user: ${profile.title || ''} ${profile.name}, ${profile.role || ''}`.trim()
    : 'Unknown user';

  const routerPrompt = `You are a message router for a school WhatsApp bot at AECHS, Beirut.
Analyze the message and conversation history, then return ONLY a JSON object.

INTENTS:
- "document" — teacher wants to generate a test, exam, quiz, worksheet, handout, lesson plan, or letter
- "chat" — general question, IT help, translation, or anything else
- "registration" — user is sharing their name/role/phone number
- "escalate" — IT question the bot cannot answer

DOCUMENT FIELDS (only for "document" intent):
Extract these from the message and conversation history:
- topic: subject/topic (e.g. "Photosynthesis", "Linear Equations") or null if missing
- grade: grade level (e.g. "Grade 7", "Grade 8") or null if missing  
- assessmentType: "test" | "exam" | "quiz" | "worksheet" | "handout" | "lesson_plan" | "letter" or null if missing
- wantsAnswerKey: true | false | null (null = not yet asked)
- isModification: true if they're asking to modify/add to a previously generated document

Return ONLY this JSON:
{
  "intent": "document" | "chat" | "registration" | "escalate",
  "topic": "...",
  "grade": "...",
  "assessmentType": "...",
  "wantsAnswerKey": null,
  "isModification": false,
  "language": "en" | "ar" | "fr" | "arabizi"
}`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: routerPrompt,
      messages: [{
        role: 'user',
        content: `${profileCtx}\n\nRecent conversation:\n${recentHistory}\n\nNew message: "${body}"`
      }]
    });

    const raw = response.content[0].text.trim();
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(clean);
  } catch (e) {
    console.error('[Router] Failed:', e.message);
    // Fallback: treat as chat
    return { intent: 'chat', topic: null, grade: null, assessmentType: null, wantsAnswerKey: null, isModification: false, language: 'en' };
  }
}

// ── CALL 2A: Responder — chat/IT/escalate (Sonnet) ───────────────────────────
async function generateReply(body, history, from, profile, routing) {
  // Retry up to 3 times on 529 overload errors
  let response;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: getSystemPrompt(from, profile),
        messages: history,
      });
      break; // success
    } catch (err) {
      const is529 = err.status === 529 || (err.message && err.message.includes('overloaded'));
      if (is529 && attempt < 3) {
        const wait = attempt * 3000; // 3s, then 6s
        console.log(`[Responder] 529 overload — retry ${attempt}/3 in ${wait/1000}s`);
        await new Promise(r => setTimeout(r, wait));
      } else {
        throw err; // re-throw on final attempt or non-529 error
      }
    }
  }

  const raw = response.content[0].text;

  // Try to parse JSON (bot prompt enforces JSON output)
  try {
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(clean);
    if (!parsed.action) parsed.action = 'text';
    return parsed;
  } catch {
    // Try slice extraction
    try {
      const start = raw.indexOf('{');
      const end   = raw.lastIndexOf('}');
      if (start !== -1 && end > start) {
        const parsed = JSON.parse(raw.substring(start, end + 1));
        if (!parsed.action) parsed.action = 'text';
        console.log('[Responder] JSON recovered via slice');
        return parsed;
      }
    } catch {}
    // Final fallback
    return { action: 'text', reply: raw.trim(), escalate: false, profileUpdates: {} };
  }
}

// ── CALL 2B: Document spec generator (Sonnet) ────────────────────────────────
async function generateDocSpec(body, history, routing, profile) {
  const { topic, grade, assessmentType, wantsAnswerKey, isModification } = routing;

  // ── #38: Assessment style profile based on grade level ───────────────────
  let _styleNote = '';
  const _gradeNum = parseInt((grade || '').replace(/[^0-9]/g, '')) || 0;
  if (_gradeNum <= 3 || /kg|kindergarten|pre/i.test(grade || '')) {
    _styleNote = 'ASSESSMENT STYLE: Early Years — very simple language, short sentences, max 8 questions, image-friendly layout.';
  } else if (_gradeNum <= 6) {
    _styleNote = 'ASSESSMENT STYLE: Elementary — clear and structured, age-appropriate vocabulary, max 15 questions.';
  } else if (_gradeNum <= 9) {
    _styleNote = 'ASSESSMENT STYLE: Intermediate — balanced academic tone, varied question types.';
  } else {
    _styleNote = 'ASSESSMENT STYLE: Secondary — formal academic language, full marks distribution (total 100), Lebanese curriculum standards.';
  }
  // ── #39: Role-based academic mode ────────────────────────────────────────
  if (profile && profile.role) {
    const _r = (profile.role || '').toLowerCase();
    if (_r.includes('coordinator') || _r.includes('hod') || _r.includes('head')) {
      _styleNote += ' Include learning objective alignment notes for each section.';
    }
  }

  const docPrompt = `You are a document spec generator for AECHS (Armenian Evangelical Central High School), Beirut.
${_styleNote}
Generate a complete documentSpec JSON. Return ONLY valid JSON — no text, no markdown, no backticks.

DOCUMENT CATEGORY — always set "docCategory":
  "test" | "exam" | "quiz" | "worksheet" | "handout" | "lesson_plan" | "letter"

CONTENT RULES:
- Complete real content only — no placeholders
- Minimum 5 questions per section unless specified
- Total marks = 100 unless specified — distribute evenly
- Each content array item = ONE line only
- landscape: true ONLY for 4+ column tables — default false

MCQ: "1. Question?", "a) Option", "b) Option", "c) Option", "d) Option"
Short answer: question + 2 lines: "_______________________________________________"
Fill blank: "The ______________ is the powerhouse of the cell."
Math: "To solve 2x + 4 = 10:", "→ Subtract 4: 2x = 6", "→ Divide by 2: x = 3"

${isModification ? 'MODIFICATION: The teacher wants to update a previously generated document. Apply their changes to the existing content from the conversation history — do not regenerate from scratch.' : ''}

${wantsAnswerKey ? 'ANSWER KEY: Also include "answerKeySpec" with identical structure but containing only answers, clearly labeled.' : ''}

FORMATS:
Test/Exam/Quiz: {"type":"generic","docCategory":"test","title":"...","subtitle":"Time: X mins | Total Marks: 100","landscape":false,"sections":[{"title":"Section A: ... (X Marks)","content":[...]}],"footer_note":""}
Worksheet/Handout: {"type":"generic","docCategory":"worksheet","title":"...","subtitle":"Grade X | ...","landscape":false,"sections":[...],"footer_note":""}
Lesson Plan: {"type":"lesson_plan","title":"...","lesson":{"subject":"","grade":"","teacher":"","date":"","duration":"45 mins","unit":"","topic":"","objectives":[],"materials":[],"activities":[{"phase":"","duration":"","description":""}],"assessment":"","homework":""}}
Letter: {"type":"letter","title":"...","letter":{"to":"","from":"AECHS Administration","date":"${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}","subject":"","body":"","closing":"Sincerely,","signature":"AECHS Administration"}}`;

  // Include conversation history for context (especially for modifications)
  const contextHistory = history.slice(-10);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    system: docPrompt,
    messages: [
      ...contextHistory,
      {
        role: 'user',
        content: `Generate a ${assessmentType || 'document'} on "${topic || 'the requested topic'}" for ${grade || 'the specified grade'}.${wantsAnswerKey ? ' Include answer key.' : ''} Full request: "${body}"`
      }
    ]
  });

  const raw = response.content[0].text.trim();
  const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  // Extract JSON
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Could not parse document spec');
  const spec = JSON.parse(match[0]);

  // ── #28: Auto-fill teacher/date/subject from profile ─────────────────────
  if (profile && profile.name) {
    const teacherName = ((profile.title || '') + ' ' + profile.name).trim();
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    // Lesson plan: fill teacher + date if missing
    if (spec.lesson) {
      if (!spec.lesson.teacher) spec.lesson.teacher = teacherName;
      if (!spec.lesson.date)    spec.lesson.date    = today;
      if (!spec.lesson.subject && profile.subject) spec.lesson.subject = profile.subject;
    }

    // Letter: fill from/signature if missing
    if (spec.letter) {
      if (!spec.letter.date) spec.letter.date = today;
    }

    // Generic (test/exam/quiz/worksheet): inject teacher in subtitle if missing
    if (spec.type === 'generic' && spec.subtitle && !spec.subtitle.includes(teacherName)) {
      spec.subtitle = spec.subtitle + ' | ' + teacherName;
    }
  }

  return spec;
}

// ── Execute action ────────────────────────────────────────────────────────────
async function executeAction(parsed, from, body, profile, sendReply, sendImageReply, sendDocReply, sendTo) {
  const { action, reply, escalate, escalationNote, worksheetContent, answerKey, profileUpdates } = parsed;

  safeProfileUpdate(from, profileUpdates);

  if (escalate && sendTo) {
    pendingEscalations.set(from, body || reply);
    const name = profile && profile.name
      ? ((profile.title || '') + ' ' + profile.name).trim()
      : 'Unknown (' + from + ')';
    await sendTo(ESCALATION_NUMBER,
      '🔔 CHS.ai Escalation\nFrom: ' + name + '\nID: @' + from +
      '\nQuestion: ' + (body || '[no body]') +
      (escalationNote ? '\nNote: ' + escalationNote : '') +
      '\n\nReply with:\n/answer @' + from + ' your answer here'
    );
  }

  switch (action) {

    case 'worksheet':
      if (!worksheetContent) {
        await sendReply(reply || 'Could not generate the worksheet. Please try again.');
        return;
      }
      if (sendDocReply) {
        try {
          const teacherName = profile ? ((profile.title || '') + ' ' + (profile.name || '')).trim() : '';
          const page1Path = path.join(os.tmpdir(), 'ws_q_' + Date.now() + '.pdf');
          const page2Path = answerKey ? path.join(os.tmpdir(), 'ws_a_' + Date.now() + '.pdf') : null;
          await generateWorksheetPDF(worksheetContent, page1Path, teacherName);
          if (reply) await sendReply(reply);
          await sendDocReply(page1Path, 'worksheet.pdf', '📋 Worksheet');
          if (answerKey && page2Path) {
            await generateWorksheetPDF(answerKey, page2Path, teacherName);
            await sendDocReply(page2Path, 'answer_key.pdf', '🔑 Answer Key');
          }
        } catch (err) {
          console.error('[worksheet action]', err);
          await sendReply('⚠️ Could not generate the worksheet. Please try again.');
        }
      } else {
        await sendReply(reply || 'Worksheet generated.');
      }
      break;

    case 'document': {
      const { documentSpec, answerKeySpec } = parsed;
      if (!documentSpec) {
        await sendReply(reply || 'Could not generate the document. Please try again.');
        break;
      }
      try {
        const { generateDocument } = require('./document-generator');

        // Generate main document
        const result = await generateDocument(documentSpec);
        if (reply) await sendReply(reply);
        if (sendDocReply) {
          await sendDocReply(result.filepath, result.filename, '📄 ' + (documentSpec.title || 'Document'));
        } else {
          await sendReply('📄 ' + (documentSpec.title || 'Document') + '\n(Open the web chat to download it)');
        }

        // Generate answer key if requested
        if (answerKeySpec) {
          const keyResult = await generateDocument(answerKeySpec);
          if (sendDocReply) {
            await sendDocReply(keyResult.filepath, keyResult.filename, '🔑 Answer Key');
          } else {
            await sendReply('🔑 Answer Key ready\n(Open the web chat to download it)');
          }
        }
      } catch (err) {
        console.error('[document action]', err);
        await sendReply('⚠️ Document generation failed. Please try again.');
      }
      break;
    }

    case 'registration':
      if (parsed.registrationData) {
        // Stringify if object to avoid [object Object] in logs
        const regText = typeof parsed.registrationData === 'object'
          ? JSON.stringify(parsed.registrationData, null, 2)
          : String(parsed.registrationData);
        logRegistration(from, regText);
        if (sendTo) await sendTo(ESCALATION_NUMBER, '🆕 New Registration!\nID: ' + from + '\n\n' + regText);

        // Auto-save profile fields if present in registrationData
        if (typeof parsed.registrationData === 'object') {
          const rd = parsed.registrationData;
          const profileUpdate = {};
          if (rd.name)       profileUpdate.name       = rd.name;
          if (rd.title)      profileUpdate.title      = rd.title;
          if (rd.role)       profileUpdate.role       = rd.role;
          if (rd.phone)      profileUpdate.phone      = rd.phone;
          if (rd.department) profileUpdate.department = rd.department;
          if (rd.division)   profileUpdate.division   = rd.division;
          if (rd.subject)    profileUpdate.subject    = rd.subject;
          if (Object.keys(profileUpdate).length > 0) safeProfileUpdate(from, profileUpdate);
        }
      }
      await sendReply(reply || 'Got it! Mr. Yeghia will set you up shortly. 🙏');
      break;

    case 'escalate':
      await sendReply(reply || "I've flagged this for Mr. Yeghia — he'll get back to you shortly.");
      break;

    case 'restricted':
      // #44: Secret vault — escalate silently to owner
      if (sendTo && !isOwner(from)) {
        const _rName = profile && profile.name
          ? ((profile.title || '') + ' ' + profile.name).trim()
          : 'Unknown (' + from + ')';
        await sendTo(ESCALATION_NUMBER,
          '[RESTRICTED] REQUEST\nFrom: ' + _rName + '\nID: @' + from +
          '\nRequested: ' + (body || '[no body]').substring(0, 120)
        );
      }
      await sendReply(reply || "That information is restricted. I've flagged your request for Mr. Yeghia.");
      break;

    case 'text':
    default:
      await sendReply(reply || 'Sorry, I ran into an issue. Please try again.');
      break;
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
async function handleIncoming({ from, body, sendReply, sendImageReply, sendDocReply, sendTo, imageBase64, imageMime }) {
  console.log('IN [' + from + ']: ' + (imageBase64 ? '[IMAGE]' : body));
  logMessage({ from, body: imageBase64 ? '[IMAGE] ' + (body || '') : body, direction: 'in' });

  // Independent registration detection
  if (!isOwner(from) && !isRegistered(from) && body && looksLikeRegistrationInfo(body)) {
    logRegistration(from, body);
    if (sendTo) await sendTo(ESCALATION_NUMBER, '🆕 New Registration!\nID: ' + from + '\n\n' + body);
  }

  // ── Owner commands (bypass Claude) ───────────────────────────────────────
  if (isOwner(from) && body) {
    if (body.startsWith('/answer ')) {
      const parts = body.replace('/answer ', '').trim();
      const atIdx = parts.indexOf(' ');
      if (atIdx === -1) { await sendReply('Usage: /answer @number Your answer here'); return; }
      const target = parts.substring(0, atIdx).replace('@', '');
      const answer = parts.substring(atIdx + 1).trim();
      if (sendTo) {
        await sendTo(target, 'Mr. Yeghia responded: ' + answer);
        await sendReply('✅ Answer sent to ' + target);
        pendingEscalations.delete(target);
      }
      return;
    }
    if (body.startsWith('/setprompt '))    { basePrompt = body.replace('/setprompt ', '').trim(); await sendReply('✅ Prompt updated!'); return; }
    if (body.startsWith('/addknowledge ')) { basePrompt += '\n' + body.replace('/addknowledge ', '').trim(); await sendReply('✅ Knowledge added!'); return; }
    if (body === '/showprompt')  { await sendReply('📋 Prompt:\n\n' + basePrompt.substring(0, 1000) + '...'); return; }
    if (body === '/resetall')    { conversations.clear(); askedAnswerKey.clear(); await sendReply('✅ Conversations cleared!'); return; }
    if (body === '/stats')       { await sendReply('📊 Conversations: ' + conversations.size + '\nPending escalations: ' + pendingEscalations.size); return; }
    if (body === '/pending') {
      if (pendingEscalations.size === 0) { await sendReply('No pending escalations.'); return; }
      let msg = 'Pending:\n';
      pendingEscalations.forEach((q, n) => { msg += '\n@' + n + ': ' + q; });
      await sendReply(msg); return;
    }
    if (body === '/registrations') { await sendReply(getRegistrations()); return; }
    if (body.startsWith('/whois ')) {
      const lid = body.replace('/whois ', '').trim().replace('@', '');
      const regPath = path.join(__dirname, '..', 'logs', 'registrations.txt');
      if (fs.existsSync(regPath)) {
        const c = fs.readFileSync(regPath, 'utf8');
        const idx = c.indexOf('ID: ' + lid);
        if (idx !== -1) {
          const bStart = c.lastIndexOf('---', idx);
          const bEnd   = c.indexOf('\n---', idx);
          await sendReply('Found:\n' + c.substring(bStart, bEnd === -1 ? undefined : bEnd).trim());
        } else {
          await sendReply('No registration found for: ' + lid);
        }
      } else {
        await sendReply('No registrations file yet.');
      }
      return;
    }
    if (body === '/help' || body.toLowerCase() === 'list commands' || body.toLowerCase() === 'commands') {
      await sendReply('🔧 Owner Commands:\n\n📊 Info:\n/stats\n/pending\n/registrations\n/whois @lid\n\n💬 Bot Control:\n/answer @number text\n/resetall\n\n🧠 Training:\n/addknowledge text\n/setprompt text\n/showprompt');
      return;
    }
  }

  if (body === '/reset') { conversations.delete(from); askedAnswerKey.delete(from); await sendReply('🔄 Conversation reset!'); return; }
  if (body === '/help')  { await sendReply('CHS.ai — Your AI assistant at AECHS\n/reset — clear chat history'); return; }

  // Load or create profile
  const profile = loadProfile(from) || (isOwner(from) ? null : createProfile(from));

  // Build history
  if (!conversations.has(from)) conversations.set(from, []);
  const history = conversations.get(from);

  const userContent = imageBase64
    ? [{ type: 'image', source: { type: 'base64', media_type: imageMime || 'image/jpeg', data: imageBase64 } },
       { type: 'text', text: body && body.trim() ? body.trim() : 'Please analyze this image and help me.' }]
    : body;

  history.push({ role: 'user', content: userContent });
  if (history.length > 20) history.shift();

  try {
    // ── CALL 1: Route the message ─────────────────────────────────────────
    const routing = await routeMessage(body || '[image]', history, profile);
    console.log('[Router]', JSON.stringify(routing));

    let parsed;

    // #40: Students cannot generate documents
    const _isStudent = !isOwner(from) && profile && ((profile.role || '').toLowerCase().includes('student'));
    if (_isStudent && routing.intent === 'document') {
      parsed = { action: 'text', reply: 'Document generation is available for staff only. I can help you with homework questions, explanations, or general school information.', escalate: false, profileUpdates: {} };
    } else
    if (routing.intent === 'document') {
      const { topic, grade, assessmentType, isModification } = routing;
      const missing = [];
      if (!topic)          missing.push('topic');
      if (!grade)          missing.push('grade');
      if (!assessmentType) missing.push('assessmentType');

      // ── Missing fields → ask naturally ───────────────────────────────
      if (missing.length > 0) {
        let clarification;
        if (missing.length === 3) {
          clarification = "Sure! What topic, which grade, and is this a test, quiz, or worksheet?";
        } else if (missing.includes('topic') && missing.includes('grade')) {
          clarification = "What topic and which grade is this for?";
        } else if (missing.includes('topic') && missing.includes('assessmentType')) {
          clarification = `For Grade ${grade} — what topic, and is this a test, quiz, or worksheet?`;
        } else if (missing.includes('grade') && missing.includes('assessmentType')) {
          clarification = `Got it — which grade and is this a test, quiz, or worksheet?`;
        } else if (missing.includes('topic')) {
          clarification = "What topic should I cover?";
        } else if (missing.includes('grade')) {
          clarification = "Which grade is this for?";
        } else if (missing.includes('assessmentType')) {
          clarification = "Test, quiz, or worksheet?";
        }
        parsed = { action: 'text', reply: clarification, escalate: false, profileUpdates: {} };

      // ── All fields present but answer key not yet asked ───────────────
      } else if (routing.wantsAnswerKey === null && !askedAnswerKey.has(from) && !isModification) {
        askedAnswerKey.add(from);
        parsed = { action: 'text', reply: "Do you want an answer key generated separately as well?", escalate: false, profileUpdates: {} };

      // ── All fields present → generate document ────────────────────────
      } else {
        const wantsKey = routing.wantsAnswerKey === true ||
          /yes|yep|yeah|please|sure|yalla|okay|ok/i.test(body || '');

        const docSpec = await generateDocSpec(body, history, { ...routing, wantsAnswerKey: wantsKey }, profile);

        // Build natural reply
        const typeLabel = assessmentType || 'document';
        const replies = [
          `Here's your ${typeLabel} on ${topic} for ${grade}. 📄`,
          `Done! ${grade} ${topic} ${typeLabel} is ready. 📄`,
          `Your ${typeLabel} is ready — ${topic}, ${grade}. 📄`,
        ];
        const reply = replies[Math.floor(Math.random() * replies.length)];

        parsed = {
          action: 'document',
          reply,
          escalate: false,
          profileUpdates: {},
          documentSpec: docSpec,
          answerKeySpec: wantsKey && docSpec.answerKeySpec ? docSpec.answerKeySpec : null
        };

        // Clear the answer key tracker for this user (ready for next doc)
        askedAnswerKey.delete(from);
      }

    } else {
      // ── CALL 2: Chat/IT/escalate → focused reply ──────────────────────
      parsed = await generateReply(body, history, from, profile, routing);
    }

    // Store history as plain text (not JSON) for cleaner context
    history[history.length - 1] = { role: 'user', content: imageBase64 ? '[Image sent]' : body };
    const historyReply = parsed.action === 'document'
      ? `[Generated ${parsed.documentSpec?.docCategory || 'document'}: ${parsed.documentSpec?.title || ''}]`
      : (parsed.reply || '');
    history.push({ role: 'assistant', content: historyReply });

    console.log('OUT [' + from + '] action:' + parsed.action + ' | ' + (parsed.reply || '').substring(0, 80));
    logMessage({ from, body: parsed.reply || '', direction: 'out' });

    if (parsed.escalate) logIssue(from, (body || '').substring(0, 80));

    await executeAction(parsed, from, body, profile, sendReply, sendImageReply, sendDocReply, sendTo);

  } catch (err) {
    console.error('Handler error:', err.message);
    const is529 = err.status === 529 || (err.message && err.message.includes('overloaded'));
    if (is529) {
      await sendReply('The AI is a bit busy right now. Please try again in a few seconds. 🙏');
    } else {
      await sendReply('Sorry, ran into an issue. Try again in a moment.');
    }
  }
}

module.exports = { handleIncoming };
