# Editing & Extension Guide — VIP Solar Dashboard

This guide covers the most common changes you're likely to make: adding sites, updating appliances, changing physics constants, and extending the dashboard UI.

---

## Adding or updating a site

Site configuration lives in two places:

### 1. `solar_simulation.py` — Python physics config

Find the `LOCATIONS` list near the top of the file. Each site is a dictionary:

```python
{
    "name": "Chryston",
    "lat": 55.916,
    "lon": -4.083,
    "tilt": 30,
    "azimuth": 180,
    "capacity_kwp": 0.78,
    "system_derating": 1.0,
    "battery_capacity_wh": 3840,
    "usable_capacity_wh": 1920,
    "inverter_limit_w": 1000,
    "inverter_idle_w": 8,
    "always_on_load_w": 0.0,
    "station_id": "chryston-01",   # Solar Guardian API ID
}
```

To add a new site, copy an existing entry, update all values, and add the correct `station_id` for the Solar Guardian API.

### 2. `src/data/allsites.json` — dashboard config

Each site entry controls what the React app uses for energy calculations and what appliances are shown:

```json
{
  "name": "Chryston",
  "battery_capacity_wh": 3840,
  "usable_capacity_wh": 1920,
  "inverter_limit_w": 1000,
  "appliances": [
    {
      "id": "kettle",
      "label": "Kettle",
      "watts": 1500,
      "typical_duration_min": 3
    }
  ]
}
```

The `name` field must match exactly what Python writes into `simulation_output.json` — this is how `SimulatorContext` links the JSON data to the correct site config.

**Also update the TopBar dropdown** in `src/components/layout/TopBar.jsx` to include the new site name in the site switcher.

---

## Updating appliances

Appliances for each site are in `src/data/allsites.json` under the `appliances` array.

Each appliance:

```json
{
  "id": "pump",
  "label": "Water Pump",
  "watts": 250,
  "typical_duration_min": 30
}
```

- `id` — unique string, used as a React key
- `watts` — power draw in watts
- `typical_duration_min` — how long the appliance typically runs; used by `energyCalc.js` to calculate `requestedWh`

The feasibility check (`go / wait / insufficient`) is driven entirely by these values — no code changes required, just update the JSON.

---

## Changing physics constants

### DoD floor (`min_soc`)

In `src/data/sitedata.json`:
```json
"energy": {
  "min_soc": 50
}
```

This is 50% of **total** battery capacity (AGM 50% DoD). Do not lower this — it represents the hard cutoff for the battery.

### Per-site battery capacity

In `src/data/allsites.json`, update `battery_capacity_wh` and `usable_capacity_wh` for the relevant site. `SimulatorContext` reads these and passes them to `energyCalc.js` when the site is selected.

### System derating

In `solar_simulation.py`, update `system_derating` in the `LOCATIONS` entry for the site. This requires re-running the simulation to take effect.

---

## Updating the full-charge prediction model

The prediction is calculated in Python (`solar_simulation.py`, Block 7) and written to `daily[].full_charge_time` in the JSON. A JavaScript port lives in `src/utils/prediction.js` but is not currently used for displayed predictions — all predictions come from Python output.

If you update the regression model, update both the Python and JavaScript versions to keep them in sync.

---

## Adding a new tab

1. Create a new component in `src/components/tabs/`, e.g. `StatsTab.jsx`
2. Add a tab entry to `src/components/layout/BottomNav.jsx`
3. Add the corresponding route/case to `src/components/layout/AppShell.jsx`
4. Consume data via `useSimulator()` — never fetch or calculate independently

```jsx
import { useSimulator } from '../../context/useSimulator';

export default function StatsTab() {
  const { todayHourly, siteData } = useSimulator();
  // ...
}
```

---

## Adding operator alerts

Technical alerts are in `src/components/operator/TechnicalAlerts.jsx`. Each alert is driven by conditions on `currentHourData` (from `SimulatorContext`):

```jsx
const alerts = [];

if (currentHourData?.voltage >= siteData.chargeVoltageThreshold) {
  alerts.push({ type: 'overvoltage', message: 'Battery voltage above charge threshold' });
}
```

To add a new alert, add a condition and push to the `alerts` array. The `AlertCard` shared component handles display.

> **Note:** `voltage` and `temperature` are `null` for all forecast rows — only the current live hour has real values. Alert logic must handle `null` gracefully.

---

## Updating per-site voltage thresholds

Currently all sites use CP2 voltage thresholds for alert detection. Per-site thresholds are a known pending item.

To fix this, add a `voltage_thresholds` object to each site entry in `allsites.json`:

```json
{
  "name": "Chryston",
  "voltage_thresholds": {
    "charge": 28.8,
    "low": 24.0,
    "critical": 23.0
  }
}
```

Then update `TechnicalAlerts.jsx` and `deriveStatus()` in `energyCalc.js` to read from `siteData.voltage_thresholds` instead of hardcoded constants.

---

## Pushing changes to the live dashboard

After making changes:

```bash
# Regenerate simulation data if physics changed
python3 solar_simulation.py

# Commit and push
git add .
git commit -m "describe your change"
git push
```

GitHub Pages redeploys automatically within ~1 minute.
