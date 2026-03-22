const express = require('express');
const router = express.Router();
const { getLogs } = require('../core/logger');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');

const KNOWLEDGE_DIR = path.join(__dirname, '..', 'knowledge');

// Ensure knowledge dir exists
if (!fs.existsSync(KNOWLEDGE_DIR)) fs.mkdirSync(KNOWLEDGE_DIR);

// Dashboard UI
router.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// Admin UI (Users + Knowledge Base combined)
router.get('/train', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
router.get('/users', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
router.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

// Logs API
router.get('/api/logs', (req, res) => res.json(getLogs()));

// GET knowledge file as JSON
router.get('/api/knowledge/:file', (req, res) => {
  const file = req.params.file.replace(/[^a-z0-9_-]/gi, '');
  const filePath = path.join(KNOWLEDGE_DIR, file + '.xlsx');
  if (!fs.existsSync(filePath)) return res.json([]);
  try {
    const wb = xlsx.readFile(filePath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(ws);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST knowledge file (save JSON back to xlsx)
router.post('/api/knowledge/:file', (req, res) => {
  const file = req.params.file.replace(/[^a-z0-9_-]/gi, '');
  const filePath = path.join(KNOWLEDGE_DIR, file + '.xlsx');
  try {
    const rows = req.body;
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(rows);
    xlsx.utils.book_append_sheet(wb, ws, file);
    xlsx.writeFile(wb, filePath);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Chat UI
router.get('/chat', (req, res) => res.sendFile(path.join(__dirname, 'chat.html')));

// Users UI
router.get('/users', (req, res) => res.sendFile(path.join(__dirname, 'users.html')));

// ── Users API ──────────────────────────────────────────
const USERS_FILE = path.join(__dirname, '..', 'knowledge', 'users.xlsx');

function readUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  try {
    const wb = xlsx.readFile(USERS_FILE);
    const ws = wb.Sheets[wb.SheetNames[0]];
    return xlsx.utils.sheet_to_json(ws);
  } catch { return []; }
}

function writeUsers(users) {
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(users);
  xlsx.utils.book_append_sheet(wb, ws, 'users');
  xlsx.writeFile(wb, USERS_FILE);
}

// GET all users
router.get('/api/users', (req, res) => {
  res.json(readUsers());
});

// POST add user
router.post('/api/users', (req, res) => {
  try {
    const { name, code } = req.body;
    if (!name || !code) return res.status(400).json({ error: 'Name and code required.' });
    const users = readUsers();
    if (users.find(u => u.code === code)) return res.status(400).json({ error: 'Code already exists.' });
    users.push({ name, code });
    writeUsers(users);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE user by code
router.delete('/api/users/:code', (req, res) => {
  try {
    const code = decodeURIComponent(req.params.code);
    const users = readUsers().filter(u => u.code !== code);
    writeUsers(users);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Claude API proxy
router.post('/api/chat', async (req, res) => {
  try {
    const { messages, system } = req.body;
    const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system,
        messages
      })
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Memory API (owner only) ─────────────────────────────
const MEMORY_DIR  = path.join(__dirname, '..', 'memory');
const MEMORY_FILE = path.join(__dirname, '..', 'memory', 'yeghia.json');
const OWNER_CODE  = process.env.OWNER_WEB_CODE || 'CHS2526';

if (!fs.existsSync(MEMORY_DIR)) fs.mkdirSync(MEMORY_DIR);

function readMemory() {
  if (!fs.existsSync(MEMORY_FILE)) return { facts: [], preferences: [], issues: [], updatedAt: null };
  try { return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8')); }
  catch { return { facts: [], preferences: [], issues: [], updatedAt: null }; }
}

function writeMemory(data) {
  data.updatedAt = new Date().toISOString();
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(data, null, 2));
}

// GET memory
router.get('/api/memory', (req, res) => {
  if (req.query.code !== OWNER_CODE) return res.status(403).json({ error: 'Unauthorized' });
  res.json(readMemory());
});

// POST add memory entry
router.post('/api/memory', (req, res) => {
  const { code, type, content } = req.body;
  if (code !== OWNER_CODE) return res.status(403).json({ error: 'Unauthorized' });
  if (!content) return res.status(400).json({ error: 'Content required' });
  const mem = readMemory();
  const validType = ['facts','preferences','issues'].includes(type) ? type : 'facts';
  mem[validType].push({ content, addedAt: new Date().toISOString() });
  writeMemory(mem);
  res.json({ ok: true });
});

// DELETE memory entry
router.delete('/api/memory/:type/:index', (req, res) => {
  const code = req.body?.code || req.query?.code;
  if (code !== OWNER_CODE) return res.status(403).json({ error: 'Unauthorized' });
  const { type, index } = req.params;
  const mem = readMemory();
  if (mem[type] && mem[type][+index] !== undefined) {
    mem[type].splice(+index, 1);
    writeMemory(mem);
  }
  res.json({ ok: true });
});

// POST auto-extract memory from conversation
router.post('/api/memory/extract', async (req, res) => {
  const { code, message, reply } = req.body;
  if (code !== OWNER_CODE) return res.status(403).json({ error: 'Unauthorized' });
  try {
    const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: `Extract memorable facts from conversations. Given a user message and assistant reply, extract any facts worth remembering about the user (preferences, decisions, IT issues, personal facts). Return ONLY a JSON array of strings, or [] if nothing worth remembering. Example: ["Prefers dark mode","Has a Dell laptop","Working on camera setup"]`,
        messages: [{ role: 'user', content: `User: "${message}"\nAssistant: "${reply}"\n\nExtract as JSON array:` }]
      })
    });
    const data = await response.json();
    const text = data.content?.[0]?.text || '[]';
    const facts = JSON.parse(text.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim());
    if (facts.length > 0) {
      const mem = readMemory();
      for (const f of facts) mem.facts.push({ content: f, addedAt: new Date().toISOString(), auto: true });
      writeMemory(mem);
    }
    res.json({ ok: true, extracted: facts });
  } catch (e) {
    res.json({ ok: true, extracted: [] });
  }
});


// ── Document Generator ─────────────────────────────────────────────────────
const { generateDocument } = require('../core/document-generator');
const GENERATED_DIR = require('path').join(__dirname, '..', 'generated_docs');
if (!fs.existsSync(GENERATED_DIR)) fs.mkdirSync(GENERATED_DIR, { recursive: true });

// POST /api/generate — build a .docx from Claude's documentSpec
router.post('/api/generate', async (req, res) => {
  try {
    const { documentSpec } = req.body;
    if (!documentSpec) return res.status(400).json({ error: 'Missing documentSpec' });
    const result = await generateDocument(documentSpec);
    res.json({ success: true, filename: result.filename, downloadPath: result.downloadPath, title: documentSpec.title || 'Document' });
  } catch (err) {
    console.error('[/api/generate]', err);
    res.status(500).json({ error: 'Document generation failed', detail: err.message });
  }
});

// GET /api/download/:filename — serve the generated .docx
router.get('/api/download/:filename', (req, res) => {
  const { filename } = req.params;
  if (!/^[\w\-\.]+\.docx$/.test(filename)) return res.status(400).send('Invalid filename');
  const filepath = path.join(GENERATED_DIR, filename);
  if (!fs.existsSync(filepath)) return res.status(404).send('File not found or expired');
  res.download(filepath, filename, err => { if (err && !res.headersSent) res.status(500).send('Download failed'); });
});


// POST /api/generate-from-prompt — Claude generates doc spec server-side
router.post('/api/generate-from-prompt', async (req, res) => {
  try {
    const { userRequest } = req.body;
    if (!userRequest) return res.status(400).json({ error: 'Missing userRequest' });

    const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

    const docSystem = `You are a professional AECHS document-spec generator for Word documents.
Return ONLY valid JSON. No markdown. No commentary.

GENERAL RULES:
- Always generate COMPLETE real content.
- Respect the user's requested format, page count, and grade level.
- For Grades 7–8 in Lebanon, use simple school-friendly language, short lines, and minimal theory.
- If the request is class explanatory material, worksheet, reference sheet, main-points sheet, handout, or summary sheet, set documentRole: "class_material".
- If the request is a quiz or test, set documentRole: "assessment_content".
- For quizzes/tests, the cover page may be added separately, so the generated questionnaire pages must start directly with sections and questions. Do NOT include school name, title page text, or intro paragraphs inside the content.
- If the prompt explicitly asks for more than one concept on the same page, keep all requested concepts as separate sections. Do not silently drop later concepts.
- For wide comparison tables with 4+ columns only, set landscape:true. Otherwise use portrait.

CLASS MATERIAL / REFERENCE FORMAT:
{"type":"generic","documentRole":"class_material","title":"GRADE 8 MATHEMATICS: SOLVING EQUATIONS","subtitle":"CHAPTER SUMMARY: LINEAR AND QUADRATIC EQUATIONS","chapter":"CHAPTER: SOLVING EQUATIONS","landscape":false,"sections":[{"title":"Part A: Linear Equations in the form ax = b","content":["Key Concepts:","• a is the coefficient","• x is the variable","• b is the constant term","","Steps to Solve ax = b:","1. Divide both sides by a","2. Write the answer for x","","Examples:","• 3x = 12 → x = 4"]},{"title":"Part B: Equations in the form (ax + b)(cx + d) = 0","content":["Key Idea:","• Use the Zero Product Property","","Steps:","1. Set each factor equal to 0","2. Solve each equation separately","","Examples:","• (x + 3)(x - 2) = 0 → x = -3 or x = 2"]}],"footer_note":"Remember: check your answers."}

QUIZ / TEST CONTENT FORMAT:
{"type":"generic","documentRole":"assessment_content","title":"Math Quiz Grade 7","subtitle":"Powers and Roots","landscape":false,"sections":[{"title":"SECTION A: MULTIPLE CHOICE QUESTIONS (40 MARKS)","content":["1. What is 2^3?","a) 6","b) 8","c) 9","d) 12","","2. What is the square root of 64?","a) 6","b) 7","c) 8","d) 9"]},{"title":"SECTION B: SHORT ANSWER (30 MARKS)","content":["1. Evaluate 2^5","_______________________________________________","_______________________________________________"]}]}

LESSON PLAN FORMAT:
{"type":"lesson_plan","title":"...","lesson":{"subject":"","grade":"","teacher":"","date":"","duration":"45 mins","unit":"","topic":"","objectives":["...","...","...","..."],"materials":["...","...","..."],"activities":[{"phase":"Hook","duration":"5 mins","description":"..."},{"phase":"Direct Instruction","duration":"15 mins","description":"..."},{"phase":"Guided Practice","duration":"15 mins","description":"..."},{"phase":"Closure","duration":"10 mins","description":"..."}],"assessment":"...","homework":"","notes":""}}

LETTER / CIRCULAR FORMAT:
{"type":"letter","title":"...","letter":{"to":"Parents/Guardians","from":"AECHS Administration","date":"${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}","subject":"...","body":"full multi-paragraph letter body\nSecond paragraph here.","closing":"Sincerely,","signature":"AECHS Administration"}}

GENERIC FORMAT:
{"type":"generic","title":"...","subtitle":"...","chapter":"","documentRole":"class_material","landscape":false,"sections":[{"title":"...","content":["line 1","line 2"]}],"footer_note":""}

QUIZ / TEST RULES:
- Minimum 5 questions per section unless the user specifies fewer.
- MCQ options must be separate array items labeled a) b) c) d).
- Short answer questions must include two writing lines as separate items: "_______________________________________________".
- Total marks must add up to 100 unless the user specifies otherwise.
- Distribute marks evenly.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: docSystem,
        messages: [{ role: 'user', content: userRequest }]
      })
    });

    const data = await response.json();
    const raw = data.content?.[0]?.text || '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'Could not parse document spec from Claude' });

    const documentSpec = JSON.parse(jsonMatch[0]);
    const result = await generateDocument(documentSpec);

    res.json({ success: true, filename: result.filename, downloadPath: result.downloadPath, title: documentSpec.title || 'Document' });
  } catch (err) {
    console.error('[/api/generate-from-prompt]', err);
    res.status(500).json({ error: 'Document generation failed', detail: err.message });
  }
});

module.exports = router;
