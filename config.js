// ─────────────────────────────────────────────────────────────────────────────
// CHS.ai — Centralized Configuration
// Edit this file to change model names, token limits, retry settings, etc.
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {

  // ── Models ──────────────────────────────────────────────────────────────────
  MODEL_ROUTER:    'claude-haiku-4-5-20251001',   // Fast, cheap intent router
  MODEL_RESPONDER: 'claude-sonnet-4-6',           // Full replies and doc specs

  // ── Token Limits ────────────────────────────────────────────────────────────
  MAX_TOKENS_ROUTER:    200,    // Haiku — just needs to classify intent
  MAX_TOKENS_RESPONDER: 1000,   // Sonnet — chat replies
  MAX_TOKENS_DOCSPEC:   4000,   // Sonnet — full document generation

  // ── Retry Settings (529 overload) ───────────────────────────────────────────
  RETRY_MAX:      3,            // Number of retries on overload
  RETRY_DELAY_1:  3000,         // ms — delay before retry 1
  RETRY_DELAY_2:  6000,         // ms — delay before retry 2

  // ── Bot Identity ────────────────────────────────────────────────────────────
  BOT_NAME:       'CHS.ai',
  SCHOOL_NAME:    'AECHS',
  SCHOOL_CITY:    'Ashrafieh, Beirut',

  // ── Owner / Escalation ──────────────────────────────────────────────────────
  // These can also be set via .env — env vars take precedence
  ESCALATION_NUMBER: process.env.ESCALATION_NUMBER || '96170688510',
  OWNER_IDS: [
    '213081917517870@lid',
    '96170688510',
    '96170688510@c.us',
    '70688510',
    process.env.OWNER_NUMBER,
    process.env.ESCALATION_LID,
  ].filter(Boolean),

  // ── Paths ───────────────────────────────────────────────────────────────────
  // Relative to project root — used in handler.js and knowledge-loader.js
  DIR_LOGS:       'logs',
  DIR_DATA:       'data',
  DIR_PROFILES:   'profiles',
  DIR_KNOWLEDGE:  'knowledge',
  DIR_GENERATED:  'generated_docs',

  // ── Knowledge Base Files ────────────────────────────────────────────────────
  KB_FILES: [
    'contacts.xlsx',
    'staff_schedules.xlsx',
    'subjects.xlsx',
    'wifi.xlsx',
    'academic_calendar.xlsx',
    'eskool.xlsx',
  ],

};
