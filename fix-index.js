const fs = require('fs');
let content = fs.readFileSync('index.js', 'utf8');

content = content.replace(
  `  const requiredTables = [
    'contacts',
    'schedules',
    'subjects',
    'wifi',
    'calendar',
    'eskool',
    'profiles',
    'users'
  ];`,
  `  const requiredTables = [
    'people',
    'roles',
    'departments',
    'person_departments',
    'presence',
    'access',
    'schedules',
    'calendar',
    'wifi',
  ];`
);

fs.writeFileSync('index.js', content);
console.log('Done. Run: node index.js');
