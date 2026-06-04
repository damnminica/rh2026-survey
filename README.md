# JKT48 RH2026 Setlist Survey

Survey prediksi & harapan setlist Request Hour 2026 oleh @damnminica.

## Deploy ke Railway

1. Push repo ini ke GitHub
2. Buka [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Pilih repo ini → Railway auto-detect dan deploy
4. Selesai — Railway kasih URL publik

## Persistent data (optional tapi recommended)

Secara default votes tersimpan di file `data/votes.json` di container.
Data bisa hilang kalau Railway restart container.

Untuk data lebih aman, tambah Railway Volume:
1. Di Railway dashboard → project → Add Volume
2. Mount path: `/app/data`
3. Set environment variable: `DATA_DIR=/app/data`

## API Endpoints

- `GET /api/stats` — total voter count
- `GET /api/results` — aggregated results (pc, hc, total)
- `GET /api/check/:vid` — check if voter has voted
- `POST /api/vote` — submit vote `{vid, p: [ids], h: [ids]}`

## Stack

- Node.js + Express
- Vanilla JS frontend (no build step)
- JSON file for vote persistence
