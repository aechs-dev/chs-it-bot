'use strict';

const express = require('express');
const router = express.Router();

const db = require('../../core/database');
const { logError } = require('../../core/logger');
const {
  ACADEMIC_YEAR,
  SCHOOL_DAYS,
  PERIODS,
  normalizeDay,
  normalizePeriod,
  departmentToPool,
  listDepartmentsForPerson,
  buildOperationalSchedule,
  listOperationalPeople,
} = require('../../core/ops-engine');

const VALID_ROLES = [
  'teacher', 'coordinator', 'hod_kg', 'hod_elementary', 'hod_intermediate',
  'hod_secondary', 'librarian', 'nurse', 'bookstore', 'secretary', 'accountant',
  'academic_director', 'principal', 'it_manager', 'psychologist', 'counselor',
];

const VALID_CLEARANCES = ['student', 'teacher', 'coordinator', 'hod', 'office', 'owner'];
const VALID_MODES = ['auto', 'teacher', 'student', 'admin'];
const VALID_EMP_TYPES = ['full-time', 'part-time', 'office'];
const VALID_STATUSES = ['active', 'on_leave', 'inactive'];

function err(res, status, msg, error = null, ctx = {}) {
  if (error) logError(ctx.route || 'people-api', error, ctx);
  if (!res.headersSent) res.status(status).json({ error: msg });
}

function clearanceFromRole(roleType) {
  if (!roleType) return 'teacher';
  if (roleType === 'it_manager' || roleType === 'principal') return 'owner';
  if (roleType === 'academic_director' || roleType === 'secretary' ||
      roleType === 'accountant' || roleType === 'nurse' ||
      roleType === 'librarian' || roleType === 'bookstore' ||
      roleType === 'psychologist' || roleType === 'counselor') return 'office';
  if (roleType.startsWith('hod_')) return 'hod';
  if (roleType === 'coordinator') return 'coordinator';
  return 'teacher';
}

function roleLabel(roleType) {
  if (!roleType) return 'Staff';
  const parts = roleType.split('_');
  return parts.map(part => {
    if (part === 'hod') return 'HoD';
    if (part === 'kg') return 'KG';
    if (part === 'it') return 'IT';
    return part.charAt(0).toUpperCase() + part.slice(1);
  }).join(' ');
}

function normalizeDepartmentsInput(departments) {
  if (!Array.isArray(departments)) return [];
  return departments
    .map((dept, index) => {
      const id = typeof dept === 'object' ? parseInt(dept.id, 10) : parseInt(dept, 10);
      if (!id) return null;
      return {
        id,
        is_primary: typeof dept === 'object' ? (dept.is_primary ? 1 : 0) : (index === 0 ? 1 : 0),
      };
    })
    .filter(Boolean);
}

function normalizeCampusPeriodsInput(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const selection = Object.fromEntries(SCHOOL_DAYS.map(day => [day, []]));

  if (Array.isArray(payload)) {
    for (const row of payload) {
      const day = normalizeDay(row?.day);
      if (!day) continue;
      const periods = Array.isArray(row?.periods) ? row.periods : [];
      selection[day] = [...new Set(periods.map(normalizePeriod).filter(Boolean))];
    }
    return selection;
  }

  for (const [rawDay, rawPeriods] of Object.entries(payload)) {
    const day = normalizeDay(rawDay);
    if (!day) continue;
    const periods = Array.isArray(rawPeriods) ? rawPeriods : [];
    selection[day] = [...new Set(periods.map(normalizePeriod).filter(Boolean))];
  }
  return selection;
}

function replaceCampusPeriods(personId, campusSelection, academicYear = ACADEMIC_YEAR) {
  const selection = normalizeCampusPeriodsInput(campusSelection);
  if (!selection) return;

  const remove = db.prepare('DELETE FROM campus_periods WHERE person_id = ? AND academic_year = ?');
  const insert = db.prepare(`
    INSERT INTO campus_periods (person_id, academic_year, day, period, on_campus)
    VALUES (?, ?, ?, ?, ?)
  `);

  remove.run(personId, academicYear);
  for (const day of SCHOOL_DAYS) {
    const allowed = new Set(selection[day] || []);
    for (const period of PERIODS) {
      insert.run(personId, academicYear, day, period, allowed.has(period) ? 1 : 0);
    }
  }
}

function ensureSupportRows(personId, roleType = 'teacher') {
  db.prepare(`
    INSERT OR IGNORE INTO roles (person_id, role_type, clearance, substitution_eligible)
    VALUES (?, ?, ?, ?)
  `).run(personId, roleType, clearanceFromRole(roleType), roleType === 'teacher' ? 1 : 0);

  db.prepare(`
    INSERT OR IGNORE INTO presence (person_id, employment_type, days, arrival_time, departure_time)
    VALUES (?, 'full-time', 'Mon,Tue,Wed,Thu,Fri', '08:00', '14:00')
  `).run(personId);

  db.prepare(`
    INSERT OR IGNORE INTO access (person_id, web_code, web_mode, clearance)
    VALUES (?, NULL, 'auto', ?)
  `).run(personId, clearanceFromRole(roleType));
}

function getPersonRow(personId) {
  return db.prepare(`
    SELECT
      p.id,
      p.first_name,
      p.last_name,
      p.title,
      p.full_name,
      p.phone,
      p.status,
      p.american_program,
      p.notes,
      r.role_type,
      r.substitution_eligible,
      pr.employment_type,
      pr.days AS presence_days,
      pr.arrival_time,
      pr.departure_time,
      pr.notes AS presence_notes,
      a.web_code,
      a.web_mode,
      a.whatsapp_lid,
      a.clearance,
      a.directory_access,
      a.simulations_access
    FROM people p
    LEFT JOIN roles r ON r.person_id = p.id
    LEFT JOIN presence pr ON pr.person_id = p.id
    LEFT JOIN access a ON a.person_id = p.id
    WHERE p.id = ?
  `).get(personId);
}

function buildPersonResponse(personRow) {
  if (!personRow) return null;
  const departments = listDepartmentsForPerson(personRow.id);
  const operational = buildOperationalSchedule(personRow, { departments });
  const derivedClearance = clearanceFromRole(personRow.role_type || 'teacher');

  return {
    ...personRow,
    departments,
    role_label: roleLabel(personRow.role_type),
    effective_clearance: personRow.clearance || derivedClearance,
    clearance_overridden: !!personRow.clearance && personRow.clearance !== derivedClearance,
    primary_department: operational.primary_department,
    department_pools: operational.department_pools,
    campus_periods: operational.campus_periods,
    has_custom_campus_periods: operational.has_custom_campus_periods,
    schedule_rows: operational.schedule_rows,
    operational_schedule: operational.matrix,
    schedule_summary: operational.summary,
    day_totals: operational.day_totals,
    current_status: operational.current_status,
    data_quality: operational.data_quality,
  };
}

function buildPersonListItem(personRow) {
  const full = buildPersonResponse(personRow);
  if (!full) return null;
  return {
    id: full.id,
    first_name: full.first_name,
    last_name: full.last_name,
    title: full.title,
    full_name: full.full_name,
    phone: full.phone,
    status: full.status,
    american_program: full.american_program,
    role_type: full.role_type,
    role_label: full.role_label,
    substitution_eligible: full.substitution_eligible,
    employment_type: full.employment_type,
    web_code: full.web_code,
    web_mode: full.web_mode,
    whatsapp_lid: full.whatsapp_lid,
    effective_clearance: full.effective_clearance,
    departments: full.departments,
    primary_department: full.primary_department,
    department_pools: full.department_pools,
    current_status: full.current_status,
    schedule_summary: full.schedule_summary,
    data_quality: full.data_quality,
  };
}

router.get('/meta/departments', (_req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM departments ORDER BY id ASC').all());
  } catch (error) {
    err(res, 500, error.message, error, { route: 'GET /api/people/meta/departments' });
  }
});

router.get('/meta/roles', (_req, res) => {
  res.json(VALID_ROLES.map(role => ({
    value: role,
    label: roleLabel(role),
    clearance: clearanceFromRole(role),
    substitution_eligible: role === 'teacher' ? 1 : 0,
  })));
});

router.get('/meta/ops-config', (_req, res) => {
  res.json({
    academic_year: ACADEMIC_YEAR,
    days: SCHOOL_DAYS,
    periods: PERIODS.map(period => ({ period, label: `P${period}` })),
    substitution_pools: {
      KG: ['KG'],
      Elementary: ['Elementary'],
      'Upper School': ['Intermediate', 'Secondary'],
      Office: ['Office'],
      IT: ['IT'],
    },
  });
});

router.get('/', (req, res) => {
  try {
    const { dept, status, role, search } = req.query;
    const searchValue = String(search || '').trim().toLowerCase();

    let people = listOperationalPeople().map(buildPersonListItem);

    people = people.filter(person => {
      if (status) {
        if (person.status !== status) return false;
      } else if (person.status === 'inactive') {
        return false;
      }

      if (role && person.role_type !== role) return false;
      if (dept && !person.departments.some(item => item.name === dept)) return false;
      if (searchValue) {
        const haystack = [
          person.full_name,
          person.first_name,
          person.last_name,
          person.phone,
          person.role_label,
          ...person.departments.map(item => item.name),
        ].join(' ').toLowerCase();
        if (!haystack.includes(searchValue)) return false;
      }

      return true;
    });

    res.json(people);
  } catch (error) {
    err(res, 500, error.message, error, { route: 'GET /api/people' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return err(res, 400, 'Invalid ID');
    const person = buildPersonResponse(getPersonRow(id));
    if (!person) return err(res, 404, 'Person not found');
    res.json(person);
  } catch (error) {
    err(res, 500, error.message, error, { route: 'GET /api/people/:id', id: req.params.id });
  }
});

router.post('/', (req, res) => {
  try {
    const {
      first_name,
      last_name,
      title,
      phone,
      status = 'active',
      notes = null,
      american_program = 0,
      role_type = 'teacher',
      departments = [],
      employment_type = 'full-time',
      days = 'Mon,Tue,Wed,Thu,Fri',
      arrival_time = '08:00',
      departure_time = '14:00',
      web_code = null,
      web_mode = 'auto',
      campus_periods = null,
    } = req.body;

    if (!first_name || !last_name) return err(res, 400, 'first_name and last_name are required');
    if (!VALID_ROLES.includes(role_type)) return err(res, 400, `Invalid role_type: ${role_type}`);
    if (!VALID_EMP_TYPES.includes(employment_type)) return err(res, 400, 'Invalid employment_type');
    if (!VALID_STATUSES.includes(status)) return err(res, 400, 'Invalid status');
    if (!VALID_MODES.includes(web_mode)) return err(res, 400, `Invalid web_mode: ${web_mode}`);
    if (web_code && web_code.length < 6) return err(res, 400, 'Web code must be at least 6 characters');

    if (web_code) {
      const duplicate = db.prepare('SELECT 1 FROM access WHERE web_code = ?').get(web_code);
      if (duplicate) return err(res, 400, `Web code "${web_code}" is already in use`);
    }

    const fullName = `${title ? `${title} ` : ''}${first_name} ${last_name}`.trim();
    const normalizedDepartments = normalizeDepartmentsInput(departments);
    const defaultClearance = clearanceFromRole(role_type);

    const newId = db.transaction(() => {
      const insertPerson = db.prepare(`
        INSERT INTO people (first_name, last_name, title, full_name, phone, status, american_program, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        first_name,
        last_name,
        title || null,
        fullName,
        phone || null,
        status,
        american_program ? 1 : 0,
        notes || null
      );

      const personId = insertPerson.lastInsertRowid;

      db.prepare(`
        INSERT INTO roles (person_id, role_type, clearance, substitution_eligible)
        VALUES (?, ?, ?, ?)
      `).run(personId, role_type, defaultClearance, role_type === 'teacher' ? 1 : 0);

      db.prepare(`
        INSERT INTO presence (person_id, employment_type, days, arrival_time, departure_time)
        VALUES (?, ?, ?, ?, ?)
      `).run(personId, employment_type, days, arrival_time, departure_time);

      db.prepare(`
        INSERT INTO access (person_id, web_code, web_mode, clearance)
        VALUES (?, ?, ?, ?)
      `).run(personId, web_code || null, web_mode, defaultClearance);

      for (const department of normalizedDepartments) {
        db.prepare(`
          INSERT OR IGNORE INTO person_departments (person_id, dept_id, is_primary)
          VALUES (?, ?, ?)
        `).run(personId, department.id, department.is_primary);
      }

      if (campus_periods) replaceCampusPeriods(personId, campus_periods, ACADEMIC_YEAR);
      return personId;
    })();

    res.status(201).json({ ok: true, person: buildPersonResponse(getPersonRow(newId)) });
  } catch (error) {
    err(res, 500, error.message, error, { route: 'POST /api/people' });
  }
});

router.patch('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return err(res, 400, 'Invalid ID');

    const current = getPersonRow(id);
    if (!current) return err(res, 404, 'Person not found');

    ensureSupportRows(id, current.role_type || 'teacher');

    const {
      first_name,
      last_name,
      title,
      phone,
      status,
      notes,
      american_program,
      role_type,
      substitution_eligible,
      employment_type,
      days,
      arrival_time,
      departure_time,
      presence_notes,
      web_code,
      web_mode,
      clearance,
      whatsapp_lid,
      directory_access,
      simulations_access,
      departments,
      campus_periods,
    } = req.body;

    if (role_type !== undefined && !VALID_ROLES.includes(role_type)) return err(res, 400, `Invalid role_type: ${role_type}`);
    if (status !== undefined && !VALID_STATUSES.includes(status)) return err(res, 400, 'Invalid status');
    if (employment_type !== undefined && !VALID_EMP_TYPES.includes(employment_type)) return err(res, 400, 'Invalid employment_type');
    if (web_mode !== undefined && !VALID_MODES.includes(web_mode)) return err(res, 400, `Invalid web_mode: ${web_mode}`);
    if (clearance !== undefined && !VALID_CLEARANCES.includes(clearance)) return err(res, 400, `Invalid clearance: ${clearance}`);
    if (web_code !== undefined && web_code && web_code.length < 6) return err(res, 400, 'Web code must be at least 6 characters');

    if (web_code) {
      const duplicate = db.prepare('SELECT person_id FROM access WHERE web_code = ? AND person_id != ?').get(web_code, id);
      if (duplicate) return err(res, 400, `Web code "${web_code}" is already in use`);
    }

    db.transaction(() => {
      const peopleFields = [];
      const peopleValues = [];

      if (first_name !== undefined) { peopleFields.push('first_name = ?'); peopleValues.push(first_name); }
      if (last_name !== undefined) { peopleFields.push('last_name = ?'); peopleValues.push(last_name); }
      if (title !== undefined) { peopleFields.push('title = ?'); peopleValues.push(title || null); }
      if (phone !== undefined) { peopleFields.push('phone = ?'); peopleValues.push(phone || null); }
      if (status !== undefined) { peopleFields.push('status = ?'); peopleValues.push(status); }
      if (notes !== undefined) { peopleFields.push('notes = ?'); peopleValues.push(notes || null); }
      if (american_program !== undefined) { peopleFields.push('american_program = ?'); peopleValues.push(american_program ? 1 : 0); }

      if (first_name !== undefined || last_name !== undefined || title !== undefined) {
        const fullName = `${title !== undefined ? (title ? `${title} ` : '') : (current.title ? `${current.title} ` : '')}${first_name !== undefined ? first_name : current.first_name} ${last_name !== undefined ? last_name : current.last_name}`.trim();
        peopleFields.push('full_name = ?');
        peopleValues.push(fullName);
      }

      if (peopleFields.length) {
        peopleValues.push(id);
        db.prepare(`UPDATE people SET ${peopleFields.join(', ')} WHERE id = ?`).run(...peopleValues);
      }

      if (role_type !== undefined || substitution_eligible !== undefined) {
        const nextRole = role_type !== undefined ? role_type : current.role_type;
        const nextClearance = clearance !== undefined ? clearance : clearanceFromRole(nextRole);
        const nextSubEligibility = substitution_eligible !== undefined ? (substitution_eligible ? 1 : 0) : (nextRole === 'teacher' ? 1 : 0);

        db.prepare(`
          UPDATE roles
          SET role_type = ?, clearance = ?, substitution_eligible = ?
          WHERE person_id = ?
        `).run(nextRole, clearanceFromRole(nextRole), nextSubEligibility, id);

        db.prepare('UPDATE access SET clearance = ? WHERE person_id = ?').run(nextClearance, id);
      } else if (clearance !== undefined) {
        db.prepare('UPDATE access SET clearance = ? WHERE person_id = ?').run(clearance, id);
      }

      const presenceFields = [];
      const presenceValues = [];
      if (employment_type !== undefined) { presenceFields.push('employment_type = ?'); presenceValues.push(employment_type); }
      if (days !== undefined) { presenceFields.push('days = ?'); presenceValues.push(days); }
      if (arrival_time !== undefined) { presenceFields.push('arrival_time = ?'); presenceValues.push(arrival_time); }
      if (departure_time !== undefined) { presenceFields.push('departure_time = ?'); presenceValues.push(departure_time); }
      if (presence_notes !== undefined) { presenceFields.push('notes = ?'); presenceValues.push(presence_notes || null); }
      if (presenceFields.length) {
        presenceValues.push(id);
        db.prepare(`UPDATE presence SET ${presenceFields.join(', ')} WHERE person_id = ?`).run(...presenceValues);
      }

      const accessFields = [];
      const accessValues = [];
      if (web_code !== undefined) { accessFields.push('web_code = ?'); accessValues.push(web_code || null); }
      if (web_mode !== undefined) { accessFields.push('web_mode = ?'); accessValues.push(web_mode); }
      if (whatsapp_lid !== undefined) { accessFields.push('whatsapp_lid = ?'); accessValues.push(whatsapp_lid || null); }
      if (directory_access !== undefined) { accessFields.push('directory_access = ?'); accessValues.push(directory_access ? 1 : 0); }
      if (simulations_access !== undefined) { accessFields.push('simulations_access = ?'); accessValues.push(simulations_access ? 1 : 0); }
      if (accessFields.length) {
        accessValues.push(id);
        db.prepare(`UPDATE access SET ${accessFields.join(', ')} WHERE person_id = ?`).run(...accessValues);
      }

      if (Array.isArray(departments)) {
        const normalizedDepartments = normalizeDepartmentsInput(departments);
        db.prepare('DELETE FROM person_departments WHERE person_id = ?').run(id);
        for (const department of normalizedDepartments) {
          db.prepare(`
            INSERT OR IGNORE INTO person_departments (person_id, dept_id, is_primary)
            VALUES (?, ?, ?)
          `).run(id, department.id, department.is_primary);
        }
      }

      if (campus_periods !== undefined) replaceCampusPeriods(id, campus_periods, ACADEMIC_YEAR);
    })();

    res.json({ ok: true, person: buildPersonResponse(getPersonRow(id)) });
  } catch (error) {
    err(res, 500, error.message, error, { route: 'PATCH /api/people/:id', id: req.params.id });
  }
});

router.post('/:id/archive', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return err(res, 400, 'Invalid ID');
    const result = db.prepare(`UPDATE people SET status = 'inactive' WHERE id = ?`).run(id);
    if (!result.changes) return err(res, 404, 'Person not found');
    db.prepare('UPDATE access SET web_code = NULL WHERE person_id = ?').run(id);
    res.json({ ok: true });
  } catch (error) {
    err(res, 500, error.message, error, { route: 'POST /api/people/:id/archive', id: req.params.id });
  }
});

router.post('/:id/restore', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return err(res, 400, 'Invalid ID');
    const result = db.prepare(`UPDATE people SET status = 'active' WHERE id = ?`).run(id);
    if (!result.changes) return err(res, 404, 'Person not found');
    res.json({ ok: true });
  } catch (error) {
    err(res, 500, error.message, error, { route: 'POST /api/people/:id/restore', id: req.params.id });
  }
});

router.post('/:id/grant-access', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return err(res, 400, 'Invalid ID');

    const { code, mode = 'auto' } = req.body;
    if (!code || code.length < 6) return err(res, 400, 'Code must be at least 6 characters');
    if (!VALID_MODES.includes(mode)) return err(res, 400, `Invalid mode: ${mode}`);

    const person = getPersonRow(id);
    if (!person || person.status !== 'active') return err(res, 404, 'Active person not found');

    const duplicate = db.prepare('SELECT person_id FROM access WHERE web_code = ? AND person_id != ?').get(code, id);
    if (duplicate) return err(res, 400, `Code "${code}" is already in use`);

    db.prepare('UPDATE access SET web_code = ?, web_mode = ? WHERE person_id = ?').run(code, mode, id);
    res.json({ ok: true, code });
  } catch (error) {
    err(res, 500, error.message, error, { route: 'POST /api/people/:id/grant-access', id: req.params.id });
  }
});

router.post('/:id/revoke-access', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return err(res, 400, 'Invalid ID');
    db.prepare('UPDATE access SET web_code = NULL WHERE person_id = ?').run(id);
    res.json({ ok: true });
  } catch (error) {
    err(res, 500, error.message, error, { route: 'POST /api/people/:id/revoke-access', id: req.params.id });
  }
});

router.get('/:id/schedule', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return err(res, 400, 'Invalid ID');
    const person = buildPersonResponse(getPersonRow(id));
    if (!person) return err(res, 404, 'Person not found');
    res.json({
      academic_year: ACADEMIC_YEAR,
      campus_periods: person.campus_periods,
      schedule_rows: person.schedule_rows,
      operational_schedule: person.operational_schedule,
      schedule_summary: person.schedule_summary,
      current_status: person.current_status,
    });
  } catch (error) {
    err(res, 500, error.message, error, { route: 'GET /api/people/:id/schedule', id: req.params.id });
  }
});

// ── Schedule slot upsert — PUT /:id/schedule/:day/:period ─────────────────────
// Body: { type: 'class'|'meeting'|'on_campus'|'off_campus', class_name?: string }
// Handles both schedules and campus_periods tables in one atomic operation.
router.put('/:id/schedule/:day/:period', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return err(res, 400, 'Invalid ID');
    const day    = req.params.day;
    const period = String(req.params.period);
    const type   = req.body.type || 'class';           // class | meeting | on_campus | off_campus
    const className = (req.body.class_name || '').trim();

    // 1. Update campus_periods — upsert per-slot on_campus flag
    const onCampus = type !== 'off_campus' ? 1 : 0;
    db.prepare(`
      INSERT INTO campus_periods (person_id, academic_year, day, period, on_campus)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(person_id, academic_year, day, period) DO UPDATE SET on_campus = excluded.on_campus
    `).run(id, ACADEMIC_YEAR, day, period, onCampus);

    // 2. Handle schedules row
    if (type === 'class' || type === 'meeting') {
      // Use provided name; meetings default to 'Meeting' if no name given
      const name = className || (type === 'meeting' ? 'Meeting' : '');
      if (name) {
        db.prepare(`
          INSERT INTO schedules (person_id, day, period, class_name, academic_year)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(person_id, academic_year, day, period) DO UPDATE SET class_name = excluded.class_name
        `).run(id, day, period, name, ACADEMIC_YEAR);
      }
    } else {
      // off_campus or on_campus (no class) — remove any schedule entry
      db.prepare(
        'DELETE FROM schedules WHERE person_id = ? AND day = ? AND period = ? AND academic_year = ?'
      ).run(id, day, period, ACADEMIC_YEAR);
    }

    res.json({ ok: true, action: type });
  } catch (error) {
    err(res, 500, error.message, error, { route: 'PUT /api/people/:id/schedule/:day/:period' });
  }
});

// ── Schedule slot delete — DELETE /:id/schedule/:day/:period ──────────────────
router.delete('/:id/schedule/:day/:period', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return err(res, 400, 'Invalid ID');
    db.prepare(
      'DELETE FROM schedules WHERE person_id = ? AND day = ? AND period = ? AND academic_year = ?'
    ).run(id, String(req.params.day), String(req.params.period), ACADEMIC_YEAR);
    res.json({ ok: true });
  } catch (error) {
    err(res, 500, error.message, error, { route: 'DELETE /api/people/:id/schedule/:day/:period' });
  }
});

module.exports = router;
