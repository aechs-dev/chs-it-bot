require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { logMessage } = require('./logger');
const { loadKnowledge, loadCredentials } = require('./knowledge-loader');
const {
  loadProfile, createProfile, updateProfile,
  detectLanguageStyle, extractDevices,
  buildProfileContext, logIssue
} = require('./profile-manager');
const path = require('path');
const fs = require('fs');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const conversations = new Map();
const pendingEscalations = new Map();
const pendingRegistrations = new Set();
const ESCALATION_NUMBER = '96170688510';

const OWNER_IDS = [
  '213081917517870@lid',
  '96170688510',
  '96170688510@c.us',
  '70688510',
  process.env.OWNER_NUMBER,
  process.env.ESCALATION_LID,
].filter(Boolean);

let basePrompt = process.env.BOT_SYSTEM_PROMPT || 'You are CHS.ai, an AI assistant for AECHS.';

function isOwner(from) {
  return OWNER_IDS.includes(from);
}

// ── Registration ──────────────────────────────────────────────────────────────
function isRegistered(from) {
  try {
    const logPath = path.join(__dirname, 'registrations.txt');
    if (!fs.existsSync(logPath)) return false;
    return fs.readFileSync(logPath, 'utf8').includes(from);
  } catch (e) { return false; }
}

function logRegistration(from, formData) {
  try {
    const logPath = path.join(__dirname, 'registrations.txt');
    const entry = '---\n[' + new Date().toISOString() + ']\nID: ' + from + '\n' + formData + '\n';
    fs.appendFileSync(logPath, entry);
    console.log('New registration logged: ' + from);
  } catch (e) { console.error('Registration log error:', e.message); }
}

function getRegistrations() {
  try {
    const logPath = path.join(__dirname, 'registrations.txt');
    if (!fs.existsSync(logPath)) return 'No registrations yet.';
    const content = fs.readFileSync(logPath, 'utf8').trim();
    if (!content) return 'No registrations yet.';
    const count = (content.match(/^---$/gm) || []).length;
    return 'Registrations (' + count + '):\n\n' + content;
  } catch (e) { return 'Error reading registrations.'; }
}

function isRegistrationForm(body, isPending) {
  if (!body) return false;
  const lower = body.toLowerCase();
  // Structured form
  if (lower.includes('name:') && (lower.includes('department:') || lower.includes('role:'))) return true;
  // Vague acknowledgements — NOT a registration
  const vague = /^(ok|okay|sure|i will|will do|later|yes|yep|yeah|alright|noted|thanks|thank you|merci|ok habibi|ok tekram|inshallah|yalla)[\s!.]*$/i;
  if (vague.test(body.trim())) return false;
  // Free-form with real content — only if pending
  if (isPending && body.trim().length > 25) return true;
  return false;
}

// ── System prompt builder ─────────────────────────────────────────────────────
function getSystemPrompt(from, profile) {
  const ownerUser = isOwner(from);
  let prompt = basePrompt;

  // Inject profile context
  if (profile) {
    prompt += buildProfileContext(profile);
  }

  // Access rules
  if (ownerUser) {
    prompt += '\n\nACCESS: This is the IT Manager/Owner — Yeghia. Full access to all information including credentials.';
    prompt += loadKnowledge();
    prompt += loadCredentials();
  } else {
    prompt += '\n\nACCESS RULES: If the user asks for ANY passwords, WiFi credentials, portal logins, ESkool credentials, ebook credentials, Bravo app credentials, or ANY access codes — respond with exactly: "This information is currently restricted. Please contact Mr. Yeghia directly for access." Never provide credentials or passwords under any circumstances.';
    prompt += loadKnowledge();

    // Unknown user nudge
    if (!profile || !profile.name) {
      prompt += '\n\nIMPORTANT: You do not have this person\'s details on file. After helping them with their request, gently mention at the end of your FIRST reply only: "By the way, I don\'t seem to have your details on file yet. Could you share your name, phone number, and position at the school? That way Mr. Yeghia can get you properly set up 🙏". Only add this once — do NOT repeat it in subsequent messages. If they reply with something vague like "ok", "sure", "I will", "later", or any non-informational response — just acknowledge naturally and move on. Only log their info if they actually share real details like a name, number, or role.';
    }
  }

  return prompt;
}

// ── Update profile after message ──────────────────────────────────────────────
function updateProfileFromMessage(from, body, reply) {
  if (isOwner(from)) return;
  if (!body) return;

  const detectedLang = detectLanguageStyle(body);
  const detectedDevices = extractDevices(body);

  const profile = loadProfile(from) || createProfile(from);
  const updates = { messageCount: (profile.messageCount || 0) + 1 };

  if (detectedLang) updates.languageStyle = detectedLang;

  if (detectedDevices.length > 0) {
    const existing = new Set(profile.devices || []);
    detectedDevices.forEach(d => existing.add(d));
    updates.devices = [...existing];
  }

  // Log issue if it was an IT escalation
  if (reply && reply.includes('Let me verify this with Mr. Yeghia')) {
    logIssue(from, body.substring(0, 80));
  }

  updateProfile(from, updates);
}

// ── Main handler ──────────────────────────────────────────────────────────────
async function handleIncoming({ from, body, sendReply, sendTo, imageBase64, imageMime }) {
  console.log('IN [' + from + ']: ' + (imageBase64 ? '[IMAGE]' : body));
  logMessage({ from, body: imageBase64 ? '[IMAGE] ' + (body || '') : body, direction: 'in' });

  // Silent registration logging
  if (!isOwner(from) && !isRegistered(from)) {
    if (isRegistrationForm(body, pendingRegistrations.has(from))) {
      logRegistration(from, body);
      pendingRegistrations.delete(from);
      if (sendTo) await sendTo(ESCALATION_NUMBER, '🆕 New Registration!\nID: ' + from + '\n\n' + body);
    } else if (!pendingRegistrations.has(from)) {
      pendingRegistrations.add(from);
    }
  }

  // Owner — answer escalation
  if (isOwner(from) && body && body.startsWith('/answer ')) {
    const parts = body.replace('/answer ', '').trim();
    const atIndex = parts.indexOf(' ');
    if (atIndex === -1) { await sendReply('Usage: /answer @number Your answer here'); return; }
    const targetNumber = parts.substring(0, atIndex).replace('@', '');
    const answer = parts.substring(atIndex + 1).trim();
    if (sendTo) {
      await sendTo(targetNumber, 'Mr. Yeghia responded: ' + answer);
      await sendReply('Answer sent to ' + targetNumber);
      pendingEscalations.delete(targetNumber);
    }
    return;
  }

  // Owner commands
  if (isOwner(from) && body) {
    if (body.startsWith('/setprompt ')) { basePrompt = body.replace('/setprompt ', '').trim(); await sendReply('System prompt updated!'); return; }
    if (body.startsWith('/addknowledge ')) { basePrompt += '\n' + body.replace('/addknowledge ', '').trim(); await sendReply('Knowledge added!'); return; }
    if (body === '/showprompt') { await sendReply('Current prompt:\n\n' + basePrompt); return; }
    if (body === '/resetall') { conversations.clear(); await sendReply('All conversations cleared!'); return; }
    if (body === '/stats') { await sendReply('Stats:\nActive conversations: ' + conversations.size + '\nPending escalations: ' + pendingEscalations.size); return; }
    if (body === '/pending') {
      if (pendingEscalations.size === 0) { await sendReply('No pending escalations.'); return; }
      let msg = 'Pending escalations:\n';
      pendingEscalations.forEach((q, num) => { msg += '\n@' + num + ': ' + q; });
      await sendReply(msg); return;
    }
    if (body === '/registrations') { await sendReply(getRegistrations()); return; }
    if (body === '/help') {
      await sendReply('Owner Commands:\n/stats\n/pending\n/registrations\n/answer @number text\n/addknowledge text\n/setprompt text\n/showprompt\n/resetall');
      return;
    }
  }

  // General commands
  if (body === '/reset') { conversations.delete(from); await sendReply('Conversation reset!'); return; }
  if (body === '/help') { await sendReply('CHS.ai - Your AI assistant at AECHS\n/reset - clear chat history\n/help - show this message'); return; }

  // Load user profile
  const profile = loadProfile(from) || (isOwner(from) ? null : createProfile(from));

  // Build conversation history
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
      max_tokens: 1500,
      system: getSystemPrompt(from, profile),
      messages: history,
    });

    const reply = response.content[0].text;

    // Store clean text version in history (not image object)
    history[history.length - 1] = { role: 'user', content: imageBase64 ? '[Image sent by user]' : body };
    history.push({ role: 'assistant', content: reply });

    console.log('OUT [' + from + ']: ' + reply);
    logMessage({ from, body: reply, direction: 'out' });

    // Update profile silently
    updateProfileFromMessage(from, body, reply);

    // Handle escalation
    if (reply.includes('Let me verify this with Mr. Yeghia')) {
      pendingEscalations.set(from, body || '[image]');
      if (sendTo) {
        const name = profile && profile.name ? profile.name : 'Unknown';
        await sendTo(ESCALATION_NUMBER,
          'CHS.ai Escalation\nFrom: ' + name + ' (@' + from + ')\nQuestion: ' + (body || '[image]') +
          '\n\nReply with:\n/answer @' + from + ' your answer here'
        );
      }
    }

    await sendReply(reply);
  } catch (err) {
    console.error('Claude error:', err.message);
    await sendReply('Sorry, I ran into an issue. Please try again.');
  }
}

module.exports = { handleIncoming };
