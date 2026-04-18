const db = require('better-sqlite3')('data/chs.db');

const insertDept = db.prepare('INSERT OR IGNORE INTO person_departments (person_id, dept_id, is_primary) VALUES (?, ?, ?)');
const updRole = db.prepare('UPDATE roles SET role_type=?, substitution_eligible=? WHERE person_id=?');

const fixes = [
  { id: 39, role: 'coordinator',   sub: 0, depts: [[5,1]] },           // Anny Joukoulian - English coord
  { id: 59, role: 'nurse',         sub: 0, depts: [[5,1],[4,0]] },     // Alik Stanboulian - nurse + AP Secondary
  { id: 58, role: 'coordinator',   sub: 0, depts: [[3,1],[4,0]] },     // Jano Baghboudarian - Math coord, Intermediate+Secondary
  { id: 47, role: 'teacher',       sub: 1, depts: [[1,0],[2,0],[3,0],[4,1]] }, // Khachig Seropian - Sports, all depts
  { id: 65, role: 'librarian',     sub: 0, depts: [[5,1]] },           // Tamar Ohanian - librarian
  { id: 40, role: 'coordinator',   sub: 0, depts: [[5,1]] },           // Ani Manougian - Armenian coord
  { id: 37, role: 'teacher',       sub: 1, depts: [[3,0],[4,1]] },     // Cynthia Shaker - AP, Intermediate+Secondary
  { id: 55, role: 'hod_secondary', sub: 0, depts: [[4,1]] },           // Nora Terzian - HoD Secondary
  { id: 38, role: 'coordinator',   sub: 0, depts: [[5,1]] },           // Rozette Al Haddad - Arabic coord
];

const run = db.transaction(() => {
  for (const f of fixes) {
    updRole.run(f.role, f.sub, f.id);
    for (const [dept_id, is_primary] of f.depts) {
      insertDept.run(f.id, dept_id, is_primary);
    }
  }
});

run();

console.log('✅ Done. Verifying...');
const total = db.prepare('SELECT COUNT(DISTINCT person_id) as c FROM person_departments').get().c;
console.log('person_departments unique people:', total);

const still = db.prepare(`
  SELECT p.id, p.full_name FROM people p
  WHERE p.id NOT IN (SELECT DISTINCT person_id FROM person_departments)
`).all();
if (still.length === 0) {
  console.log('✅ All 67 people have department assignments.');
} else {
  console.log('⚠ Still unlinked:', still);
}
