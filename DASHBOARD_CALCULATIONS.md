# VIP Dashboard Calculations and Model Notes

This file explains exactly how calculations are performed, where each calculation lives in code, and how outputs feed UI decisions.

Related docs:
- Overview: [README.md](README.md)
- Architecture and ownership: [README_ARCHITECTURE.md](README_ARCHITECTURE.md)
- Editing workflow: [README_EDITING_GUIDE.md](README_EDITING_GUIDE.md)

## 1) Data Inputs and Normalization

Raw sources:
- `src/data/masterdata.json`
- `src/data/sitedata.json`

Normalization location:
- `src/context/SimulatorContext.jsx`

Each telemetry row is mapped to:
- `timestamp`
- `soc`
- `voltage`
- `voltage_max`
- `temperature`
- `pv_power_w`
- `pv_energy_wh`
- `gti`
- `clearsky_gti`

Rows are grouped by day, sorted by timestamp, then exposed as `todayHourly` and `rowsByDate`.

## 2) Energy Availability Model

Function:
- `calcAvailableEnergy(...)` in `src/utils/energyCalc.js`

### 2.1 Core parameters used

From `src/data/sitedata.json`:
- `batteryCapacityWh`: 9600
- `min_soc`: 20%
- `maxChargePowerW`: 4800
- `avgChargeRateW`: 294
- `panelFactor`: 0.9968
- `mpptEfficiency`: 0.998
- `intervalHours`: 0.1667 (10 min)

### 2.2 Initial battery state

$$
	ext{currentBatteryWhRaw} = \frac{\text{currentSoc}}{100} \times \text{batteryCapacityWh}
$$

$$
	ext{minSocWh} = \text{batteryCapacityWh} \times \frac{\text{minSoc}}{100}
$$

Current battery energy is clamped between `minSocWh` and full capacity.

### 2.3 Appliance power model

For each appliance:
- Energy from `energyWh` or fallback formulas.
- Duration from `durationMinutes` or inferred from energy/power.
- Power from `watts` or inferred from energy and duration.

Loads are split into:
- background load (`isBackground === true`)
- active user-selected load (`userSelectable !== false` and count > 0)

### 2.4 Per-interval battery evolution

For each future row after `simulatedTime`:

1. Compute interval duration `deltaHours`.
2. Compute PV power:
	- use `pv_power_w` if present
	- otherwise estimate from irradiance:

$$
	ext{grossPvW} = \text{gti} \times \text{panelFactor} \times \text{mpptEfficiency}
$$

3. Compute total load power:

$$
	ext{totalLoadWatts} = \text{backgroundLoadWatts} + \text{activeApplianceWatts}
$$

4. Compute net battery power:

$$
	ext{netBatteryW} = \text{grossPvW} - \text{totalLoadWatts}
$$

When charging (`netBatteryW > 0`), cap by `maxChargePowerW`.

5. Apply energy delta and clamp battery bounds:

$$
\Delta Wh = \text{netBatteryW} \times \text{deltaHours}
$$

Track:
- `remainingSolarWh` (positive battery gain)
- `batteryDischargeWh` (battery draw)
- `pvWhUsedForLoad`
- `batteryCostWh` (active appliance demand not offset by PV)

### 2.5 Returned values and interpretation

Returned fields include:
- `currentBatteryWh`
- `minSocWh`
- `endBatteryWh`
- `totalAvailableWh = max(0, endBatteryWh - minSocWh)`
- `delayHours = batteryCostWh / avgChargeRateW`
- `updatedFullChargeHour = ridgePredictionHour + delayHours` (if prediction exists)

## 3) Feasibility Decision Logic

Function:
- `calcFeasibility(...)` in `src/utils/energyCalc.js`

Statuses:
- `idle`: requested energy is zero
- `go`: requestedWh <= immediate available battery above reserve
- `wait`: requestedWh <= totalAvailableWh by end of day
- `insufficient`: requestedWh exceeds total available today

For `wait`, the function searches the earliest future timestamp where cumulative available energy reaches the requested load.

## 4) Status Banner State Machine

Function:
- `deriveStatus(...)` in `src/utils/energyCalc.js`

Rules in order:
1. `offline` if no current telemetry row
2. `curtailment` if `soc >= 99` or `voltage >= charge_threshold_voltage`
3. `low` if PV active and SOC < 20
4. `charging` if PV active (and not low)
5. `critical` if SOC < 10
6. `low` if SOC < 20
7. `idle` otherwise

## 5) Full-Charge Time Prediction Model

File:
- `src/utils/prediction.js`

### 5.1 Model form

Linear model on standardized inputs:

$$
\hat{y} = b_0 + \sum_{i=1}^{n} w_i z_i
$$

with:

$$
z_i = \frac{x_i - \mu_i}{\sigma_i}
$$

Predicted hour is clamped to `[6, 20]` and formatted to `HH:MM`.

### 5.2 Features used

- `soc_8am`
- `forecast_morn_gti`
- `forecast_morn_cs_ratio`
- `gti_std`
- `soc_deficit`
- `forecast_mean_gti`
- `bat_temp_morn`

### 5.3 Feature construction location

Computed in `src/context/SimulatorContext.jsx` when building `predictionsByDate`.

Important derived formulas:

$$
	ext{forecast_morn_cs_ratio} = \frac{\text{forecast_morn_gti}}{\text{clearsky_morn_gti}}
$$

$$
	ext{soc_deficit} = 100 - \text{firstSocOfDay}
$$

`gti_std` is sample standard deviation over rows where `gti > 10`.

### 5.4 Missing data fallback logic

Fallbacks include:
- `soc_8am`: `current_soc`, then 50
- `forecast_morn_gti`: `0.6 * clearsky_morn_gti`, then `0.6 * 100`
- `forecast_morn_cs_ratio`: `0.6`
- `gti_std`: `80`
- `soc_deficit`: `100 - start_soc` fallback path
- `forecast_mean_gti`: `0.6 * clearsky_mean_gti`
- `bat_temp_morn`: seasonal default (16 Apr-Sep, 10 otherwise)

### 5.5 Confidence output

Function:
- `getPredictionConfidence(...)`

Rules:
- `high`: current hour >= 10 and no missing SOC/forecast inputs
- `moderate`: current hour >= 8 and SOC available
- `early_estimate`: otherwise

UI mapping in context:
- `high -> high`
- `moderate -> medium`
- `early_estimate -> low`

## 6) Weather and Day Classification

### 6.1 Weather icon class

In `SimulatorContext.jsx`:

$$
	ext{ratio} = \frac{\text{forecastMeanGti}}{\text{meanClearSkyGti}}
$$

Thresholds:
- `ratio > 0.75`: `sunny`
- `ratio > 0.5`: `partly_cloudy`
- `ratio > 0.25`: `cloudy`
- otherwise: `rainy`

### 6.2 Daily GTI proxy

$$
	ext{daily_gti_kwh} = \frac{\sum gti \times (10/60)}{1000}
$$

This uses a 10-minute sample assumption.

### 6.3 Plan strip color

Function:
- `classifyDay(prediction)` in `src/utils/dayClassifier.js`

Rules:
- `red` if missing prediction, low confidence, or `daily_gti_kwh < 1.5`
- `green` if predicted full charge is before 12:00 and confidence is high/medium
- `amber` otherwise

## 7) Alerts and Technical Rules

### 7.1 Forecast tab alerts

File:
- `src/components/forecast/AlertSection.jsx`

User alerts:
- poor solar day: no full-charge prediction and `daily_gti_kwh < 1.5`
- low battery advisory: SOC < 20

Operator alerts (shown in forecast only when operator mode is enabled):
- overvoltage if any `voltage > site.max_voltage`
- sub-zero charging if `temperature < 0` and `pv_power_w > 0`
- low SOC duration if SOC < 20 for at least 2 hours

### 7.2 Operator technical issue tracker

File:
- `src/components/operator/TechnicalAlerts.jsx`

Generated alerts are registered into context and can be cleared by issue ID.
Each issue stores `raisedAt` and `lastSeenAt` metadata in context state.

## 8) Practical Limits

This app combines:
- deterministic planning logic (energy/feasibility/alerts)
- a learned linear predictor for full-charge time

It is intended as operational decision support, not an electrochemical battery simulator.
