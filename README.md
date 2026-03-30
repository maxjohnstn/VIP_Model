# ☀️ VIP Solar Simulation — Glasgow Community Power Hubs

> Physics-based solar PV simulation and live forecasting dashboard for five off-grid community cycling hubs across Scotland.

**Live dashboard →** [max-johnston77.github.io/VIP_Model](https://max-johnston77.github.io/VIP_Model/)  
**University of Strathclyde · EEE · VIP Programme · 2025–2026**

---

## What This Is

Five off-grid solar PV systems power community cycling hubs across Scotland. Each site runs entirely on solar — no grid connection. This project builds a pipeline that:

1. Fetches live battery state-of-charge from the Solar Guardian cloud API
2. Pulls a 7-day weather forecast from [Open-Meteo](https://open-meteo.com/)
3. Simulates hourly PV generation and battery SOC for all 5 sites using a physics-based model
4. Writes results to a JSON file served via GitHub Pages
5. Displays everything in a mobile-first React dashboard with user-facing and operator views

---

## The 5 Sites

| Site | Capacity | Usable Battery | System |
|---|---|---|---|
| Chryston | 0.78 kWp | 1.92 kWh | 24V / VP1000 |
| Sunny Cycles | 2.00 kWp | 1.32 kWh | 24V / VP1500 |
| Cumbernauld | 1.39 kWp | 1.50 kWh | 24V / VP1500 |
| Denmilne | 2.21 kWp | 2.40 kWh | 24V / VP2000 |
| Clyde Cycle Park (CP1 + CP2) | 5.40 kWp | 4.80 kWh each | 48V / IP5000 |

All batteries are AGM with 50% depth of discharge and 85% round-trip efficiency.

---

## Repository Structure

```
VIP_Model/
├── solar_simulation.py          # Main simulation — run this to update the dashboard
├── validate_clyde.py            # Validates Clyde CP1/CP2 model against real data
├── sweep_sunny_cycles.py        # Panel identification sweep for Sunny Cycles
├── epsolar_collector.py         # EPSolar API → CSV data logger (runs every 15 min)
├── docs/
│   └── data/
│       └── simulation_output.json   # Served by GitHub Pages
├── public/
│   └── data/
│       └── simulation_output.json   # Served by Vite dev server
└── src/
    ├── context/
    │   ├── SimulatorContext.jsx     # Central data engine (no physics re-calculation)
    │   └── useSimulator.js          # Hook to consume context (required for Vite HMR)
    ├── hooks/
    │   └── useForecastData.js       # Fetches and parses simulation_output.json
    ├── components/
    │   ├── layout/                  # AppShell, TopBar, BottomNav, SimulatorPanel
    │   ├── tabs/                    # NowTab, ForecastTab, PlanTab
    │   ├── operator/                # OperatorPanel, SOCChart, ForecastChartsPanel, alerts
    │   ├── forecast/                # TimelineBar, WeatherSummary, AlertSection
    │   ├── plan/                    # WeekStrip, VisitPlanner
    │   ├── now/                     # ApplianceGrid
    │   └── shared/                  # StatusBanner, AlertCard
    ├── utils/
    │   ├── energyCalc.js            # Available energy + appliance feasibility maths
    │   ├── prediction.js            # Full-charge regression model
    │   ├── formatters.js            # Time/date helpers
    │   └── dayClassifier.js         # Sunny / cloudy / overcast classification
    └── data/
        ├── sitedata.json            # Physics constants (CP2 defaults)
        └── allsites.json            # Per-site appliance catalogues + battery specs
```

---

## Getting Started

### Prerequisites

- Python 3.9+
- Node.js 18+ and npm

### Install dependencies

```bash
# Python
pip install pvlib requests pandas numpy scipy

# Node / React
npm install
```

### Re-generate forecast data

```bash
python3 solar_simulation.py
```

Takes 30–60 seconds. Writes `simulation_output.json` to both `docs/data/` and `public/data/`.

### Start the dashboard locally

```bash
npm run dev
# → http://localhost:5180
```

### Verify JSON output

```bash
python3 -c "
import json
d = json.load(open('public/data/simulation_output.json'))
print('generated_at:', d['generated_at'])
for s in d['sites']:
    print(s['name'], '| hourly:', len(s['hourly']), '| soc_start:', s['hourly'][0]['soc_pct'])
"
```

---

## How the Simulation Works

Python is the single source of truth for all physics. React is a pure display layer — no re-calculation happens in the browser.

### Physics pipeline (`solar_simulation.py`)

| Stage | What it does |
|---|---|
| Site config | Panel, battery, and inverter specs per site |
| Solar Guardian API | Fetches live battery SOC; falls back to 50% if unavailable |
| Weather | Open-Meteo 7-day forecast with `past_days=1` |
| GTI transposition | Isotropic sky model, solar geometry, bifacial gain |
| PV model | NOCT cell temp → temperature derate → DC power → system derating → MPPT clip → inverter |
| Battery model | 3-state charge controller loop (bulk / float+load / float+free) |
| Full-charge prediction | Linear regression model (ported from partner's JS implementation) |
| JSON output | Writes to `docs/data/` and `public/data/` |

### Battery model — 3-state charge controller

The EPEVER controller operates in three states, which the model replicates:

- **Bulk (SOC < 99%):** Controller outputs max MPPT. Load and battery share PV in parallel.
- **Float, load > PV headroom:** Battery is full but load exceeds PV supply. Battery discharges the shortfall.
- **Float, load ≤ PV headroom ("free energy"):** Battery is full and load is small enough that PV covers it entirely — no battery cost.

This behaviour was confirmed from real charge controller data (August 2025 – February 2026).

### SOC convention

EPEVER reports SOC as 0–100% of **total** battery capacity. The simulation works in total capacity with a DoD floor at 50%:

```
EPEVER 50%  →  0% usable  (DoD floor)
EPEVER 100% →  100% usable (fully charged)
```

Seeding formula:
```python
initial_soc_frac = min(1.0, max(0.0, (epever_pct / 100.0) * 2.0 - 1.0))
```

### System derating

Applied to DC power output before MPPT clipping. Derived from validation against real measured data:

| Site | Derating | Source |
|---|---|---|
| Chryston | 1.0 | Not yet validated |
| Sunny Cycles | 0.85 | Estimated |
| Cumbernauld | 1.0 | Not yet validated |
| Denmilne | 1.0 | Not yet validated |
| Clyde CP1 & CP2 | 0.876 | Calibrated from ERA5 via `validate_clyde.py` |

---

## Dashboard

**Stack:** React + Vite + Tailwind. Mobile-first, single-page app.

**User view:**
- **Now tab** — current battery status and appliance feasibility checker
- **Forecast tab** — today's hourly PV timeline and full-charge prediction
- **Plan tab** — 7-day week planner and visit planner

**Operator view** (toggle in top bar):
- Live SOC, voltage, temperature, and PV output
- 7-day SOC and PV charts with drag-and-drop load scheduling
- Technical alerts (overvoltage, sub-zero, low SOC)

---

## Deployment

GitHub Pages is configured to serve from the `main` branch, `/docs` folder.

To update the live dashboard:
1. Run `python3 solar_simulation.py`
2. Commit and push `docs/data/simulation_output.json`

> **Note:** `AUTO_PUSH` is currently set to `False` in `solar_simulation.py`. The JSON must be committed manually until collaborator access is set up.

---

## Validation

### Clyde CP1 / CP2 — `validate_clyde.py`

Compares model predictions against measured data from August 2025 – February 2026. ERA5 calibration gives **R = 0.817** correlation, yielding `system_derating = 0.876`.

### Sunny Cycles — `sweep_sunny_cycles.py`

Panel identification sweep across two installation phases (pre- and post-October 2025).

### Remaining sites

Chryston, Cumbernauld, and Denmilne have no measured data yet — `system_derating = 1.0` pending validation.

---

## Known Limitations

- Absorption phase not modelled (real charging slows for 1–3h near full; model cuts off at 99%)
- Background loads are constant — real overnight draw varies by season
- Voltage and temperature are `null` in forecast rows (not available from Open-Meteo)
- Day 3+ SOC resets to 75% total (50% usable) as a worst-case mid-range estimate
- Time scrubber uses local time; timestamps are UTC — may show off by 1h during BST

---

## Tech Stack

| Layer | Technology |
|---|---|
| Simulation | Python 3, pvlib, Open-Meteo API, Solar Guardian API |
| Frontend | React, Vite, Tailwind CSS, Recharts |
| Hosting | GitHub Pages (`/docs` folder) |
| Data format | JSON (hourly + daily per site) |

---

## Team

**Jack McLean, Max Johnston, Owen Donnelly**  
University of Strathclyde · Department of Electronic & Electrical Engineering  
VIP (Vertically Integrated Projects) Programme · 2025–2026

---

## Licence

Academic project — University of Strathclyde. Not licensed for commercial use.
