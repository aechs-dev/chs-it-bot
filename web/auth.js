'use strict';

const crypto = require('crypto');

const SESSION_COOKIE = 'chs_dashboard_session';
const SESSION_TTL_SECONDS = 60 * 60 * 12;
const SESSION_SECRET = process.env.DASHBOARD_SESSION_SECRET || process.env.ANTHROPIC_API_KEY || 'chs-local-session-secret';

function parseCookies(req) {
  const header = req.headers?.cookie || '';
  const cookies = {};
  for (const part of header.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

function sign(value) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('base64url');
}

function normalizeDeptName(name) {
  return String(name || '').trim().toLowerCase().replace(/\s+/g, '_');
}

function hasAdminPanelAccess(session) {
  if (!session) return false;
  const deptNames = Array.isArray(session.departments)
    ? session.departments.map(dept => normalizeDeptName(dept?.name))
    : [];

  return (
    session.clearance === 'owner' ||
    session.role_type === 'it_manager' ||
    deptNames.includes('it') ||
    (session.legacy && session.web_mode === 'admin')
  );
}

function sanitizeSessionPayload(payload = {}) {
  const expiresAt = new Date(Date.now() + (SESSION_TTL_SECONDS * 1000)).toISOString();
  const session = {
    person_id: payload.person_id || null,
    full_name: payload.full_name || '',
    first_name: payload.first_name || '',
    last_name: payload.last_name || '',
    title: payload.title || '',
    role_type: payload.role_type || 'teacher',
    clearance: payload.clearance || 'teacher',
    web_code: payload.web_code || '',
    web_mode: payload.web_mode || 'auto',
    departments: Array.isArray(payload.departments) ? payload.departments : [],
    legacy: !!payload.legacy,
    directory_access: payload.directory_access ? 1 : 0,
    simulations_access: payload.simulations_access ? 1 : 0,
    expiresAt,
  };
  session.admin_access = hasAdminPanelAccess(session);
  return session;
}

// Simulations Lab access: explicit toggle OR owner/IT automatically granted.
function hasSimulationsAccess(session) {
  if (!session) return false;
  return !!(session.simulations_access) || hasAdminPanelAccess(session);
}

function encodeSession(payload) {
  const session = sanitizeSessionPayload(payload);
  const body = Buffer.from(JSON.stringify(session)).toString('base64url');
  return `${body}.${sign(body)}`;
}

function decodeSession(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [body, signature] = token.split('.', 2);
  if (!body || !signature) return null;
  if (sign(body) !== signature) return null;

  try {
    const session = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!session?.expiresAt || new Date(session.expiresAt).getTime() <= Date.now()) return null;
    session.admin_access = hasAdminPanelAccess(session);
    return session;
  } catch (_) {
    return null;
  }
}

function getSession(req) {
  // Primary: cookie-based session (web browser)
  const cookies = parseCookies(req);
  const cookieSession = decodeSession(cookies[SESSION_COOKIE]);
  if (cookieSession) return cookieSession;

  // Fallback: X-Auth-Code header (mobile app)
  const code = req.headers['x-auth-code'];
  if (code) {
    try {
      const { resolveIdentity } = require('./routes/identity');
      const identity = resolveIdentity(String(code).trim());
      if (identity) return sanitizeSessionPayload(identity);
    } catch (_) {}
  }

  return null;
}

function setSession(res, payload) {
  const token = encodeSession(payload);
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/dashboard; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`);
}

function clearSession(res) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/dashboard; HttpOnly; SameSite=Lax; Max-Age=0`);
}

function attachSession(req, _res, next) {
  req.dashboardSession = getSession(req);
  next();
}

module.exports = {
  SESSION_COOKIE,
  attachSession,
  getSession,
  setSession,
  clearSession,
  hasAdminPanelAccess,
  hasSimulationsAccess,
  sanitizeSessionPayload,
};
