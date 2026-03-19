# VIP Dashboard Architecture

This document explains how data moves through the app, what each feature owns, and where to edit safely.

Main entry docs:
- Overview: [README.md](README.md)
- Model/calculations: [DASHBOARD_CALCULATIONS.md](DASHBOARD_CALCULATIONS.md)
- Editing guide: [README_EDITING_GUIDE.md](README_EDITING_GUIDE.md)

## 1) Runtime Flow

The runtime path is:

1. `src/main.jsx` mounts `<App />`.
2. `src/App.jsx` wraps the app with `<SimulatorProvider>`.
3. `src/context/SimulatorContext.jsx` loads telemetry/config and computes shared derived values.
4. `src/components/layout/AppShell.jsx` renders tab content and overlays.
5. Tab components consume context state and utility functions.

## 2) Data Sources

- `src/data/masterdata.json`
  - Raw time-series rows (`datetime`, battery metrics, irradiance, PV power).
- `src/data/sitedata.json`
  - Site constraints and constants (`battery_capacity_wh`, voltage limits, appliance catalog, physics constants).

## 3) SimulatorContext Responsibilities

`src/context/SimulatorContext.jsx` is the central source of truth.

It provides:
- Core controls:
  - `selectedDate`
  - `simulatedTime` (minutes from midnight)
  - `isOperatorMode`
  - `isSimulatorOpen`
- Derived datasets:
  - `rowsByDate` and normalized `mappedRowsByDate`
  - `todayHourly`
  - `currentHourData` (exact timestamp or nearest prior row)
  - `predictionsByDate`
  - `todayPrediction`
- Technical issue lifecycle:
  - `registerTechnicalIssues(issues)`
  - `resolveTechnicalIssue(issueId)`

Date handling details:
- Unknown dates are mapped to the nearest available date via `resolveToAvailableDate`.
- Rows are grouped by date and sorted by `datetime`.

## 4) Layout and Navigation

- `src/components/layout/AppShell.jsx`
  - Owns local tab state (`now`, `forecast`, `plan`).
  - Renders:
    - `TopBar`
    - active tab content
    - `BottomNav`
    - `SimulatorPanel`
    - `OperatorPanel` (when operator mode is enabled)

- `src/components/layout/SimulatorPanel.jsx`
  - Test-mode controls for date/time simulation.

- `src/components/layout/TopBar.jsx`
  - Site title and operator toggle.

- `src/components/layout/BottomNav.jsx`
  - Fixed tab navigation.

## 5) Tab Responsibilities

### Now Tab

- File: `src/components/tabs/NowTab.jsx`
- Inputs:
  - `currentHourData`, `todayHourly`, `todayPrediction`, `simulatedTime`, `site`, `siteData`
- Uses:
  - `deriveStatus`, `calcAvailableEnergy`, `calcFeasibility`
- Outputs:
  - Status banner
  - Weather/SOC/time pills
  - Appliance feasibility result bar

### Forecast Tab

- File: `src/components/tabs/ForecastTab.jsx`
- Renders:
  - `TimelineBar` (6:00-20:00 segmented day bar)
  - `WeatherSummary`
  - `AlertSection`

### Plan Tab

- File: `src/components/tabs/PlanTab.jsx`
- Renders:
  - `WeekStrip` (day cards)
  - `VisitPlanner` (arrival-time + appliance feasibility)

## 6) Operator Mode

- Overlay root: `src/components/operator/OperatorPanel.jsx`
- Submodules:
  - `LiveMetrics.jsx`: current telemetry and curtailment duration
  - `SOCChart.jsx`: SOC line chart with current-time marker
  - `TechnicalAlerts.jsx`: persistent actionable issue list

Alert thresholds are documented in [DASHBOARD_CALCULATIONS.md](DASHBOARD_CALCULATIONS.md).

## 7) Utility Modules

- `src/utils/energyCalc.js`
  - `calcAvailableEnergy(...)`
  - `calcFeasibility(...)`
  - `deriveStatus(...)`

- `src/utils/prediction.js`
  - `predictFullChargeHour(...)`
  - `getPredictionConfidence(...)`
  - statistics helpers (`mean`, `sampleStdDev`)

- `src/utils/dayClassifier.js`
  - `classifyDay(prediction)`
  - weather icon/label mapping helpers

- `src/utils/formatters.js`
  - time/date formatting helpers used across UI

## 8) Safe Edit Strategy

1. If changing behavior, start in utilities (`energyCalc.js`, `prediction.js`) and update docs in the same commit.
2. If changing app-wide state shape, update `SimulatorContext.jsx` first, then all consuming tabs/components.
3. Keep thresholds centralized in utilities or `sitedata.json` instead of duplicating in components.
4. Re-run lint after edits.

## 9) Known Design Choices

- The app is deterministic for feasibility and alerts.
- Full-charge time uses a linear model with feature scaling.
- This is decision support, not a full electrochemical battery simulator.
