'use strict';
// clean-contacts.js
// Finds duplicate contacts by name, keeps the one with most data, removes the rest
// Run: node clean-contacts.js

const db = require('./core/database');

const all = db.prepare('SELECT * FROM contacts ORDER BY id ASC').all();

// Group by normalized name
const groups = new Map();
for (const row of all) {
  const key = (row.name || '').toLowerCase().trim();
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(row);
}

let removed = 0;
let kept = 0;

db.transaction(() => {
  for (const [name, rows] of groups) {
    if (rows.length === 1) { kept++; continue; }

    // Score each row by number of non-null/non-empty fields
    const scored = rows.map(r => ({
      row: r,
      score: Object.values(r).filter(v => v !== null && v !== '' && v !== undefined).length
    }));

    // Sort descending by score — keep highest
    scored.sort((a, b) => b.score - a.score);

    const keep    = scored[0].row;
    const discard = scored.slice(1).map(s => s.row);

    // If the kept row has no web_code but a duplicate does, transfer it
    for (const d of discard) {
      if (!keep.web_code && d.web_code) {
        db.prepare('UPDATE contacts SET web_code = ?, web_clearance = ?, web_mode = ? WHERE id = ?')
          .run(d.web_code, d.web_clearance, d.web_mode, keep.id);
      }
      // Transfer lid if kept row doesn't have one
      if (!keep.lid && d.lid) {
        db.prepare('UPDATE contacts SET lid = ? WHERE id = ?').run(d.lid, keep.id);
      }
    }

    // Delete duplicates
    const idsToDelete = discard.map(d => d.id);
    db.prepare(`DELETE FROM contacts WHERE id IN (${idsToDelete.join(',')})`).run();

    console.log(`✓ Kept: [${keep.id}] ${keep.name} | Removed: [${idsToDelete.join(', ')}]`);
    removed += idsToDelete.length;
    kept++;
  }
})();

console.log(`\n✅ Done. Kept: ${kept} unique staff. Removed: ${removed} duplicates.`);
console.log(`   Total contacts now: ${db.prepare('SELECT COUNT(*) as c FROM contacts').get().c}`);
