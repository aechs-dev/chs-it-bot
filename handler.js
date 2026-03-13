require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { logMessage } = require('./logger');
const { loadKnowledge } = require('./knowledge-loader');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const conversations = new Map();
const pendingEscalations = new Map();
const ESCALATION_NUMBER = '96170688510';

// HARDCODED OWNER IDs — never blocked
const OWNER_IDS = [
  '213081917517870@lid',
  '96170688510',
  '96170688510@c.us',
  '70688510',
  process.env.OWNER_NUMBER,
  process.env.ESCALATION_LID,
].filter(Boolean);

let basePrompt = process.env.BOT_SYSTEM_PROMPT || 'You are CHS.ai, an IT support assistant.';

function isOwner(from) {
  return OWNER_IDS.includes(from);
}

// ── Unknown contact logger ────────────────────────────────────────────────────
function logUnknownContact(from) {
  try {
    const logPath = path.join(__dirname, 'unknown_contacts.txt');
    const existing = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : '';
    if (existing.includes(from)) return;
    const entry = '[' + new Date().toISOString() + '] ' + from + '\n';
    fs.appendFileSync(logPath, entry);
    console.log('Unknown contact logged: ' + from);
  } catch (e) {
    console.error('Log error:', e.message);
  }
}

function getUnknownContacts() {
  try {
    const logPath = path.join(__dirname, 'unknown_contacts.txt');
    if (!fs.existsSync(logPath)) return 'No unknown contacts yet.';
    const lines = fs.readFileSync(logPath, 'utf8').trim().split('\n').filter(Boolean);
    if (lines.length === 0) return 'No unknown contacts yet.';
    return 'Unknown contacts (' + lines.length + '):\n\n' + lines.join('\n') + '\n\nAdd them to staff.xlsx with their exact ID shown above.';
  } catch (e) {
    return 'Error reading unknown contacts.';
  }
}

// ── Staff registry ────────────────────────────────────────────────────────────
function getStaffRegistry() {
  try {
    const filePath = path.join(__dirname, 'knowledge', 'staff.xlsx');
    if (!fs.existsSync(filePath)) return [];
    const wb = xlsx.readFile(filePath);
    return xlsx.utils.sheet_to_json(wb.Sheets['Staff'] || wb.Sheets[wb.SheetNames[0]]);
  } catch (e) {
    console.error('Staff registry error:', e.message);
    return [];
  }
}

function getStaffMember(from) {
  const registry = getStaffRegistry();
  return registry.find(r => {
    const regId = String(r.WhatsAppID || r.Number || '').replace(/\s/g, '');
    return regId === from;
  }) || null;
}

// ── Access context ────────────────────────────────────────────────────────────
function getAccessContext(staff) {
  if (!staff) {
    return '\n\nACCESS: Full access - this is the bot owner/IT manager.';
  }

  const level = String(staff.Level || '7');
  const name = staff.Name || 'this staff member';
  const dept = staff.Department || '';
  const subject = staff.Subject || '';

  let access = '\n\nSTAFF INFO: You are speaking with ' + name + ', ' + (staff.Role || '') + (dept ? ' (' + dept + ')' : '') + '. Clearance level: ' + level + '.';

  if (level === '1' || level === '2') {
    access += '\nACCESS: Full access to all information.';
  } else if (level === '3a') {
    access += '\nACCESS: General IT, teacher WiFi, all ESkool, all E-Books and Bravo Bravo credentials. NO office WiFi, NO admin passwords.';
  } else if (level === '3b') {
    access += '\nACCESS: General IT and office WiFi only. NO ESkool, NO teacher credentials, NO platform info.';
  } else if (level === '4') {
    access += '\nACCESS: General IT, teacher WiFi, ESkool for ' + dept + ' department only, E-Books/Bravo for ' + dept + ' department only.';
  } else if (level === '5') {
    access += '\nACCESS: General IT, teacher WiFi, ESkool for ' + subject + ' subject across all departments, E-Books/Bravo for ' + subject + ' subject only.';
  } else if (level === '6') {
    access += '\nACCESS: General IT and teacher WiFi only. Role-specific help for ' + (staff.Role || 'their role') + '.';
  } else {
    access += '\nACCESS: General IT, teacher WiFi, their own ESkool credentials only, their own E-Books/Bravo credentials only. Do NOT share other teachers credentials.';
  }

  return access;
}

function getSystemPrompt(staff) {
  return basePrompt + getAccessContext(staff) + loadKnowledge();
}

// ── Main handler ──────────────────────────────────────────────────────────────
async function handleIncoming({ from, body, sendReply, sendTo, imageBase64, imageMime }) {
  console.log('IN [' + from + ']: ' + (imageBase64 ? '[IMAGE]' : body));
  console.log('isOwner check: ' + isOwner(from));
  logMessage({ from, body: imageBase64 ? '[IMAGE] ' + (body || '') : body, direction: 'in' });

  // Owner answering an escalation
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
    if (body === '/unknown') { await sendReply(getUnknownContacts()); return; }
    if (body === '/clearunknown') {
      const logPath = path.join(__dirname, 'unknown_contacts.txt');
      if (fs.existsSync(logPath)) fs.unlinkSync(logPath);
      await sendReply('Unknown contacts log cleared.');
      return;
    }
    if (body === '/help') {
      await sendReply('Owner Commands:\n/stats\n/pending\n/unknown\n/clearunknown\n/answer @number text\n/addknowledge text\n/setprompt text\n/showprompt\n/resetall');
      return;
    }
  }

  // General commands
  if (body === '/reset') { conversations.delete(from); await sendReply('Conversation reset!'); return; }
  if (body === '/help') { await sendReply('CHS.ai Commands:\n/reset - clear your chat history\n/help - show this message'); return; }

  // Look up staff member
  const staff = getStaffMember(from);

  // Unknown number — log and redirect (but never block owner)
  if (!staff && !isOwner(from)) {
    logUnknownContact(from);
    await sendReply('This is an internal IT support bot for AECHS staff only. For general inquiries please contact us at info@aechs.com');
    console.log('Blocked unknown: ' + from);
    return;
  }

  // Build conversation history
  if (!conversations.has(from)) conversations.set(from, []);
  const history = conversations.get(from);

  let userContent;
  if (imageBase64) {
    userContent = [
      { type: 'image', source: { type: 'base64', media_type: imageMime || 'image/jpeg', data: imageBase64 } },
      { type: 'text', text: body && body.trim() ? body.trim() : 'I sent you an image of an IT issue. Please analyze it and help me fix it.' }
    ];
  } else {
    userContent = body;
  }

  history.push({ role: 'user', content: userContent });
  if (history.length > 20) history.shift();

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: getSystemPrompt(staff),
      messages: history,
    });

    const reply = response.content[0].text;
    history[history.length - 1] = { role: 'user', content: imageBase64 ? '[Sent an image]' : body };
    history.push({ role: 'assistant', content: reply });

    console.log('OUT [' + from + ']: ' + reply);
    logMessage({ from, body: reply, direction: 'out' });

    if (reply.includes('Let me verify this with Mr. Yeghia')) {
      pendingEscalations.set(from, body || '[image]');
      if (sendTo) {
        const staffName = staff ? staff.Name : 'Unknown (' + from + ')';
        await sendTo(ESCALATION_NUMBER, 'CHS.ai Escalation\nFrom: ' + staffName + ' (@' + from + ')\nQuestion: ' + (body || '[image]') + '\n\nReply with:\n/answer @' + from + ' your answer here');
      }
    }

    await sendReply(reply);
  } catch (err) {
    console.error('Claude error:', err.message);
    await sendReply('Sorry, I ran into an issue. Please try again.');
  }
}

module.exports = { handleIncoming };
