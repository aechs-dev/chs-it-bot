// ─────────────────────────────────────────────────────────────────────────────
// CHS.ai — Profile Manager (SQLite)
// ─────────────────────────────────────────────────────────────────────────────

const db = require('./database');

function loadProfile(lid) {
  try {
    const row = db.prepare('SELECT * FROM profiles WHERE lid = ?').get(lid);
    if (!row) return null;
    return dbRowToProfile(row);
  } catch(e) { console.error('[profile-manager] loadProfile error:', e.message); return null; }
}

function saveProfile(profile) {
  try {
    db.prepare(`
      INSERT OR REPLACE INTO profiles
        (lid, name, title, role, division, subject, classes, phone,
         language_style, devices, recent_issues, preferences, status,
         source, first_seen, last_seen, message_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      profile.lid, profile.name||null, profile.title||null, profile.role||null,
      profile.division||null, profile.subject||null, profile.classes||null, profile.phone||null,
      profile.languageStyle||'english',
      JSON.stringify(profile.devices||[]),
      JSON.stringify(profile.recentIssues||[]),
      profile.preferences||null, profile.status||'Active', profile.source||'whatsapp',
      profile.firstSeen||new Date().toISOString().split('T')[0],
      profile.lastSeen ||new Date().toISOString().split('T')[0],
      profile.messageCount||0
    );
  } catch(e) { console.error('[profile-manager] saveProfile error:', e.message); }
}

function createProfile(lid, data = {}) {
  const profile = {
    lid, name: data.name||null, title: data.title||null, role: data.role||null,
    division: data.division||null, subject: data.subject||null, classes: data.classes||null,
    phone: data.phone||null, languageStyle: data.languageStyle||'english',
    devices: data.devices||[], recentIssues: data.recentIssues||[],
    preferences: data.preferences||null, status: 'Active', source: 'whatsapp',
    firstSeen: new Date().toISOString().split('T')[0],
    lastSeen:  new Date().toISOString().split('T')[0], messageCount: 0,
  };
  saveProfile(profile);
  return profile;
}

function updateProfile(lid, updates) {
  let profile = loadProfile(lid);
  if (!profile) profile = createProfile(lid);
  Object.assign(profile, updates);
  profile.lastSeen     = new Date().toISOString().split('T')[0];
  profile.messageCount = (profile.messageCount||0) + 1;
  saveProfile(profile);
  return profile;
}

function logIssue(lid, issue) {
  const profile = loadProfile(lid);
  if (!profile) return;
  if (!profile.recentIssues) profile.recentIssues = [];
  profile.recentIssues.unshift(new Date().toISOString().split('T')[0] + ': ' + issue);
  if (profile.recentIssues.length > 5) profile.recentIssues = profile.recentIssues.slice(0, 5);
  saveProfile(profile);
}

function getAllProfiles() {
  try {
    return db.prepare('SELECT * FROM profiles ORDER BY name ASC').all().map(dbRowToProfile);
  } catch(e) { console.error('[profile-manager] getAllProfiles error:', e.message); return []; }
}

function deleteProfile(lid) {
  try { db.prepare('DELETE FROM profiles WHERE lid = ?').run(lid); return true; }
  catch(e) { console.error('[profile-manager] deleteProfile error:', e.message); return false; }
}

function dbRowToProfile(row) {
  return {
    lid: row.lid, name: row.name, title: row.title, role: row.role,
    division: row.division, subject: row.subject, classes: row.classes, phone: row.phone,
    languageStyle: row.language_style||'english',
    devices:      safeJSON(row.devices, []),
    recentIssues: safeJSON(row.recent_issues, []),
    preferences: row.preferences, status: row.status, source: row.source,
    firstSeen: row.first_seen, lastSeen: row.last_seen, messageCount: row.message_count||0,
  };
}

function safeJSON(str, fallback) {
  try { return JSON.parse(str||'[]'); } catch { return fallback; }
}

function detectLanguageStyle(text) {
  if (!text) return null;
  const arabicScript = /[\u0600-\u06FF]/;
  const arabizi = /\b(tekram|yislamo|mafi|habibi|kifak|tfaddal|inshallah|yalla|mersi|ktir|mesh|msh|hek|shu|shi|wlo|bas|la2|ok|ahla|mazboot|tamem|tmem|3anjad|3al|2al|iza|kif|leik|sabaho|masa)\b/i;
  const french  = /\b(bonjour|merci|oui|non|comment|bien|aussi|avec|pour|dans|est|que|qui|une|les|des)\b/i;
  if (arabicScript.test(text)) return 'arabic';
  if (arabizi.test(text))      return 'arabizi';
  if (french.test(text))       return 'french';
  return 'english';
}

function extractDevices(text) {
  if (!text) return [];
  const patterns = [
    /\b(dell|hp|lenovo|apple|mac|macbook|imac|asus|acer|samsung|toshiba)\b/gi,
    /\b(laptop|computer|pc|tablet|ipad|phone|printer|projector|board|screen)\b/gi,
  ];
  const devices = new Set();
  for (const p of patterns) {
    const matches = text.match(p);
    if (matches) matches.forEach(d => devices.add(d.toLowerCase()));
  }
  return [...devices];
}

function buildProfileContext(profile) {
  if (!profile) return '';
  const title     = profile.title || '';
  const firstName = profile.name ? profile.name.split(' ')[0] : null;
  const fullTitle = title && firstName ? title + ' ' + firstName : firstName;
  let context = '\n\nUSER PROFILE:';
  if (profile.name)          context += '\nFull name: '           + profile.name;
  if (title)                 context += '\nTitle: '               + title;
  if (profile.role)          context += '\nRole: '                + profile.role;
  if (profile.division)      context += '\nDivision: '            + profile.division;
  if (profile.subject)       context += '\nSubject: '             + profile.subject;
  if (profile.classes)       context += '\nClasses: '             + profile.classes;
  if (profile.languageStyle) context += '\nCommunication style: ' + profile.languageStyle + ' — mirror this style in your reply';
  if (profile.devices?.length)      context += '\nKnown devices: '  + profile.devices.join(', ');
  if (profile.recentIssues?.length) context += '\nRecent issues: '  + profile.recentIssues.slice(-3).join(', ');
  if (fullTitle) context += '\n\nALWAYS address this person as "' + fullTitle + '" naturally in conversation.';
  return context;
}

module.exports = {
  loadProfile, saveProfile, createProfile, updateProfile,
  getAllProfiles, deleteProfile,
  detectLanguageStyle, extractDevices, buildProfileContext, logIssue,
};
