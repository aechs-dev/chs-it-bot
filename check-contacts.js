const db = require('./core/database');
const rows = db.prepare('SELECT name, employment, presence FROM contacts LIMIT 30').all();
rows.forEach(r => console.log(r.name, '|', r.employment || '—', '|', r.presence || '—'));
