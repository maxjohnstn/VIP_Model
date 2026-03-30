# Running the Project from GitHub

This guide covers cloning the repo and running everything locally from scratch.

---

## Prerequisites

| Tool | Version | Check |
|---|---|---|
| Node.js | 20+ | `node --version` |
| npm | 10+ | `npm --version` |
| Python | 3.9+ | `python3 --version` |
| Git | Any | `git --version` |

---

## 1. Clone the repository

```bash
git clone https://github.com/maxjohnstn/VIP_Model.git
cd VIP_Model
```

---

## 2. Install Node dependencies

```bash
npm install
```

---

## 3. Install Python dependencies

```bash
pip install pvlib requests pandas numpy scipy
```

---

## 4. Run the dashboard (dev server)

```bash
npm run dev
```

Open [http://localhost:5180](http://localhost:5180) in your browser.

> If port 5180 is already in use, stop the existing Vite process first (`Ctrl+C`), then rerun.

---

## 5. Regenerate the forecast data

The dashboard reads from `public/data/simulation_output.json`. This file is committed to the repo so the dashboard will work immediately after cloning, but to generate fresh data run:

```bash
python3 solar_simulation.py
```

This takes 30–60 seconds. It writes updated JSON to both:
- `public/data/simulation_output.json` (used by the Vite dev server)
- `docs/data/simulation_output.json` (used by GitHub Pages)

---

## 6. Verify the JSON output

```bash
python3 -c "
import json
d = json.load(open('public/data/simulation_output.json'))
print('generated_at:', d['generated_at'])
for s in d['sites']:
    print(s['name'], '| hourly:', len(s['hourly']), '| soc_start:', s['hourly'][0]['soc_pct'])
"
```

You should see 6 sites (including Clyde CP1 and CP2 separately), each with 168 hourly rows.

---

## 7. Build for production

```bash
npm run build
```

Output goes to `dist/`. For deployment this project uses GitHub Pages (served from `/docs`), so a manual build isn't normally required.

---

## Troubleshooting

### `npm run dev` fails with "port already in use"
Another Vite process is running. Find and stop it:
```bash
lsof -i :5180
kill -9 <PID>
```

### Dashboard shows stale data
The JSON hasn't been regenerated. Run `python3 solar_simulation.py` and refresh.

### HMR warning about `useSimulator`
`useSimulator.js` must stay in `src/context/useSimulator.js` as a separate file from `SimulatorContext.jsx`. Vite Fast Refresh cannot handle a file that exports both a React component and a hook. Do not merge them.

### Python script fails to fetch SOC
The Solar Guardian API may be unavailable. The script falls back to `FALLBACK_SOC = 0.50` (50% total capacity) automatically — this is expected and the simulation will still run.

### `AUTO_PUSH = False` in `solar_simulation.py`
The script can commit and push the JSON automatically, but this is currently disabled. To update the live dashboard, manually commit and push `docs/data/simulation_output.json` after running the simulation.

---

## Live Dashboard

The production dashboard is served via GitHub Pages:

**[https://maxjohnstn.github.io/VIP_Model/](https://maxjohnstn.github.io/VIP_Model/)**

GitHub Pages is configured to serve from the `main` branch, `/docs` folder (Settings → Pages).
