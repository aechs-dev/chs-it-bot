const fs = require('fs');
let content = fs.readFileSync('import-schedules.js', 'utf8');

// The issue: script does .trim() on filename, removing the trailing space
// Fix: don't trim the excel name when looking up in map
content = content.replace(
  "const excelName = file.replace(/\\.xlsx$/i, '').trim();",
  "const excelName = file.replace(/\\.xlsx$/i, '');"
);

fs.writeFileSync('import-schedules.js', content);
console.log('Done.');
