require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { logMessage } = require('./logger');
const { loadKnowledge } = require('./knowledge-loader');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const conversations = new Map();
const pendingEscalations = new Map();
const OWNER = process.env.OWNER_NUMBER;
const ESCALATION_NUMBER = '96170688510';
const ESCALATION_LID = process.env.ESCALATION_LID || '213081917517870@lid';

let basePrompt = process.env.BOT_SYSTEM_PROMPT || 'You are CHS.ai, an IT support assistant.';

function isOwner(from) {
  return from === OWNER || from === ESCALATION_NUMBER || from === ESCALATION_LID;
}

function getSystemPrompt() {
  return basePrompt + loadKnowledge();
}

async function handleIncoming({ from, body, sendReply, sendTo, imageBase64, imageMime }) {
  console.log('📩 [' + from + ']: ' + (imageBase64 ? '[IMAGE]' : body));
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
      await sendReply('✅ Answer sent to ' + targetNumber);
      pendingEscalations.delete(targetNumber);
    }
    return;
  }

  // Owner commands
  if (isOwner(from) && body) {
    if (body.startsWith('/setprompt ')) { basePrompt = body.replace('/setprompt ', '').trim(); await sendReply('✅ System prompt updated!'); return; }
    if (body.startsWith('/addknowledge ')) { basePrompt += '\n' + body.replace('/addknowledge ', '').trim(); await sendReply('✅ Knowledge added!'); return; }
    if (body === '/showprompt') { await sendReply('📋 Current prompt:\n\n' + basePrompt); return; }
    if (body === '/resetall') { conversations.clear(); await sendReply('✅ All conversations cleared!'); return; }
    if (body === '/stats') { await sendReply('📊 Stats:\nActive conversations: ' + conversations.size + '\nPending escalations: ' + pendingEscalations.size); return; }
    if (body === '/pending') {
      if (pendingEscalations.size === 0) { await sendReply('No pending escalations.'); return; }
      let msg = 'Pending escalations:\n';
      pendingEscalations.forEach((q, num) => { msg += '\n@' + num + ': ' + q; });
      await sendReply(msg); return;
    }
    if (body === '/help') {
      await sendReply('🔧 Owner Commands:\n/stats\n/pending\n/answer @number text\n/addknowledge text\n/setprompt text\n/showprompt\n/resetall');
      return;
    }
  }

  // General commands
  if (body === '/reset') { conversations.delete(from); await sendReply('🔄 Conversation reset!'); return; }
  if (body === '/help') { await sendReply('🤖 CHS.ai Commands:\n/reset - clear your chat history\n/help - show this message'); return; }

  // Build message content
  if (!conversations.has(from)) conversations.set(from, []);
  const history = conversations.get(from);

  let userContent;

  if (imageBase64) {
    // Vision message — image + optional caption
    userContent = [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: imageMime || 'image/jpeg',
          data: imageBase64,
        }
      }
    ];
    if (body && body.trim()) {
      userContent.push({ type: 'text', text: body.trim() });
    } else {
      userContent.push({ type: 'text', text: 'I sent you an image of an IT issue I am having. Please analyze it and help me fix it.' });
    }
  } else {
    userContent = body;
  }

  history.push({ role: 'user', content: userContent });
  if (history.length > 20) history.shift();

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: getSystemPrompt(),
      messages: history,
    });

    const reply = response.content[0].text;
    // Store text-only version in history to avoid bloating memory with images
    history[history.length - 1] = { role: 'user', content: imageBase64 ? '[Sent an image]' : body };
    history.push({ role: 'assistant', content: reply });

    console.log('📤 [' + from + ']: ' + reply);
    logMessage({ from, body: reply, direction: 'out' });

    if (reply.includes('Let me verify this with Mr. Yeghia')) {
      pendingEscalations.set(from, body || '[image]');
      if (sendTo) {
        await sendTo(ESCALATION_NUMBER, '🔔 CHS.ai Escalation\nFrom: @' + from + '\nQuestion: ' + (body || '[Teacher sent an image]') + '\n\nReply with:\n/answer @' + from + ' your answer here');
      }
    }

    await sendReply(reply);
  } catch (err) {
    console.error('Claude error:', err.message);
    await sendReply('⚠️ Sorry, I ran into an issue. Please try again.');
  }
}

module.exports = { handleIncoming };
