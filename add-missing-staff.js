'use strict';
const db = require('better-sqlite3')('data/chs.db');

const getDept = name => db.prepare('SELECT id FROM departments WHERE name = ?').get(name)?.id;

const addPerson = db.transaction((first, last, title, role, emp, days, arr, dep, depts) => {
  const full      = (title ? title + ' ' : '') + first + ' ' + last;
  const clearance = 'teacher';
  const sub       = 1;

  const pid = db.prepare(`
    INSERT INTO people (first_name, last_name, title, full_name, status, american_program)
    VALUES (?, ?, ?, ?, 'active', 0)
  `).run(first, last, title, full).lastInsertRowid;

  db.prepare('INSERT INTO roles (person_id, role_type, clearance, substitution_eligible) VALUES (?, ?, ?, ?)').run(pid, role, clearance, sub);
  db.prepare('INSERT INTO presence (person_id, employment_type, days, arrival_time, departure_time) VALUES (?, ?, ?, ?, ?)').run(pid, emp, days, arr, dep);
  db.prepare('INSERT INTO access (person_id, web_code, web_mode, clearance) VALUES (?, NULL, \'auto\', ?)').run(pid, clearance);

  for (let i = 0; i < depts.length; i++) {
    const did = getDept(depts[i]);
    if (did) db.prepare('INSERT OR IGNORE INTO person_departments (person_id, dept_id, is_primary) VALUES (?, ?, ?)').run(pid, did, i === 0 ? 1 : 0);
  }

  console.log(`✓ Added: ${full} | role: ${role} | id: ${pid}`);
});

addPerson('Caroline', 'Mississian', 'Mrs.', 'teacher', 'full-time', 'Mon,Tue,Wed,Thu,Fri', '08:00', '14:00', ['KG']);
addPerson('Annie',    'Boghossian', 'Ms.',  'teacher', 'part-time', 'Mon,Tue,Thu',         '08:00', '14:00', ['KG', 'Elementary']);

console.log('\nTotal people:', db.prepare('SELECT COUNT(*) as c FROM people').get().c);
