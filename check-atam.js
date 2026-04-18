const fs = require('fs');
let content = fs.readFileSync('import-schedules.js', 'utf8');

// Check actual filename
const XLSX = require('xlsx');
const path = require('path');
const folder = process.argv[2];
const files = fs.readdirSync(path.join(folder, 'Elementary + Intermediate + Secondary Departments'));
const atam = files.find(f => f.toLowerCase().includes('atam'));
console.log('Actual filename:', JSON.stringify(atam));
console.log('Key needed:', JSON.stringify(atam.replace('.xlsx','')));
