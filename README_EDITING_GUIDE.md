# VIP Dashboard Editing Guide

This guide helps a new developer make confident edits without breaking core behavior.

Related docs:
- Overview: [README.md](README.md)
- Architecture: [README_ARCHITECTURE.md](README_ARCHITECTURE.md)
- Calculations: [DASHBOARD_CALCULATIONS.md](DASHBOARD_CALCULATIONS.md)

## 1) Common Change Scenarios

### Update battery/site constraints

Edit: `src/data/sitedata.json`

Examples:
- `site.battery_capacity_wh`
- `site.max_voltage`
- `energy.min_soc`
- appliance definitions (`watts`, `durationMinutes`, `energyWh`, `isBackground`)

Impact:
- Availability and feasibility calculations
- status/alert behavior
- operator metrics

### Change energy feasibility behavior

Edit: `src/utils/energyCalc.js`

Functions to modify:
- `calcAvailableEnergy`
- `calcFeasibility`
- `deriveStatus`

Also update:
- [DASHBOARD_CALCULATIONS.md](DASHBOARD_CALCULATIONS.md)

### Change prediction behavior

Edit: `src/utils/prediction.js`

Functions to modify:
- `predictFullChargeHour`
- `getPredictionConfidence`

Also update:
- [DASHBOARD_CALCULATIONS.md](DASHBOARD_CALCULATIONS.md)

### Change app state, simulation controls, or date behavior

Edit: `src/context/SimulatorContext.jsx` and `src/components/layout/SimulatorPanel.jsx`

### Change tab UI only

Edit tab files:
- `src/components/tabs/NowTab.jsx`
- `src/components/tabs/ForecastTab.jsx`
- `src/components/tabs/PlanTab.jsx`

## 2) Data Contract Notes

Normalized telemetry row shape used by the app:
- `timestamp`
- `soc`
- `voltage`
- `voltage_max`
- `temperature`
- `pv_power_w`
- `pv_energy_wh`
- `gti`
- `clearsky_gti`

If you rename or remove fields, update:
- mapping in `SimulatorContext.jsx`
- utility functions that consume rows
- relevant docs

## 3) Alert Logic Locations

User-facing alerts:
- `src/components/forecast/AlertSection.jsx`

Operator technical issues:
- `src/components/operator/TechnicalAlerts.jsx`
- persistence and clearing in `src/context/SimulatorContext.jsx`

## 4) Checklist Before Finishing Any Logic Change

1. Confirm thresholds are changed in one place only.
2. Verify any dependent UI labels still describe the new behavior.
3. Update [DASHBOARD_CALCULATIONS.md](DASHBOARD_CALCULATIONS.md) if formulas or thresholds changed.
4. Update [README_ARCHITECTURE.md](README_ARCHITECTURE.md) if ownership or data flow changed.
5. Run lint:

```bash
npm run lint
```

## 5) Suggested Reading Order For New Joiners

1. [README.md](README.md)
2. [README_ARCHITECTURE.md](README_ARCHITECTURE.md)
3. [DASHBOARD_CALCULATIONS.md](DASHBOARD_CALCULATIONS.md)
4. Core code path:
   - `src/context/SimulatorContext.jsx`
   - `src/components/tabs/NowTab.jsx`
   - `src/utils/energyCalc.js`
   - `src/utils/prediction.js`
