const logs = [];
const MAX_LOGS = 200;

function logMessage({ from, body, direction }) {
  const entry = {
    id: Date.now() + Math.random(),
    from,
    body,
    direction,
    timestamp: new Date().toISOString(),
  };
  logs.unshift(entry);
  if (logs.length > MAX_LOGS) logs.pop();
}

function getLogs() {
  return logs;
}

module.exports = { logMessage, getLogs };