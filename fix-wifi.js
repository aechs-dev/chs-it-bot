const db   = require('./core/database');
const xlsx = require('xlsx');

const wb   = xlsx.readFile('./knowledge/wifi.xlsx');
const ws   = wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(ws);

db.prepare('DELETE FROM wifi').run();

const insert = db.prepare(
  'INSERT INTO wifi (network_name, password, login_required, username, login_password, notes, access_level, allowed_users) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
);

for (const r of rows) {
  insert.run(
    r['Network Name (SSID)'] || '',
    r['Password']            || '',
    r['Login Required']      || 'No',
    r['Login Username']      || '',
    r['Login Password']      || '',
    r['Location / Notes']    || '',
    r['Access Level']        || 'all_staff',
    r['Allowed Users']       || ''
  );
}

const result = db.prepare('SELECT network_name, access_level FROM wifi').all();
console.log('WiFi re-migrated:');
result.forEach(r => console.log(' ', r.network_name, '|', r.access_level));
