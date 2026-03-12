const express = require('express');
const router = express.Router();
const { getLogs } = require('./logger');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');

const KNOWLEDGE_DIR = path.join(__dirname, 'knowledge');

// Ensure knowledge dir exists
if (!fs.existsSync(KNOWLEDGE_DIR)) fs.mkdirSync(KNOWLEDGE_DIR);

// Dashboard UI
router.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// Training UI
router.get('/train', (req, res) => res.sendFile(path.join(__dirname, 'train.html')));

// Logs API
router.get('/api/logs', (req, res) => res.json(getLogs()));

// GET knowledge file as JSON
router.get('/api/knowledge/:file', (req, res) => {
  const file = req.params.file.replace(/[^a-z0-9_-]/gi, '');
  const filePath = path.join(KNOWLEDGE_DIR, file + '.xlsx');
  if (!fs.existsSync(filePath)) return res.json([]);
  try {
    const wb = xlsx.readFile(filePath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(ws);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST knowledge file (save JSON back to xlsx)
router.post('/api/knowledge/:file', (req, res) => {
  const file = req.params.file.replace(/[^a-z0-9_-]/gi, '');
  const filePath = path.join(KNOWLEDGE_DIR, file + '.xlsx');
  try {
    const rows = req.body;
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(rows);
    xlsx.utils.book_append_sheet(wb, ws, file);
    xlsx.writeFile(wb, filePath);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
