/**
 * useForecastData.js
 * ------------------
 * Fetches /data/simulation_output.json (written by solar_simulation.py).
 * Returns data shaped for direct use — NO re-calculation in React.
 * Python is the single source of truth for all predictions and physics.
 */
import { useState, useEffect } from 'react';

const FORECAST_URL = '/data/simulation_output.json';
const REFRESH_MS   = 5 * 60 * 1000;

/**
 * Convert one simulation hourly entry to the row shape components expect.
 *
 * Components use these fields from hourly rows:
 *   timestamp, soc, pv_power_w, pv_energy_wh  — TimelineBar, energyCalc
 *   gti, clearsky_gti                           — energyCalc (ratio for available energy)
 *   voltage, temperature                        — operator panel (null = not available)
 */
function toRow(h, capacity_kwp) {
  const dt    = new Date(h.time);
  const pv_w  = h.pv_w ?? 0;

  // GTI proxy for energyCalc.js — derived from PV output vs site capacity.
  // This is only used for the appliance feasibility calculation in NowTab,
  // NOT for weather icons or predictions (those come from Python directly).
  const peak_w      = (capacity_kwp ?? 5.4) * 1000 * 0.85;
  const gti_proxy   = peak_w > 0 ? (pv_w / peak_w) * 900 : 0;

  return {
    datetime:         h.time,
    date:             dt.toISOString().slice(0, 10),
    hour:             dt.getUTCHours(),
    minute:           dt.getUTCMinutes(),
    timestamp:        h.time,                   // components use both datetime and timestamp
    soc:              h.soc_pct  ?? null,
    pv_power_w:       pv_w,
    pv_available_w:   h.pv_available ?? pv_w,  // uncurtailed PV estimate
    pv_energy_wh:     pv_w * 1.0,
    gti:              gti_proxy,
    clearsky_gti:     600,                       // fixed reference for ratio calc
    voltage:          null,
    voltage_max:      null,
    temperature:      null,
    isForecast:       true,
  };
}

/**
 * Map Python daily summary → predictionsByDate entry shape.
 *
 * Components read from predictions[date]:
 *   predicted_full_charge_time  — ForecastTab, NowTab, PlanTab
 *   weather_icon                — NowTab (InfoPillRow), WeekStrip
 *   day_type                    — WeekStrip (same as weather_icon)
 *   confidence                  — WeekStrip, VisitPlanner
 *   weather_description         — WeatherSummary
 *   prediction_hour             — energyCalc (decimal hour for energy window)
 *   daily_gti_kwh               — optional, used in some operator views
 */
function toPrediction(simDaily) {
  if (!simDaily) return null;

  const icon       = simDaily.weather_icon ?? 'overcast';
  const fullCharge = simDaily.full_charge_time ?? simDaily.fc_model_time ?? null;

  // Parse full_charge_time string ("14:30") → decimal hour (14.5) for energyCalc
  let prediction_hour = null;
  if (fullCharge) {
    const [h, m] = fullCharge.split(':').map(Number);
    if (Number.isFinite(h) && Number.isFinite(m)) {
      prediction_hour = h + m / 60;
    }
  }

  const confidenceMap = { high: 'high', moderate: 'medium', early_estimate: 'low' };

  return {
    predicted_full_charge_time: fullCharge,
    actual_full_charge_time:    null,
    day_type:                   icon,
    weather_icon:               icon,
    confidence:                 confidenceMap[simDaily.fc_confidence] ?? 'low',
    weather_description:        fullCharge
      ? `Predicted full charge around ${fullCharge}.`
      : 'No full charge predicted today.',
    prediction_hour,
    daily_gti_kwh:              null,
    gen_kwh:                    simDaily.gen_kwh ?? null,
    isForecast:                 true,
  };
}

export function useForecastData() {
  const [sites, setSites]         = useState([]);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [error, setError]         = useState(null);
  const [loading, setLoading]     = useState(true);

  async function load() {
    try {
      const resp = await fetch(`${FORECAST_URL}?t=${Date.now()}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status} — could not load ${FORECAST_URL}`);
      const data = await resp.json();

      const shaped = (data.sites ?? []).map((s) => {
        // Group hourly rows by date
        const rowsByDate = {};
        for (const h of s.hourly ?? []) {
          const row = toRow(h, s.capacity_kwp);
          if (!rowsByDate[row.date]) rowsByDate[row.date] = [];
          rowsByDate[row.date].push(row);
        }
        for (const rows of Object.values(rowsByDate)) {
          rows.sort((a, b) => a.datetime.localeCompare(b.datetime));
        }

        // Build predictions keyed by date — straight from Python output
        const predictionsByDate = {};
        for (const d of s.daily ?? []) {
          predictionsByDate[d.date] = toPrediction(d);
        }

        return {
          name:             s.name,
          capacity_kwp:     s.capacity_kwp,
          system_derating:  s.system_derating ?? 1.0,
          current_soc:      s.current_soc_pct,
          soc_source:       s.soc_source,
          weather_mode:     s.weather_mode,
          daily:            s.daily ?? [],
          rowsByDate,
          predictionsByDate,
        };
      });

      setSites(shaped);
      setGeneratedAt(data.generated_at);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  return { sites, generatedAt, error, loading };
}