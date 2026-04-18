'use strict';

const db = require('./database');

const ACADEMIC_YEAR = '2025-2026';
const SCHOOL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const PERIODS = ['1', '2', '3', '4', '5', '6', '7'];
const PERIOD_WINDOWS = {
  '1': { label: '08:00-08:45', start: 480, end: 525 },
  '2': { label: '08:45-09:30', start: 525, end: 570 },
  '3': { label: '09:30-10:15', start: 570, end: 615 },
  '4': { label: '10:40-11:25', start: 640, end: 685 },
  '5': { label: '11:25-12:10', start: 685, end: 730 },
  '6': { label: '12:30-13:15', start: 750, end: 795 },
  '7': { label: '13:15-14:00', start: 795, end: 840 },
};

const DAY_ALIASES = {
  mon: 'Monday',
  monday: 'Monday',
  tue: 'Tuesday',
  tues: 'Tuesday',
  tuesday: 'Tuesday',
  wed: 'Wednesday',
  wednesday: 'Wednesday',
  thu: 'Thursday',
  thur: 'Thursday',
  thurs: 'Thursday',
  thursday: 'Thursday',
  fri: 'Friday',
  friday: 'Friday',
};

const MEETING_PATTERNS = [
  /\bmeeting\b/i,
  /\bcoordination\b/i,
  /\bbriefing\b/i,
  /\baccreditation\b/i,
  /\bclub\b/i,
  /\btraining\b/i,
  /\bassembly\b/i,
  /\bworkshop\b/i,
];

function normalizeDay(value) {
  if (!value) return null;
  return DAY_ALIASES[String(value).trim().toLowerCase()] || null;
}

function normalizePeriod(value) {
  if (value === null || value === undefined) return null;
  const clean = String(value).replace(/[^0-9]/g, '');
  return PERIODS.includes(clean) ? clean : null;
}

function minutesFromTime(value) {
  if (!value || typeof value !== 'string') return null;
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return (parseInt(match[1], 10) * 60) + parseInt(match[2], 10);
}

function emptyCampusMap() {
  const map = {};
  for (const day of SCHOOL_DAYS) {
    map[day] = {};
    for (const period of PERIODS) map[day][period] = false;
  }
  return map;
}

function extractPresenceDays(rawDays) {
  if (!rawDays || typeof rawDays !== 'string') return new Set(SCHOOL_DAYS);
  const values = rawDays
    .split(/[,\s/|]+/)
    .map(v => normalizeDay(v))
    .filter(Boolean);
  return values.length ? new Set(values) : new Set(SCHOOL_DAYS);
}

function periodFallsWithinWindow(period, arrivalTime, departureTime) {
  const window = PERIOD_WINDOWS[period];
  if (!window) return false;

  const arrival = minutesFromTime(arrivalTime);
  const departure = minutesFromTime(departureTime);
  if (arrival === null || departure === null) return true;

  return window.start >= arrival && window.end <= departure;
}

function deriveCampusMapFromPresence(presenceRow = {}) {
  const campusMap = emptyCampusMap();
  const activeDays = extractPresenceDays(presenceRow.presence_days || presenceRow.days);

  for (const day of SCHOOL_DAYS) {
    const isPresentThisDay = activeDays.has(day);
    for (const period of PERIODS) {
      campusMap[day][period] = isPresentThisDay && periodFallsWithinWindow(
        period,
        presenceRow.arrival_time || presenceRow.arrivalTime || '08:00',
        presenceRow.departure_time || presenceRow.departureTime || '14:00'
      );
    }
  }

  return campusMap;
}

function campusMapToSelection(campusMap) {
  const selection = {};
  for (const day of SCHOOL_DAYS) {
    selection[day] = PERIODS.filter(period => campusMap?.[day]?.[period]);
  }
  return selection;
}

function isAcademicRole(roleType = '') {
  return roleType === 'teacher' || roleType === 'coordinator' || roleType.startsWith('hod_');
}

function needsAvailabilityReview(person = {}, scheduleRows = [], campusData = null) {
  return isAcademicRole(person.role_type || '')
    && scheduleRows.length === 0
    && !campusData?.has_custom_periods;
}

function hasCampusOnlyMapping(person = {}, scheduleRows = [], campusData = null) {
  return isAcademicRole(person.role_type || '')
    && scheduleRows.length === 0
    && !!campusData?.has_custom_periods;
}

function isMeetingLabel(label = '') {
  return MEETING_PATTERNS.some(pattern => pattern.test(label));
}

function classifyScheduleLabel(label = '') {
  const clean = String(label || '').trim();
  if (!clean) return { entry_type: null, label: '' };
  return {
    entry_type: isMeetingLabel(clean) ? 'meeting' : 'class',
    label: clean,
  };
}

function inferDepartmentFromLabel(label = '') {
  const clean = String(label || '').trim().toLowerCase();
  if (!clean) return null;

  if (/(pre[\s-]*kg|\bkg\b|\bkg ?[123]\b)/i.test(clean)) return 'KG';

  const gradeMatch = clean.match(/\bgrade\s*(1[0-2]|[1-9])\b/i);
  if (gradeMatch) {
    const grade = parseInt(gradeMatch[1], 10);
    if (grade <= 6) return 'Elementary';
    if (grade <= 9) return 'Intermediate';
    return 'Secondary';
  }

  const looseNumber = clean.match(/\b(1[0-2]|[1-9])\b/);
  if (looseNumber) {
    const grade = parseInt(looseNumber[1], 10);
    if (grade <= 6) return 'Elementary';
    if (grade <= 9) return 'Intermediate';
    return 'Secondary';
  }

  if (/\boffice\b/i.test(clean)) return 'Office';
  if (/\bit\b/i.test(clean)) return 'IT';
  return null;
}

function departmentToPool(name) {
  if (!name) return null;
  if (name === 'Intermediate' || name === 'Secondary') return 'Upper School';
  return name;
}

function buildDepartmentPools(departments = []) {
  return [...new Set(
    departments
      .map(dept => departmentToPool(dept?.name || dept))
      .filter(Boolean)
  )];
}

function getPrimaryDepartment(departments = []) {
  return departments.find(dept => dept?.is_primary) || departments[0] || null;
}

function getCurrentSchoolContext(now = new Date()) {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const day = dayNames[now.getDay()];
  const minutes = (now.getHours() * 60) + now.getMinutes();
  const period = Object.entries(PERIOD_WINDOWS).find(([, window]) => minutes >= window.start && minutes <= window.end)?.[0] || null;

  return {
    day,
    period,
    window: period ? PERIOD_WINDOWS[period] : null,
  };
}

function listDepartmentsForPerson(personId) {
  return db.prepare(`
    SELECT d.id, d.name, d.color, pd.is_primary
    FROM person_departments pd
    JOIN departments d ON d.id = pd.dept_id
    WHERE pd.person_id = ?
    ORDER BY pd.is_primary DESC, d.name ASC
  `).all(personId);
}

function listScheduleRowsForPerson(personId, academicYear = ACADEMIC_YEAR) {
  return db.prepare(`
    SELECT day, period, class_name
    FROM schedules
    WHERE person_id = ? AND academic_year = ?
    ORDER BY
      CASE day
        WHEN 'Monday' THEN 1
        WHEN 'Tuesday' THEN 2
        WHEN 'Wednesday' THEN 3
        WHEN 'Thursday' THEN 4
        WHEN 'Friday' THEN 5
        ELSE 6
      END,
      CAST(period AS INTEGER) ASC
  `).all(personId, academicYear);
}

function listCampusRowsForPerson(personId, academicYear = ACADEMIC_YEAR) {
  return db.prepare(`
    SELECT day, period, on_campus
    FROM campus_periods
    WHERE person_id = ? AND academic_year = ?
  `).all(personId, academicYear);
}

function getCampusMapForPerson(personId, academicYear = ACADEMIC_YEAR, presenceRow = null) {
  const rows = listCampusRowsForPerson(personId, academicYear);
  if (!rows.length) {
    return {
      has_custom_periods: false,
      campus_map: deriveCampusMapFromPresence(presenceRow || {}),
    };
  }

  const campusMap = emptyCampusMap();
  for (const row of rows) {
    const day = normalizeDay(row.day);
    const period = normalizePeriod(row.period);
    if (!day || !period) continue;
    campusMap[day][period] = !!row.on_campus;
  }

  return {
    has_custom_periods: true,
    campus_map: campusMap,
  };
}

function buildOperationalSchedule(person, options = {}) {
  const academicYear = options.academicYear || ACADEMIC_YEAR;
  const departments = options.departments || listDepartmentsForPerson(person.id);
  const primaryDepartment = getPrimaryDepartment(departments);
  const scheduleRows = options.scheduleRows || listScheduleRowsForPerson(person.id, academicYear);
  const campusData = options.campusData || getCampusMapForPerson(person.id, academicYear, person);
  const campusMap = campusData.campus_map;
  const scheduleMap = {};
  const availabilityReviewRequired = needsAvailabilityReview(person, scheduleRows, campusData);
  const campusOnlyMapping = hasCampusOnlyMapping(person, scheduleRows, campusData);
  const reviewReason = availabilityReviewRequired
    ? 'Academic staff member has no schedule rows and no explicit campus-period map.'
    : null;
  const campusOnlyReason = campusOnlyMapping
    ? 'Academic staff member has explicit campus periods but no timed schedule rows. Treat as on campus, not free.'
    : null;

  for (const day of SCHOOL_DAYS) scheduleMap[day] = {};

  const enrichedScheduleRows = scheduleRows.map(row => {
    const day = normalizeDay(row.day);
    const period = normalizePeriod(row.period);
    if (!day || !period) return null;

    const classification = classifyScheduleLabel(row.class_name);
    const inferredDepartment = inferDepartmentFromLabel(row.class_name) || primaryDepartment?.name || null;
    const entry = {
      day,
      period,
      title: row.class_name,
      entry_type: classification.entry_type,
      department: inferredDepartment,
      substitution_pool: departmentToPool(inferredDepartment),
    };
    scheduleMap[day][period] = entry;
    return entry;
  }).filter(Boolean);

  const summary = {
    class_periods: 0,
    meeting_periods: 0,
    free_periods: 0,
    on_duty_periods: 0,
    off_campus_periods: 0,
    on_campus_periods: 0,
    needs_review_periods: 0,
    campus_only_periods: 0,
  };

  const dayTotals = {};
  const slotMap = {};
  const matrix = SCHOOL_DAYS.map(day => {
    dayTotals[day] = { class_periods: 0, meeting_periods: 0, free_periods: 0, on_duty_periods: 0, off_campus_periods: 0, on_campus_periods: 0, needs_review_periods: 0, campus_only_periods: 0 };
    slotMap[day] = {};

    const slots = PERIODS.map(period => {
      const onCampus = availabilityReviewRequired
        ? false
        : (person.status === 'active' ? !!campusMap?.[day]?.[period] : false);
      const scheduled = scheduleMap?.[day]?.[period] || null;
      let state = availabilityReviewRequired ? 'needs_review' : 'off_campus';
      let title = availabilityReviewRequired ? 'Availability Needs Review' : 'Off Campus';
      let entryType = null;
      let department = scheduled?.department || primaryDepartment?.name || null;

      if (scheduled) {
        state = scheduled.entry_type;
        title = scheduled.title;
        entryType = scheduled.entry_type;
      } else if (availabilityReviewRequired) {
        state = 'needs_review';
        title = 'Availability Needs Review';
      } else if (campusOnlyMapping && onCampus) {
        state = 'campus_only';
        title = person.presence_notes || 'On Campus | Detailed Schedule Not Mapped';
      } else if (!onCampus) {
        state = 'off_campus';
        title = 'Off Campus';
      } else if (person.role_type === 'teacher') {
        // Only pure classroom teachers are "free" when on campus without class.
        // Coordinators, HoDs, IT, Nurse, Librarian, Bookstore, Principal, etc.
        // are always "on_duty" when on campus — they have non-teaching responsibilities.
        state = 'free';
        title = 'Free';
      } else {
        state = 'on_duty';
        title = 'On Duty';
      }

      const slot = {
        day,
        period,
        on_campus: onCampus,
        state,
        title,
        entry_type: entryType,
        department,
        substitution_pool: departmentToPool(department),
        time: PERIOD_WINDOWS[period],
      };

      slotMap[day][period] = slot;

      if (onCampus) {
        summary.on_campus_periods += 1;
        dayTotals[day].on_campus_periods += 1;
      }

      switch (state) {
        case 'class':
          summary.class_periods += 1;
          dayTotals[day].class_periods += 1;
          break;
        case 'meeting':
          summary.meeting_periods += 1;
          dayTotals[day].meeting_periods += 1;
          break;
        case 'free':
          summary.free_periods += 1;
          dayTotals[day].free_periods += 1;
          break;
        case 'on_duty':
          summary.on_duty_periods += 1;
          dayTotals[day].on_duty_periods += 1;
          break;
        case 'needs_review':
          summary.needs_review_periods += 1;
          dayTotals[day].needs_review_periods += 1;
          break;
        case 'campus_only':
          summary.campus_only_periods += 1;
          dayTotals[day].campus_only_periods += 1;
          break;
        default:
          summary.off_campus_periods += 1;
          dayTotals[day].off_campus_periods += 1;
          break;
      }

      return slot;
    });

    return { day, slots, summary: dayTotals[day] };
  });

  const nowContext = getCurrentSchoolContext();
  let currentStatus = {
    code: 'off_schedule',
    label: 'Outside school periods',
    day: nowContext.day,
    period: nowContext.period,
    title: null,
  };

  if (SCHOOL_DAYS.includes(nowContext.day) && nowContext.period) {
    const currentSlot = slotMap?.[nowContext.day]?.[nowContext.period];
    if (currentSlot) {
      const labels = {
        class: `In class: ${currentSlot.title}`,
        meeting: `In meeting: ${currentSlot.title}`,
        free: `Free in P${nowContext.period}`,
        on_duty: `On duty in P${nowContext.period}`,
        off_campus: `Off campus in P${nowContext.period}`,
        needs_review: 'Availability needs review',
        campus_only: 'On campus - detailed schedule not mapped',
      };
      currentStatus = {
        code: currentSlot.state,
        label: labels[currentSlot.state] || currentSlot.title,
        day: nowContext.day,
        period: nowContext.period,
        title: currentSlot.title,
      };
    }
  } else if (availabilityReviewRequired) {
    currentStatus = {
      code: 'needs_review_day',
      label: 'Availability needs review',
      day: nowContext.day,
      period: nowContext.period,
      title: null,
    };
  } else if (SCHOOL_DAYS.includes(nowContext.day)) {
    const hasAnyCampusToday = PERIODS.some(period => campusMap?.[nowContext.day]?.[period]);
    currentStatus = {
      code: hasAnyCampusToday ? 'campus_day' : 'off_campus_day',
      label: hasAnyCampusToday ? 'On campus today' : 'Off campus today',
      day: nowContext.day,
      period: null,
      title: null,
    };
  }

  return {
    academic_year: academicYear,
    departments,
    department_pools: buildDepartmentPools(departments),
    primary_department: primaryDepartment,
    campus_periods: campusMapToSelection(campusMap),
    has_custom_campus_periods: campusData.has_custom_periods,
    schedule_rows: enrichedScheduleRows,
    matrix,
    slot_map: slotMap,
    day_totals: dayTotals,
    summary,
    current_status: currentStatus,
    data_quality: {
      availability_review_required: availabilityReviewRequired,
      review_reason: reviewReason,
      campus_only_mapping: campusOnlyMapping,
      campus_only_reason: campusOnlyReason,
    },
  };
}

function listOperationalPeople() {
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
      a.clearance
    FROM people p
    LEFT JOIN roles r ON r.person_id = p.id
    LEFT JOIN presence pr ON pr.person_id = p.id
    LEFT JOIN access a ON a.person_id = p.id
    ORDER BY p.last_name ASC, p.first_name ASC
  `).all();
}

function getSubstituteSuggestions(absentPersonId, day, academicYear = ACADEMIC_YEAR) {
  const normalizedDay = normalizeDay(day);
  if (!normalizedDay) throw new Error('Invalid day');

  const people = listOperationalPeople();
  const absentPerson = people.find(person => person.id === absentPersonId);
  if (!absentPerson) throw new Error('Staff member not found');

  const absentDepartments = listDepartmentsForPerson(absentPerson.id);
  const absentOperational = buildOperationalSchedule(absentPerson, {
    academicYear,
    departments: absentDepartments,
  });

  const affectedSlots = absentOperational.matrix
    .find(row => row.day === normalizedDay)
    ?.slots.filter(slot => slot.state === 'class') || [];

  const candidates = people
    .filter(person => person.id !== absentPerson.id && person.status === 'active' && person.substitution_eligible)
    .map(person => {
      const departments = listDepartmentsForPerson(person.id);
      const operational = buildOperationalSchedule(person, { academicYear, departments });
      return {
        ...person,
        departments,
        department_pools: buildDepartmentPools(departments),
        primary_department: getPrimaryDepartment(departments),
        operational,
      };
    });

  return {
    absent: {
      id: absentPerson.id,
      full_name: absentPerson.full_name,
      role_type: absentPerson.role_type,
      departments: absentDepartments,
    },
    day: normalizedDay,
    affected_periods: affectedSlots.map(slot => {
      const targetPool = slot.substitution_pool || departmentToPool(getPrimaryDepartment(absentDepartments)?.name);
      const suggestions = candidates
        .filter(candidate => targetPool ? candidate.department_pools.includes(targetPool) : true)
        .map(candidate => {
          const candidateSlot = candidate.operational.slot_map?.[normalizedDay]?.[slot.period];
          return {
            id: candidate.id,
            full_name: candidate.full_name,
            role_type: candidate.role_type,
            employment_type: candidate.employment_type,
            departments: candidate.departments,
            current_slot: candidateSlot,
            day_load: candidate.operational.day_totals?.[normalizedDay]?.class_periods || 0,
          };
        })
        .filter(candidate => candidate.current_slot?.state === 'free')
        .sort((a, b) => {
          const aExact = a.departments.some(dept => dept.name === slot.department) ? 1 : 0;
          const bExact = b.departments.some(dept => dept.name === slot.department) ? 1 : 0;
          if (aExact !== bExact) return bExact - aExact;
          if (a.day_load !== b.day_load) return a.day_load - b.day_load;
          return a.full_name.localeCompare(b.full_name);
        });

      return {
        period: slot.period,
        time: PERIOD_WINDOWS[slot.period],
        class_name: slot.title,
        department: slot.department,
        substitution_pool: targetPool,
        suggestions,
      };
    }),
  };
}

module.exports = {
  ACADEMIC_YEAR,
  SCHOOL_DAYS,
  PERIODS,
  PERIOD_WINDOWS,
  normalizeDay,
  normalizePeriod,
  classifyScheduleLabel,
  inferDepartmentFromLabel,
  departmentToPool,
  buildDepartmentPools,
  isAcademicRole,
  listDepartmentsForPerson,
  listScheduleRowsForPerson,
  getCampusMapForPerson,
  campusMapToSelection,
  buildOperationalSchedule,
  getCurrentSchoolContext,
  listOperationalPeople,
  getSubstituteSuggestions,
};
