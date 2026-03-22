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
const fs = require('fs');
const os = require('os');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const conversations = new Map();
const pendingEscalations = new Map();
const pendingRegistrations = new Set(); // FIX 9: re-added
const ESCALATION_NUMBER = '96170688510';

// Safe fields Claude is allowed to update in profiles
// FIX 4: protect name/role/division from Claude overwrites
const SAFE_PROFILE_FIELDS = ['languageStyle', 'devices', 'preferences', 'recentIssues'];

const OWNER_IDS = [
  '213081917517870@lid',
  '96170688510',
  '96170688510@c.us',
  '70688510',
  process.env.OWNER_NUMBER,
  process.env.ESCALATION_LID,
].filter(Boolean);

let basePrompt = process.env.BOT_SYSTEM_PROMPT || '';

function isOwner(from) {
  return OWNER_IDS.includes(from);
}

// ── Registration ──────────────────────────────────────────────────────────────
function isRegistered(from) {
  try {
    const logPath = path.join(__dirname, '..', 'logs', 'registrations.txt');
    if (!fs.existsSync(logPath)) return false;
    return fs.readFileSync(logPath, 'utf8').includes('ID: ' + from);
  } catch (e) { return false; }
}

function logRegistration(from, formData) {
  try {
    const logPath = path.join(__dirname, '..', 'logs', 'registrations.txt');
    const entry = '---\n[' + new Date().toISOString() + ']\nID: ' + from + '\n' + formData + '\n';
    fs.appendFileSync(logPath, entry);
    console.log('New registration logged: ' + from);
  } catch (e) { console.error('Registration log error:', e.message); }
}

function getRegistrations() {
  try {
    const logPath = path.join(__dirname, '..', 'logs', 'registrations.txt');
    if (!fs.existsSync(logPath)) return 'No registrations yet.';
    const content = fs.readFileSync(logPath, 'utf8').trim();
    if (!content) return 'No registrations yet.';
    const entries = content.split('---').filter(e => e.trim());
    return 'Registrations (' + entries.length + '):\n\n' + content;
  } catch (e) { return 'Error reading registrations.'; }
}

// FIX 3: detect if body looks like registration info (independent of Claude)
function looksLikeRegistrationInfo(body) {
  if (!body || body.trim().length < 15) return false;
  const lower = body.toLowerCase();
  const vague = /^(ok|okay|sure|i will|will do|later|yes|yep|yeah|alright|noted|thanks|thank you|merci|inshallah|yalla|tekram)[\s!.]*$/i;
  if (vague.test(body.trim())) return false;
  // Has a name-like pattern + role/number
  const hasRole = lower.includes('teacher') || lower.includes('coordinator') || lower.includes('head') ||
    lower.includes('principal') || lower.includes('secretary') || lower.includes('nurse') ||
    lower.includes('librarian') || lower.includes('bookstore') || lower.includes('director');
  const hasNumber = /\d{7,}/.test(body);
  return hasRole || hasNumber;
}

// ── System prompt ─────────────────────────────────────────────────────────────
function getSystemPrompt(from, profile) {
  let prompt = basePrompt;

  if (profile) prompt += buildProfileContext(profile);

  if (isOwner(from)) {
    prompt += '\n\nOWNER: This is Mr. Yeghia Boghossian, the IT Manager and bot owner. You know exactly who he is — never ask him to identify himself. He has full access to ALL information including credentials.';
    prompt += loadKnowledge();
    prompt += loadCredentials();
  } else {
    // FIX 9: only nudge if not already asked
    if ((!profile || !profile.name) && !pendingRegistrations.has(from)) {
      prompt += '\n\nUNKNOWN USER: You do not have this person on file. After helping with their request, gently ask ONCE at the end of your reply for their name, phone number, and position at school so Mr. Yeghia can set them up. Only ask in this message — never repeat in future messages.';
    }
    prompt += loadKnowledge();
  }

  return prompt;
}

// ── Parse Claude JSON response ────────────────────────────────────────────────
function parseClaudeResponse(raw) {
  // 1. Try direct parse after stripping code fences
  try {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (!parsed.action) parsed.action = 'text';
    if (!parsed.reply) parsed.reply = '';
    return parsed;
  } catch (e) {}

  // 2. Try to find first complete { ... } block
  try {
    const start = raw.indexOf('{');
    const end   = raw.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      const jsonSlice = raw.substring(start, end + 1);
      const parsed = JSON.parse(jsonSlice);
      if (!parsed.action) parsed.action = 'text';
      if (!parsed.reply) parsed.reply = '';
      console.log('JSON recovered via slice extraction');
      return parsed;
    }
  } catch (e) {}

  // 3. Return null to signal caller to retry
  console.error('JSON parse failed — signaling retry');
  return null;
}

// ── Safe profile update ───────────────────────────────────────────────────────
// FIX 4: only allow safe fields
function safeProfileUpdate(from, profileUpdates) {
  if (!profileUpdates || Object.keys(profileUpdates).length === 0) return;
  if (isOwner(from)) return;
  try {
    const safeUpdates = {};
    for (const field of SAFE_PROFILE_FIELDS) {
      if (profileUpdates[field] !== undefined) {
        safeUpdates[field] = profileUpdates[field];
      }
    }
    if (Object.keys(safeUpdates).length > 0) {
      updateProfile(from, safeUpdates);
    }
  } catch (e) { console.error('Profile update error:', e.message); }
}

// ── Execute action ────────────────────────────────────────────────────────────
async function executeAction(parsed, from, body, profile, sendReply, sendImageReply, sendDocReply, sendTo) {
  const { action, reply, escalate, escalationNote, worksheetContent, answerKey, profileUpdates } = parsed;

  // Always apply safe profile updates
  safeProfileUpdate(from, profileUpdates);

  // FIX 7: escalation always includes original body
  if (escalate && sendTo) {
    pendingEscalations.set(from, body || reply);
    const name = profile && profile.name ? ((profile.title || '') + ' ' + profile.name).trim() : 'Unknown (' + from + ')';
    await sendTo(ESCALATION_NUMBER,
      '🔔 CHS.ai Escalation\nFrom: ' + name + '\nID: @' + from +
      '\nQuestion: ' + (body || '[no body]') +
      (escalationNote ? '\nNote: ' + escalationNote : '') +
      '\n\nReply with:\n/answer @' + from + ' your answer here'
    );
    if (action !== 'escalate') {
      // Still send the reply even if escalating
    }
  }

  switch (action) {

    case 'worksheet':
      // FIX 2: graceful fallback if worksheetContent missing
      if (!worksheetContent) {
        console.error('Worksheet action but no worksheetContent — falling back to text');
        await sendReply(reply || 'Sorry, I could not generate the worksheet. Please try again.');
        return;
      }
      if (sendDocReply) {
        try {
          const teacherName = profile ? ((profile.title || '') + ' ' + (profile.name || '')).trim() : '';
          // Page 1 — Questions PDF
          const page1Path = path.join(os.tmpdir(), 'ws_q_' + Date.now() + '.pdf');
          await generateWorksheetPDF(worksheetContent, teacherName, page1Path);
          await sendDocReply(page1Path, 'Worksheet.pdf', reply || '');
          fs.unlinkSync(page1Path);
          // Page 2 — Answer Key PDF
          if (answerKey) {
            const page2Path = path.join(os.tmpdir(), 'ws_a_' + Date.now() + '.pdf');
            await generateWorksheetPDF(answerKey, teacherName, page2Path);
            await sendDocReply(page2Path, 'Answer_Key.pdf', '📋 Answer Key — Teacher Copy');
            fs.unlinkSync(page2Path);
          }
        } catch (imgErr) {
          console.error('Worksheet PDF error:', imgErr.message);
          await sendReply((reply || '') + '\n\n' + worksheetContent + (answerKey ? '\n\n--- ANSWER KEY ---\n' + answerKey : ''));
        }
      } else {
        await sendReply((reply || '') + '\n\n' + worksheetContent);
      }
      break;

    case 'image':
      // FIX 8: image not ready — inform clearly
      await sendReply('Image generation is not yet available. I\'ll let you know when it\'s ready! In the meantime, ' + (reply || 'please try a different request.'));
      break;

    case 'restricted':
      await sendReply('This information is currently restricted. Please contact Mr. Yeghia directly for access.');
      break;

    case 'escalate':
      await sendReply(reply || 'Let me verify this with Mr. Yeghia and get back to you shortly.');
      break;

    case 'registration':
      // FIX 3: log registration regardless
      if (!isRegistered(from)) {
        logRegistration(from, parsed.registrationData || body || reply);
        if (sendTo) await sendTo(ESCALATION_NUMBER, '🆕 New Registration!\nID: ' + from + '\n\n' + (parsed.registrationData || body || ''));
      }
      await sendReply(reply || 'Thank you! Mr. Yeghia will activate your access shortly. 🙏');
      break;

    case 'document': {
      const { documentSpec } = parsed;
      if (!documentSpec) {
        await sendReply(reply || 'Sorry, I could not generate the document. Please try again.');
        break;
      }
      try {
        const { generateDocument } = require('./document-generator');
        const result = await generateDocument(documentSpec);
        if (reply) await sendReply(reply);
        if (sendDocReply) {
          await sendDocReply(result.filepath, result.filename, '📄 ' + (documentSpec.title || 'Document'));
        } else {
          await sendReply('📄 Document ready: ' + result.filename + '\n(Open the web chat to download it)');
        }
      } catch (err) {
        console.error('[document action]', err);
        await sendReply('⚠️ Document generation failed. Please try again.');
      }
      break;
    }

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

  // FIX 3: independent registration detection — regardless of what Claude does
  if (!isOwner(from) && !isRegistered(from) && body && looksLikeRegistrationInfo(body)) {
    if (!pendingRegistrations.has(from)) {
      // First message — mark as pending, Claude will ask for details
      pendingRegistrations.add(from);
    } else {
      // They shared info — log it
      logRegistration(from, body);
      pendingRegistrations.delete(from);
      if (sendTo) await sendTo(ESCALATION_NUMBER, '🆕 New Registration!\nID: ' + from + '\n\n' + body);
    }
  }

  // ── Owner commands (bypass Claude) ───────────────────────────────────────
  if (isOwner(from) && body) {
    if (body.startsWith('/answer ')) {
      const parts = body.replace('/answer ', '').trim();
      const atIndex = parts.indexOf(' ');
      if (atIndex === -1) { await sendReply('Usage: /answer @number Your answer here'); return; }
      const targetNumber = parts.substring(0, atIndex).replace('@', '');
      const answer = parts.substring(atIndex + 1).trim();
      if (sendTo) {
        await sendTo(targetNumber, 'Mr. Yeghia responded: ' + answer);
        await sendReply('✅ Answer sent to ' + targetNumber);
        pendingEscalations.delete(targetNumber);
      }
      return;
    }
    if (body.startsWith('/setprompt ')) { basePrompt = body.replace('/setprompt ', '').trim(); await sendReply('✅ Prompt updated!'); return; }
    if (body.startsWith('/addknowledge ')) { basePrompt += '\n' + body.replace('/addknowledge ', '').trim(); await sendReply('✅ Knowledge added!'); return; }
    if (body === '/showprompt') { await sendReply('📋 Prompt:\n\n' + basePrompt.substring(0, 1000) + '...'); return; }
    if (body === '/resetall') { conversations.clear(); await sendReply('✅ Conversations cleared!'); return; }
    if (body === '/stats') { await sendReply('📊 Conversations: ' + conversations.size + '\nPending escalations: ' + pendingEscalations.size); return; }
    if (body === '/pending') {
      if (pendingEscalations.size === 0) { await sendReply('No pending escalations.'); return; }
      let msg = 'Pending:\n';
      pendingEscalations.forEach((q, num) => { msg += '\n@' + num + ': ' + q; });
      await sendReply(msg); return;
    }
    if (body === '/registrations') { await sendReply(getRegistrations()); return; }
    // FIX 6: whois uses ID: pattern
    if (body.startsWith('/whois ')) {
      const lid = body.replace('/whois ', '').trim().replace('@', '');
      const regPath = path.join(__dirname, '..', 'logs', 'registrations.txt');
      if (fs.existsSync(regPath)) {
        const content = fs.readFileSync(regPath, 'utf8');
        const pattern = 'ID: ' + lid;
        const idx = content.indexOf(pattern);
        if (idx !== -1) {
          const blockStart = content.lastIndexOf('---', idx);
          const blockEnd = content.indexOf('\n---', idx);
          const block = content.substring(blockStart, blockEnd === -1 ? undefined : blockEnd);
          await sendReply('Found:\n' + block.trim());
        } else {
          await sendReply('No registration found for: ' + lid);
        }
      } else {
        await sendReply('No registrations file yet.');
      }
      return;
    }
    if (body === '/help' || body.toLowerCase() === 'list commands' || body.toLowerCase() === 'commands') {
      await sendReply('🔧 Owner Commands:\n\n📊 Info:\n/stats — active conversations & escalations\n/pending — unanswered escalations\n/registrations — all registered staff\n/whois @lid — look up a WhatsApp ID\n\n💬 Bot Control:\n/answer @number text — reply to a teacher\n/resetall — clear all conversations\n\n🧠 Training:\n/addknowledge text — add knowledge\n/setprompt text — replace system prompt\n/showprompt — view current prompt');
      return;
    }
  }

  // General commands
  if (body === '/reset') { conversations.delete(from); await sendReply('🔄 Conversation reset!'); return; }
  if (body === '/help') { await sendReply('CHS.ai — Your AI assistant at AECHS\n/reset — clear chat history\n/help — show commands'); return; }

  // Load or create profile
  const profile = loadProfile(from) || (isOwner(from) ? null : createProfile(from));

  // Build history
  if (!conversations.has(from)) conversations.set(from, []);
  const history = conversations.get(from);

  let userContent;
  if (imageBase64) {
    userContent = [
      { type: 'image', source: { type: 'base64', media_type: imageMime || 'image/jpeg', data: imageBase64 } },
      { type: 'text', text: body && body.trim() ? body.trim() : 'Please analyze this image and help me.' }
    ];
  } else {
    userContent = body;
  }

  history.push({ role: 'user', content: userContent });
  if (history.length > 20) history.shift();

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: getSystemPrompt(from, profile),
      messages: history,
    });

    const raw = response.content[0].text;
    console.log('=== RAW CLAUDE OUTPUT ===\n', raw, '\n=== END ===');
    let parsed = parseClaudeResponse(raw);

    // If JSON failed, retry with explicit instruction
    if (!parsed) {
      console.log('Retrying with JSON-enforcement prompt...');
      const retryMessages = [
        ...history.slice(0, -1),
        { role: 'user', content: (imageBase64 ? '[Image sent] ' : '') + (body || '') },
        { role: 'assistant', content: raw },
        { role: 'user', content: 'Your previous response was not valid JSON. You MUST respond with ONLY a raw JSON object, no other text. Start your response with { and end with }.' }
      ];
      const retryResponse = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: getSystemPrompt(from, profile),
        messages: retryMessages,
      });
      parsed = parseClaudeResponse(retryResponse.content[0].text);
    }

    // Final fallback if still broken
    if (!parsed) {
      parsed = { action: 'text', reply: 'Sorry, I ran into an issue generating that. Please try again.', escalate: false };
    }

    // FIX 5: store meaningful history entry
    history[history.length - 1] = { role: 'user', content: imageBase64 ? '[Image sent]' : body };
    const historyReply = parsed.action === 'worksheet'
      ? '[Generated worksheet: ' + (parsed.reply || '') + ']'
      : (parsed.reply || raw);
    history.push({ role: 'assistant', content: historyReply });

    console.log('OUT [' + from + '] action:' + parsed.action + ' | ' + (parsed.reply || '').substring(0, 80));
    logMessage({ from, body: parsed.reply || '', direction: 'out' });

    if (parsed.escalate) logIssue(from, (body || '').substring(0, 80));

    await executeAction(parsed, from, body, profile, sendReply, sendImageReply, sendDocReply, sendTo);

  } catch (err) {
    console.error('Claude error:', err.message);
    await sendReply('Sorry, I ran into an issue. Please try again.');
  }
}

module.exports = { handleIncoming };
