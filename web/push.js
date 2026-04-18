// ─────────────────────────────────────────────────────────────────────────────
// Expo Push Notifications — token storage + send helper
// Tokens are stored in push_tokens.json, keyed by auth code.
// ─────────────────────────────────────────────────────────────────────────────

const fs   = require('fs');
const path = require('path');

const TOKENS_FILE = path.join(__dirname, '..', 'push_tokens.json');

function loadTokens() {
  try { return JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8')); }
  catch { return {}; }
}

function saveToken(authCode, token) {
  if (!authCode || !token) return;
  const tokens = loadTokens();
  tokens[String(authCode).trim()] = token;
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
}

function getToken(authCode) {
  if (!authCode) return null;
  return loadTokens()[String(authCode).trim()] || null;
}

async function sendPushNotification(token, title, body, data = {}) {
  if (!token || !token.startsWith('ExponentPushToken[')) return;
  try {
    const resp = await fetch('https://exp.host/--/api/v2/push/send', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body:    JSON.stringify({ to: token, title, body, data, sound: 'default', priority: 'high' }),
    });
    const json = await resp.json();
    if (json?.data?.status === 'error') {
      console.warn('[push] Expo error:', json.data.message);
    }
  } catch (e) {
    console.error('[push] Failed to send:', e.message);
  }
}

function getAllTokens() {
  return loadTokens(); // returns { authCode: token, ... }
}

module.exports = { saveToken, getToken, sendPushNotification, getAllTokens };
