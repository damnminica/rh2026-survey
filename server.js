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
  } catch { votes = {}; console.log('[boot] fresh start'); }
}
function saveVotes() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(VOTES_FILE, JSON.stringify(votes));
  } catch(e) { console.error('[save] failed:', e.message); }
}
loadVotes();

app.use(express.json({ limit: '50kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// --- validation ---
const VALID_PRED_IDS = new Set(Array.from({length: 52}, (_, i) => i + 1));

function validateVote(p, h) {
  // p = {songId(number): votes(number)} - ids 1-52, total exactly 10
  if (!p || typeof p !== 'object' || Array.isArray(p)) return 'prediksi_format';
  const entries = Object.entries(p);
  if (entries.length === 0 || entries.length > 10) return 'prediksi_range';
  for (const [id, v] of entries) {
    const numId = parseInt(id);
    if (!VALID_PRED_IDS.has(numId)) return 'prediksi_invalid_id';
    if (!Number.isInteger(v) || v < 1 || v > 10) return 'prediksi_invalid_votes';
  }
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (total !== 10) return `prediksi_total_${total}`;

  // h = [songCode, ...] from 419 songs, max 3
  if (!Array.isArray(h) || h.length > 3) return 'harapan_format';
  if (!h.every(c => typeof c === 'string' && /^RHS\d+$/.test(c))) return 'harapan_invalid_code';

  return null;
}

// --- aggregate ---
function aggregate() {
  const pc = {}, hc = {};
  let total = 0;
  Object.values(votes).forEach(v => {
    total++;
    // prediksi: sum up actual vote counts
    Object.entries(v.p || {}).forEach(([id, cnt]) => {
      pc[id] = (pc[id] || 0) + cnt;
    });
    // harapan: count voters per song
    (v.h || []).forEach(code => {
      hc[code] = (hc[code] || 0) + 1;
    });
  });
  return { pc, hc, total };
}

// --- routes ---
app.get('/api/check/:vid', (req, res) => {
  const { vid } = req.params;
  if (!vid || vid.length > 64) return res.status(400).json({ error: 'invalid' });
  const existing = votes[vid];
  res.json({ voted: !!existing, vote: existing || null });
});

app.post('/api/vote', (req, res) => {
  const { vid, p, h } = req.body;
  if (!vid || vid.length > 64) return res.status(400).json({ error: 'invalid_id' });
  const err = validateVote(p, h);
  if (err) return res.status(400).json({ error: err });
  votes[vid] = { p, h, t: Date.now() };
  saveVotes();
  res.json({ ok: true, results: aggregate() });
});

app.get('/api/results', (req, res) => res.json(aggregate()));
app.get('/api/stats', (req, res) => res.json({ total: Object.keys(votes).length, ts: Date.now() }));

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`[server] rh2026-survey on port ${PORT}`));
