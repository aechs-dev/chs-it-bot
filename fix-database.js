const fs = require('fs');
let content = fs.readFileSync('core/database.js', 'utf8');

// Fix 1: rename from_id column to "from" in logs table CREATE
content = content.replace(
  'from_id   TEXT,',
  '"from"    TEXT,'
);

// Fix 2: fix the index on from_id
content = content.replace(
  'CREATE INDEX IF NOT EXISTS idx_logs_from      ON logs(from_id);',
  'CREATE INDEX IF NOT EXISTS idx_logs_from      ON logs("from");'
);

// Fix 3: fix from_id in flags table
content = content.replace(
  'from_id     TEXT,',
  '"from"      TEXT,'
);

fs.writeFileSync('core/database.js', content);
console.log('Done. Restart: node index.js');
