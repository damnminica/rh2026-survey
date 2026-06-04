const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const VOTES_FILE = path.join(DATA_DIR, 'votes.json');

// --- persistence ---
let votes = {};

function loadVotes() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    votes = JSON.parse(fs.readFileSync(VOTES_FILE, 'utf8'));
    console.log(`[boot] loaded ${Object.keys(votes).length} votes`);
  } catch {
    votes = {};
    console.log('[boot] starting fresh');
  }
}

function saveVotes() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(VOTES_FILE, JSON.stringify(votes));
  } catch (e) {
    console.error('[save] failed:', e.message);
  }
}

loadVotes();

// --- middleware ---
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- helpers ---
const VALID_IDS = new Set(Array.from({length: 52}, (_, i) => i + 1));

function validate(p, h) {
  if (!Array.isArray(p) || !Array.isArray(h)) return false;
  if (p.length > 10 || h.length > 3) return false;
  if (!p.every(id => VALID_IDS.has(id))) return false;
  if (!h.every(id => VALID_IDS.has(id))) return false;
  return true;
}

function aggregate() {
  const pc = {}, hc = {};
  let total = 0;
  Object.values(votes).forEach(v => {
    total++;
    (v.p || []).forEach(id => { pc[id] = (pc[id] || 0) + 1; });
    (v.h || []).forEach(id => { hc[id] = (hc[id] || 0) + 1; });
  });
  return { pc, hc, total };
}

// --- API routes ---

// Check if voter has voted
app.get('/api/check/:vid', (req, res) => {
  const { vid } = req.params;
  if (!vid || vid.length > 64) return res.status(400).json({ error: 'invalid' });
  res.json({ voted: !!votes[vid] });
});

// Submit vote
app.post('/api/vote', (req, res) => {
  const { vid, p, h } = req.body;
  if (!vid || vid.length > 64) return res.status(400).json({ error: 'invalid_id' });
  if (!validate(p, h)) return res.status(400).json({ error: 'invalid_vote' });
  votes[vid] = { p, h, t: Date.now() };
  saveVotes();
  res.json({ ok: true, results: aggregate() });
});

// Get results
app.get('/api/results', (req, res) => {
  res.json(aggregate());
});

// Admin: total count only (no PII)
app.get('/api/stats', (req, res) => {
  res.json({ total: Object.keys(votes).length, ts: Date.now() });
});

// Fallback to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[server] rh2026-survey running on port ${PORT}`);
});
