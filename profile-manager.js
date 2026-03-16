const fs = require('fs');
const path = require('path');

const PROFILES_BASE = path.join(__dirname, 'profiles');

// Division to subfolder mapping
const DIVISION_MAP = {
  'it': 'IT',
  'school-wide': 'IT',
  'office': 'Office',
  'admin': 'Office',
  'kg': 'KG',
  'kindergarten': 'KG',
  'elementary': 'Elementary',
  'secondary': 'Secondary',
  'secondary (american program)': 'Secondary',
  'kg & elementary': 'KG',
};

const OTHERS_ROLES = ['bookstore', 'librarian', 'library', 'nurse', 'health educator', 'government relations', 'special educator'];

function getSubfolder(profile) {
  if (!profile) return 'Others';

  const division = (profile.division || '').toLowerCase();
  const role = (profile.role || '').toLowerCase();

  // Check role-based others first
  for (const r of OTHERS_ROLES) {
    if (role.includes(r)) return 'Others';
  }

  // Check division map
  for (const [key, folder] of Object.entries(DIVISION_MAP)) {
    if (division.includes(key)) return folder;
  }

  return 'Others';
}

function ensureFolders() {
  const folders = ['IT', 'Office', 'KG', 'Elementary', 'Secondary', 'Others'];
  for (const folder of folders) {
    const folderPath = path.join(PROFILES_BASE, folder);
    if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
  }
}

ensureFolders();

function getSafeFilename(lid) {
  return lid.replace(/[^a-zA-Z0-9@]/g, '_') + '.json';
}

function findProfilePath(lid) {
  // Search all subfolders for this LID
  const folders = ['IT', 'Office', 'KG', 'Elementary', 'Secondary', 'Others'];
  const filename = getSafeFilename(lid);
  for (const folder of folders) {
    const filePath = path.join(PROFILES_BASE, folder, filename);
    if (fs.existsSync(filePath)) return filePath;
  }
  return null;
}

function getProfilePath(profile) {
  const subfolder = getSubfolder(profile);
  return path.join(PROFILES_BASE, subfolder, getSafeFilename(profile.lid));
}

function loadProfile(lid) {
  try {
    const filePath = findProfilePath(lid);
    if (!filePath) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.error('Profile load error:', e.message);
    return null;
  }
}

function saveProfile(profile) {
  try {
    ensureFolders();
    const filePath = getProfilePath(profile);
    // If profile moved division, remove old file
    const oldPath = findProfilePath(profile.lid);
    if (oldPath && oldPath !== filePath) {
      fs.unlinkSync(oldPath);
    }
    fs.writeFileSync(filePath, JSON.stringify(profile, null, 2));
  } catch (e) {
    console.error('Profile save error:', e.message);
  }
}

function createProfile(lid, data = {}) {
  const profile = {
    lid,
    name: data.name || null,
    role: data.role || null,
    division: data.division || null,
    subject: data.subject || null,
    classes: data.classes || null,
    phone: data.phone || null,
    languageStyle: data.languageStyle || 'english',
    devices: data.devices || [],
    recentIssues: data.recentIssues || [],
    preferences: data.preferences || null,
    firstSeen: new Date().toISOString().split('T')[0],
    lastSeen: new Date().toISOString().split('T')[0],
    messageCount: 0,
  };
  saveProfile(profile);
  return profile;
}

function updateProfile(lid, updates) {
  let profile = loadProfile(lid);
  if (!profile) profile = createProfile(lid);
  Object.assign(profile, updates);
  profile.lastSeen = new Date().toISOString().split('T')[0];
  profile.messageCount = (profile.messageCount || 0) + 1;
  saveProfile(profile);
  return profile;
}

// Detect language style from message
function detectLanguageStyle(text) {
  if (!text) return null;
  const arabicScript = /[\u0600-\u06FF]/;
  const arabizi = /\b(tekram|yislamo|mafi|habibi|kifak|tfaddal|inshallah|yalla|mersi|ktir|mesh|msh|hek|shu|shi|wlo|bas|la2|ok|ahla|mazboot|tamem|tmem|3anjad|3al|2al|iza|kif|leik|sabaho|masa)\b/i;
  const french = /\b(bonjour|merci|oui|non|comment|bien|aussi|avec|pour|dans|est|que|qui|une|les|des)\b/i;
  if (arabicScript.test(text)) return 'arabic';
  if (arabizi.test(text)) return 'arabizi';
  if (french.test(text)) return 'french';
  return 'english';
}

// Extract device mentions from message
function extractDevices(text) {
  if (!text) return [];
  const devicePatterns = [
    /\b(dell|hp|lenovo|apple|mac|macbook|imac|asus|acer|samsung|toshiba)\b/gi,
    /\b(laptop|computer|pc|tablet|ipad|phone|printer|projector|board|screen)\b/gi,
  ];
  const devices = new Set();
  for (const pattern of devicePatterns) {
    const matches = text.match(pattern);
    if (matches) matches.forEach(d => devices.add(d.toLowerCase()));
  }
  return [...devices];
}

// Build context string for Claude from profile
function buildProfileContext(profile) {
  if (!profile) return '';
  const title = profile.title || '';
  const firstName = profile.name ? profile.name.split(' ')[0] : null;
  const fullTitle = title && firstName ? title + ' ' + firstName : firstName;

  let context = '\n\nUSER PROFILE:';
  if (profile.name) context += '\nFull name: ' + profile.name;
  if (title) context += '\nTitle: ' + title;
  if (profile.role) context += '\nRole: ' + profile.role;
  if (profile.division) context += '\nDivision: ' + profile.division;
  if (profile.subject) context += '\nSubject: ' + profile.subject;
  if (profile.classes) context += '\nClasses: ' + profile.classes;
  if (profile.languageStyle) context += '\nCommunication style: ' + profile.languageStyle + ' — mirror this style in your reply';
  if (profile.devices && profile.devices.length > 0) context += '\nKnown devices: ' + profile.devices.join(', ');
  if (profile.recentIssues && profile.recentIssues.length > 0) context += '\nRecent issues: ' + profile.recentIssues.slice(-3).join(', ');
  if (fullTitle) context += '\n\nALWAYS address this person as "' + fullTitle + '" naturally in conversation. Use their title + first name (e.g. "Mr. Jean", "Mrs. Nora").';
  return context;
}

// Add issue to profile history
function logIssue(lid, issue) {
  const profile = loadProfile(lid);
  if (!profile) return;
  if (!profile.recentIssues) profile.recentIssues = [];
  const entry = new Date().toISOString().split('T')[0] + ': ' + issue;
  profile.recentIssues.unshift(entry);
  if (profile.recentIssues.length > 5) profile.recentIssues = profile.recentIssues.slice(0, 5);
  saveProfile(profile);
}

module.exports = {
  loadProfile,
  saveProfile,
  createProfile,
  updateProfile,
  detectLanguageStyle,
  extractDevices,
  buildProfileContext,
  logIssue,
};
