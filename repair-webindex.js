const fs = require('fs');
const content = fs.readFileSync('web/index.js', 'utf8');

// Find and fix all broken JOIN patterns caused by sed removing is_primary
let fixed = content;

// Pattern 1: "AND       LEFT JOIN" — sed removed "r.is_primary = 1" but left "AND"
fixed = fixed.replace(/ON r\.person_id = p\.id AND\s+LEFT JOIN/g, 
  'ON r.person_id = p.id\n      LEFT JOIN');

// Pattern 2: collapsed lines like "r.substitution_eligible,              pr.employment_type"
fixed = fixed.replace(
  /r\.substitution_eligible,\s+pr\.employment_type/g,
  'r.substitution_eligible,\n             pr.employment_type'
);

// Write back
fs.writeFileSync('web/index.js', fixed);
console.log('Done. Verifying...');

// Verify no broken AND LEFT remains
if (fixed.includes('AND       LEFT') || fixed.includes('AND\n      LEFT')) {
  console.log('⚠ Still has broken patterns');
} else {
  console.log('✓ No broken JOIN patterns found');
}

// Show the fixed area
const lines = fixed.split('\n');
const idx = lines.findIndex(l => l.includes('SELECT p.*, r.role_type'));
if (idx >= 0) {
  console.log('\nFixed query preview:');
  console.log(lines.slice(idx, idx + 10).join('\n'));
}
