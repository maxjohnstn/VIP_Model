# Architecture Overview — VIP Solar Dashboard

This document describes how the system fits together end to end, from the Python simulation pipeline through to what the user sees in the browser.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Python Pipeline                   │
│                solar_simulation.py                  │
│                                                     │
│  Solar Guardian API ──► live battery SOC            │
│  Open-Meteo API     ──► 7-day weather forecast      │
│                          │                          │
│                    physics model                    │
│               (GTI → PV → battery SOC)              │
│                          │                          │
│                  simulation_output.json             │
└──────────────────────────┬──────────────────────────┘
                           │ written to docs/data/ and public/data/
                           ▼
┌─────────────────────────────────────────────────────┐
│                  React Dashboard                    │
│                  (Vite + Tailwind)                  │
│                                                     │
│  useForecastData.js ──► fetches JSON every 5 min    │
│  SimulatorContext   ──► distributes data to tabs    │
│                                                     │
│  NowTab / ForecastTab / PlanTab                     │
│  OperatorPanel (toggle)                             │
└─────────────────────────────────────────────────────┘
```

**Key principle: Python is the single source of truth for all physics. React is a pure display layer — no physics re-calculation happens in the browser.**

---

## Python Pipeline

### `solar_simulation.py`

The main script. Run it to regenerate the dashboard data. Takes 30–60 seconds for all 6 sites (5 physical locations, Clyde has 2 controllers).

Processes each site in sequence through 9 blocks:

| Block | Purpose |
|---|---|
| 1 | Site configuration — panel, battery, inverter specs |
| 2 | Solar Guardian API — fetches live battery SOC per controller |
| 3 | Open-Meteo — 7-day hourly weather forecast with `past_days=1` |
| 4 | GTI transposition — converts GHI to tilted plane irradiance |
| 5 | PV model — cell temp → derate → DC power → MPPT clip → inverter |
| 6 | Battery model — 3-state charge controller simulation |
| 7 | Full-charge prediction — linear regression |
| 8 | JSON output — writes to `docs/data/` and `public/data/` |
| 9 | Main loop — iterates all 6 sites |

### Output: `simulation_output.json`

```json
{
  "generated_at": "2026-03-19T20:00:00+00:00",
  "sites": [
    {
      "name": "Clyde CP2",
      "capacity_kwp": 5.4,
      "system_derating": 0.876,
      "current_soc_pct": 64.0,
      "soc_source": "api",
      "hourly": [
        {
          "time": "2026-03-19T00:00:00+00:00",
          "pv_w": 0.0,
          "pv_available": 0.0,
          "soc_pct": 64.0
        }
      ],
      "daily": [
        {
          "date": "2026-03-19",
          "gen_kwh": 2.049,
          "full_charge_time": "14:30",
          "fc_model_time": "11:22",
          "fc_confidence": "moderate",
          "weather_icon": "partly_cloudy"
        }
      ]
    }
  ]
}
```

Key fields:
- `pv_w` — curtailed PV output (0 when battery is full and controller is in float)
- `pv_available` — uncurtailed estimate of what the array could produce
- `soc_pct` — 0–100% of total battery capacity, matching the EPEVER display exactly
- `weather_icon` — `sunny | partly_cloudy | cloudy | overcast`

---

## React Dashboard

### Stack

- **React** with Vite 7.3.1
- **Tailwind CSS** — utility-first styling
- **Recharts** — SOC and PV charts in operator view
- Mobile-first layout, `max-w-md`, single-page app

### Data flow

```
Browser loads
→ SimulatorProvider mounts
→ useForecastData() fetches /data/simulation_output.json every 5 minutes
→ Parses 6 sites × 168 hourly rows × 7 daily summaries
→ SimulatorContext exposes selected site data to all tabs
→ Tabs render with today's data
```

### `SimulatorContext.jsx` — central data engine

All data flows through this context. It holds:

| State | Purpose |
|---|---|
| `selectedSiteName` | Which of the 5 sites is displayed (changed via TopBar dropdown) |
| `selectedDate` | YYYY-MM-DD, defaults to today |
| `simulatedTime` | Minutes since midnight (for time scrubber in test/debug mode) |
| `isOperatorMode` | Shows/hides the operator overlay |

Key computed values (derived from JSON, never re-calculated):

| Value | Description |
|---|---|
| `todayHourly` | Array of hourly rows for selected site + date |
| `currentHourData` | Nearest row to `simulatedTime` |
| `todayPrediction` | `{ predicted_full_charge_time, weather_icon, confidence, gen_kwh }` |
| `predictionsByDate` | All 7 days of daily predictions |
| `siteData` | Per-site physics constants for `energyCalc.js` |

### `useSimulator.js`

A thin hook that calls `useContext(SimulatorContext)`. This file **must stay separate** from `SimulatorContext.jsx` — Vite Fast Refresh cannot handle a file that exports both a React component and a hook.

### `useForecastData.js`

Fetches `simulation_output.json` and converts raw entries into the shape the app uses:

```js
// Hourly rows
{
  timestamp,        // ISO string
  soc,              // soc_pct from JSON (0–100% of total)
  pv_power_w,       // pv_w (curtailed)
  pv_available_w,   // pv_available (uncurtailed, for energyCalc)
  voltage: null,    // not available from forecast
  temperature: null // not available from forecast
}

// Daily predictions
{
  predicted_full_charge_time,  // "14:30"
  weather_icon,                // "sunny" | "partly_cloudy" | "cloudy" | "overcast"
  confidence,                  // "high" | "medium" | "low"
  weather_description,         // human-readable string
  prediction_hour,             // decimal hour (14.5)
  gen_kwh
}
```

All timestamps use `getUTCHours()` — not `getHours()` — because timestamps in the JSON are UTC ISO strings. Using `getHours()` shifts results by 1h during BST.

---

## Component Structure

```
src/components/
├── layout/
│   ├── AppShell.jsx         # App shell, tab router
│   ├── TopBar.jsx           # Site switcher dropdown + operator toggle
│   ├── BottomNav.jsx        # Now / Forecast / Plan tabs
│   └── SimulatorPanel.jsx   # Time scrubber (test/debug mode)
├── tabs/
│   ├── NowTab.jsx           # Current status + appliance feasibility
│   ├── ForecastTab.jsx      # Today's hourly PV timeline
│   └── PlanTab.jsx          # 7-day week planner + visit planner
├── operator/
│   ├── OperatorPanel.jsx        # Operator overlay (slides in from right)
│   ├── LiveMetrics.jsx          # SOC, voltage, temp, PV output
│   ├── SOCChart.jsx             # Today's SOC curve (Recharts)
│   ├── ForecastChartsPanel.jsx  # 7-day PV/SOC + drag-drop load scheduler
│   └── TechnicalAlerts.jsx      # Overvoltage / sub-zero / low SOC alerts
├── forecast/
│   ├── TimelineBar.jsx      # Hourly PV bar chart for today
│   ├── WeatherSummary.jsx   # Weather icon + full charge prediction
│   └── AlertSection.jsx     # Contextual advice banners
├── plan/
│   ├── WeekStrip.jsx        # Horizontal 7-day cards
│   └── VisitPlanner.jsx     # Arrival time + appliance feasibility planner
├── now/
│   └── ApplianceGrid.jsx    # Appliance count selector grid
└── shared/
    ├── StatusBanner.jsx     # Charging / full / low / critical banner
    └── AlertCard.jsx        # Alert display card
```

---

## Data Files

### `allsites.json` — per-site configuration

Each site entry:
```json
{
  "name": "Clyde CP2",
  "battery_capacity_wh": 9600,
  "usable_capacity_wh": 4800,
  "inverter_limit_w": 5000,
  "appliances": [ ... ]
}
```

`SimulatorContext` uses this to override `sitedata.json` constants when the selected site changes, ensuring `energyCalc.js` uses the correct battery size for each site.

### `sitedata.json` — physics constants (CP2 defaults)

```json
{
  "physicsConstants": {
    "batteryCapacityWh": 9600,
    "usableCapacityWh": 4800,
    "maxChargePowerW": 4800,
    "maxInverterPowerW": 5000
  },
  "energy": {
    "min_soc": 50
  }
}
```

`min_soc: 50` is the AGM depth-of-discharge floor. The previous value of 20 was incorrect.

---

## Deployment

GitHub Pages serves the dashboard from the `main` branch, `/docs` folder.

To update the live dashboard:
1. Run `python3 solar_simulation.py`
2. Commit `docs/data/simulation_output.json`
3. Push to `main`

The site rebuilds automatically within ~1 minute.
