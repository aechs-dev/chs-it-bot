const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const KNOWLEDGE_DIR = path.join(__dirname, 'knowledge');

function loadKnowledge() {
  if (!fs.existsSync(KNOWLEDGE_DIR)) return '';

  const files = fs.readdirSync(KNOWLEDGE_DIR).filter(f => f.endsWith('.xlsx'));
  if (files.length === 0) return '';

  let knowledge = '\n\n--- KNOWLEDGE BASE ---\n';

  for (const file of files) {
    try {
      const wb = xlsx.readFile(path.join(KNOWLEDGE_DIR, file));
      const sheetName = wb.SheetNames[0];
      const rows = xlsx.utils.sheet_to_json(wb.Sheets[sheetName]);
      if (rows.length === 0) continue;

      const topic = path.basename(file, '.xlsx').toUpperCase();
      knowledge += `\n[${topic}]\n`;

      for (const row of rows) {
        const parts = Object.entries(row)
          .filter(([, v]) => v && String(v).trim())
          .map(([k, v]) => `${k}: ${String(v).replace(/\n/g, ' | ')}`)
          .join(' | ');
        if (parts) knowledge += `- ${parts}\n`;
      }
    } catch (e) {
      console.error(`Error loading ${file}:`, e.message);
    }
  }

  knowledge += '--- END KNOWLEDGE BASE ---\n';
  return knowledge;
}

module.exports = { loadKnowledge };
