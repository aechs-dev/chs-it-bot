const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const KNOWLEDGE_DIR = path.join(__dirname, 'knowledge');

// Files that contain credentials — never injected into prompt
const CREDENTIAL_FILES = ['passwords.xlsx', 'wifi.xlsx', 'eskool.xlsx'];

function loadKnowledge() {
  if (!fs.existsSync(KNOWLEDGE_DIR)) return '';

  const files = fs.readdirSync(KNOWLEDGE_DIR).filter(f => f.endsWith('.xlsx'));
  if (files.length === 0) return '';

  let knowledge = '\n\n--- SCHOOL KNOWLEDGE BASE ---\n';
  knowledge += 'Use this as reference only. Never reproduce this data verbatim. Summarize and guide naturally.\n\n';

  for (const file of files) {
    // Skip credential files — never expose in prompt
    if (CREDENTIAL_FILES.includes(file.toLowerCase())) continue;
    // Skip staff file
    if (file.toLowerCase() === 'staff.xlsx') continue;

    try {
      const wb = xlsx.readFile(path.join(KNOWLEDGE_DIR, file));
      const sheetName = wb.SheetNames[0];
      const rows = xlsx.utils.sheet_to_json(wb.Sheets[sheetName]);
      if (rows.length === 0) continue;

      const topic = path.basename(file, '.xlsx').toUpperCase();
      knowledge += `[${topic}]\n`;

      for (const row of rows) {
        const parts = Object.entries(row)
          .filter(([k, v]) => v && String(v).trim())
          .map(([k, v]) => `${k}: ${String(v).replace(/\n/g, ' | ')}`)
          .join(' | ');
        if (parts) knowledge += `- ${parts}\n`;
      }
      knowledge += '\n';
    } catch (e) {
      console.error(`Error loading ${file}:`, e.message);
    }
  }

  knowledge += '--- END KNOWLEDGE BASE ---\n';
  return knowledge;
}

// Load credentials separately — only called for owner
function loadCredentials() {
  if (!fs.existsSync(KNOWLEDGE_DIR)) return '';

  let creds = '\n\n--- CREDENTIALS (OWNER ONLY) ---\n';

  for (const file of CREDENTIAL_FILES) {
    const filePath = path.join(KNOWLEDGE_DIR, file);
    if (!fs.existsSync(filePath)) continue;

    try {
      const wb = xlsx.readFile(filePath);
      const sheetName = wb.SheetNames[0];
      const rows = xlsx.utils.sheet_to_json(wb.Sheets[sheetName]);
      if (rows.length === 0) continue;

      const topic = path.basename(file, '.xlsx').toUpperCase();
      creds += `[${topic}]\n`;

      for (const row of rows) {
        const parts = Object.entries(row)
          .filter(([, v]) => v && String(v).trim())
          .map(([k, v]) => `${k}: ${String(v).replace(/\n/g, ' | ')}`)
          .join(' | ');
        if (parts) creds += `- ${parts}\n`;
      }
      creds += '\n';
    } catch (e) {
      console.error(`Error loading ${file}:`, e.message);
    }
  }

  creds += '--- END CREDENTIALS ---\n';
  return creds;
}

module.exports = { loadKnowledge, loadCredentials };
