const fs = require('fs');
const path = require('path');

const logs = [];
const errors = [];
const MAX_LOGS = 500;
const LOG_DIR = path.join(__dirname, '..', 'data');
const ERROR_LOG_FILE = path.join(LOG_DIR, 'errors.log');

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

function logMessage({ from, body, direction, intent = null, action = null, model = null, meta = null }) {
  const entry = {
    id: Date.now() + Math.random(),
    from,
    body,
    direction,
    intent,
    action,
    model,
    meta,
    timestamp: new Date().toISOString(),
  };
  logs.unshift(entry);
  if (logs.length > MAX_LOGS) logs.pop();
  return entry;
}

function logError(context, err, extra = {}) {
  const entry = {
    id: Date.now() + Math.random(),
    context,
    message: err && err.message ? err.message : String(err),
    stack: err && err.stack ? err.stack : null,
    extra,
    timestamp: new Date().toISOString(),
  };

  errors.unshift(entry);
  if (errors.length > MAX_LOGS) errors.pop();

  try {
    ensureLogDir();
    fs.appendFileSync(
      ERROR_LOG_FILE,
      `[${entry.timestamp}] ${context}\n${entry.message}\n${entry.stack || ''}\n${JSON.stringify(extra)}\n---\n`
    );
  } catch (_) {}

  console.error(`[${context}]`, entry.message);
  if (entry.stack) console.error(entry.stack);

  return entry;
}

function getLogs() {
  return logs;
}

function getErrors() {
  return errors;
}

module.exports = { logMessage, getLogs, logError, getErrors };
