'use strict';

/**
 * /api/identity/* — Single identity resolution layer
 *
 * All callers (chat-stream, web chat, WhatsApp handler) resolve identity here.
 * Source of truth: people + access + roles + person_departments
 * Legacy users/contacts tables are NOT used.
 */

const express = require('express');
const router  = express.Router();
const db      = require('../../core/database');
const { logError } = require('../../core/logger');

function apiErr(res, status, msg, e, ctx = {}) {
  if (e) logError(ctx.route || 'identity-api', e, ctx);
  if (!res.headersSent) res.status(status).json({ error: msg });
}

/**
 * resolveIdentity(code)
 * Given a web_code, returns the full identity object or null.
 * This is the canonical function used by all routes.
 */
function resolveIdentity(code) {
  if (!code) return null;

  const row = db.prepare(`
    SELECT
      p.id            AS person_id,
      p.first_name,
      p.last_name,
      p.title,
      p.full_name,
      p.phone,
      p.status,
      p.american_program,
      r.role_type,
      r.substitution_eligible,
      pr.employment_type,
      pr.days          AS presence_days,
      pr.arrival_time,
      pr.departure_time,
      a.web_code,
      a.web_mode,
      a.whatsapp_lid,
      a.clearance,
      a.directory_access,
      a.simulations_access
    FROM access a
    JOIN people  p  ON p.id = a.person_id
    LEFT JOIN roles   r  ON r.id = (
      SELECT r2.id
      FROM roles r2
      WHERE r2.person_id = p.id
      ORDER BY r2.id ASC
      LIMIT 1
    )
    LEFT JOIN presence pr ON pr.person_id = p.id
    WHERE a.web_code = ? AND p.status = 'active'
  `).get(code);

  if (!row) return null;

  // Departments
  const departments = db.prepare(`
    SELECT d.id, d.name, d.color, pd.is_primary
    FROM person_departments pd
    JOIN departments d ON d.id = pd.dept_id
    WHERE pd.person_id = ?
    ORDER BY pd.is_primary DESC
  `).all(row.person_id);

  // Resolve effective mode
  const modeMap   = { teacher: 'teacher', student: 'student', admin: 'owner', auto: 'teacher' };
  const effective_mode = row.web_mode || 'auto';
  const effective_clearance = row.clearance || modeMap[effective_mode] || 'teacher';

  return {
    person_id:      row.person_id,
    full_name:      row.full_name,
    first_name:     row.first_name,
    last_name:      row.last_name,
    title:          row.title,
    phone:          row.phone,
    status:         row.status,
    american_program: row.american_program,
    role_type:      row.role_type,
    substitution_eligible: row.substitution_eligible,
    employment_type: row.employment_type,
    presence_days:  row.presence_days,
    arrival_time:   row.arrival_time,
    departure_time: row.departure_time,
    web_code:         row.web_code,
    web_mode:         row.web_mode,
    whatsapp_lid:     row.whatsapp_lid,
    clearance:        effective_clearance,
    directory_access:   row.directory_access ? 1 : 0,
    simulations_access: row.simulations_access ? 1 : 0,
    departments,
  };
}

/**
 * resolveIdentityByLid(lid)
 * For WhatsApp handler — resolves by whatsapp_lid.
 */
function resolveIdentityByLid(lid) {
  if (!lid) return null;

  const row = db.prepare(`
    SELECT
      p.id            AS person_id,
      p.first_name,
      p.last_name,
      p.title,
      p.full_name,
      p.phone,
      p.status,
      p.american_program,
      r.role_type,
      r.substitution_eligible,
      pr.employment_type,
      pr.days          AS presence_days,
      a.web_code,
      a.web_mode,
      a.whatsapp_lid,
      a.clearance,
      a.directory_access,
      a.simulations_access
    FROM access a
    JOIN people  p   ON p.id = a.person_id
    LEFT JOIN roles   r  ON r.id = (
      SELECT r2.id
      FROM roles r2
      WHERE r2.person_id = p.id
      ORDER BY r2.id ASC
      LIMIT 1
    )
    LEFT JOIN presence pr ON pr.person_id = p.id
    WHERE a.whatsapp_lid = ? AND p.status = 'active'
  `).get(lid);

  if (!row) return null;

  const departments = db.prepare(`
    SELECT d.id, d.name, d.color, pd.is_primary
    FROM person_departments pd
    JOIN departments d ON d.id = pd.dept_id
    WHERE pd.person_id = ?
    ORDER BY pd.is_primary DESC
  `).all(row.person_id);

  const modeMap         = { teacher: 'teacher', student: 'student', admin: 'owner', auto: 'teacher' };
  const effective_mode  = row.web_mode || 'auto';
  const effective_clearance = row.clearance || modeMap[effective_mode] || 'teacher';

  return {
    person_id:   row.person_id,
    full_name:   row.full_name,
    first_name:  row.first_name,
    last_name:   row.last_name,
    title:       row.title,
    role_type:   row.role_type,
    clearance:        effective_clearance,
    web_mode:         row.web_mode,
    whatsapp_lid:     row.whatsapp_lid,
    directory_access:   row.directory_access ? 1 : 0,
    simulations_access: row.simulations_access ? 1 : 0,
    departments,
  };
}

// ── GET /api/identity?code=XXX ────────────────────────────────────────────────
// Primary endpoint — used by web chat on load
router.get('/', (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return apiErr(res, 400, 'code required');
    const identity = resolveIdentity(code);
    if (!identity) return res.status(404).json({ error: 'Unknown or inactive access code' });
    res.json(identity);
  } catch (e) {
    apiErr(res, 500, e.message, e, { route: 'GET /api/identity' });
  }
});

// ── GET /api/identity/by-lid?lid=XXX ─────────────────────────────────────────
// Used by WhatsApp handler
router.get('/by-lid', (req, res) => {
  try {
    const lid = req.query.lid;
    if (!lid) return apiErr(res, 400, 'lid required');
    const identity = resolveIdentityByLid(lid);
    if (!identity) return res.status(404).json({ error: 'No staff member linked to this WhatsApp ID' });
    res.json(identity);
  } catch (e) {
    apiErr(res, 500, e.message, e, { route: 'GET /api/identity/by-lid' });
  }
});

// ── PATCH /api/identity/link-lid — link WhatsApp LID to person ───────────────
// Called automatically when a known staff member messages for the first time
router.patch('/link-lid', (req, res) => {
  try {
    const { person_id, lid } = req.body;
    if (!person_id || !lid) return apiErr(res, 400, 'person_id and lid required');

    // Check not already linked to someone else
    const existing = db.prepare('SELECT person_id FROM access WHERE whatsapp_lid = ?').get(lid);
    if (existing && existing.person_id !== person_id) {
      return apiErr(res, 400, `LID already linked to person_id ${existing.person_id}`);
    }

    db.prepare('UPDATE access SET whatsapp_lid = ? WHERE person_id = ?').run(lid, person_id);
    res.json({ ok: true });
  } catch (e) {
    apiErr(res, 500, e.message, e, { route: 'PATCH /api/identity/link-lid' });
  }
});

// Export resolvers for use in chat-stream and WhatsApp handler
module.exports = router;
module.exports.resolveIdentity      = resolveIdentity;
module.exports.resolveIdentityByLid = resolveIdentityByLid;
