/**
 * SimulatorContext.jsx
 * --------------------
 * Pure display layer — all predictions, weather icons, and generation data
 * come directly from solar_simulation.py via simulation_output.json.
 *
 * NO physics re-calculation happens here. The context just:
 *   1. Picks the selected site's data from the forecast
 *   2. Selects the right date's rows and prediction
 *   3. Finds the current hour's row for live readings
 *   4. Passes everything through to components unchanged
 */
import { createContext, useState, useMemo, useCallback, useEffect } from 'react';
import siteConfig from '../data/sitedata.json';
import allSitesConfig from '../data/allsites.json';
import { useForecastData } from '../hooks/useForecastData';

export const SimulatorContext = createContext(null);

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function SimulatorProvider({ children }) {
  const { sites, generatedAt, error, loading } = useForecastData();

  // ── Site selection ────────────────────────────────────────────────────────
  const [selectedSiteName, setSelectedSiteName] = useState('Clyde CP2');

  const selectedSite = useMemo(
    () => sites.find((s) => s.name === selectedSiteName) ?? sites[0] ?? null,
    [sites, selectedSiteName]
  );

  // ── Appliances for selected site ──────────────────────────────────────────
  const siteAppliances = useMemo(() => {
    const found = allSitesConfig.sites.find((s) => s.name === selectedSiteName)
               ?? allSitesConfig.sites.find((s) => s.name === 'Clyde CP2');
    return found?.appliances ?? siteConfig.appliances;
  }, [selectedSiteName]);

  // ── Available dates ───────────────────────────────────────────────────────
  const availableDates = useMemo(() => {
    if (!selectedSite) return [];
    return Object.keys(selectedSite.rowsByDate).sort();
  }, [selectedSite]);

  // ── Default date = today (or nearest future) ──────────────────────────────
  const defaultDate = useMemo(() => {
    const today = todayStr();
    if (availableDates.includes(today)) return today;
    const future = availableDates.filter((d) => d >= today);
    if (future.length) return future[0];
    return availableDates[availableDates.length - 1] ?? today;
  }, [availableDates]);

  const now        = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const [selectedDate, setSelectedDateState]   = useState(todayStr());
  const [simulatedTime, setSimulatedTime]       = useState(nowMinutes);
  const [isOperatorMode, setIsOperatorMode]     = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen]   = useState(false);
  const [activeTechnicalIssues, setActiveTechnicalIssues]       = useState({});
  const [clearedTechnicalIssueIds, setClearedTechnicalIssueIds] = useState({});

  // Jump to correct date once forecast loads, and when site changes
  useEffect(() => {
    if (availableDates.length > 0) {
      setSelectedDateState(defaultDate);
    }
  }, [defaultDate]);                    // defaultDate already depends on availableDates

  useEffect(() => {
    if (availableDates.length > 0) {
      setSelectedDateState(defaultDate);
    }
  }, [selectedSiteName]);

  const resolveToAvailableDate = useCallback((dateStr) => {
    if (!dateStr) return defaultDate;
    if (availableDates.includes(dateStr)) return dateStr;
    const targetMs = new Date(`${dateStr}T12:00:00`).getTime();
    if (Number.isNaN(targetMs)) return defaultDate;
    return availableDates.reduce((closest, candidate) => {
      const cMs = new Date(`${closest}T12:00:00`).getTime();
      const aMs = new Date(`${candidate}T12:00:00`).getTime();
      return Math.abs(aMs - targetMs) < Math.abs(cMs - targetMs) ? candidate : closest;
    }, availableDates[0]);
  }, [availableDates, defaultDate]);

  const setSelectedDate = useCallback((dateStr) => {
    setSelectedDateState(resolveToAvailableDate(dateStr));
  }, [resolveToAvailableDate]);

  const registerTechnicalIssues = useCallback((issues) => {
    if (!issues?.length) return;
    setActiveTechnicalIssues((prev) => {
      const next = { ...prev };
      const nowIso = new Date().toISOString();
      let changed = false;
      issues.forEach((issue) => {
        if (!issue?.id || clearedTechnicalIssueIds[issue.id]) return;
        if (next[issue.id]) {
          const updated = { ...next[issue.id], ...issue, lastSeenAt: nowIso };
          if (Object.keys(updated).some((k) => updated[k] !== next[issue.id][k])) {
            next[issue.id] = updated; changed = true;
          }
        } else {
          next[issue.id] = { ...issue, raisedAt: nowIso, lastSeenAt: nowIso };
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [clearedTechnicalIssueIds]);

  const resolveTechnicalIssue = useCallback((issueId) => {
    if (!issueId) return;
    setClearedTechnicalIssueIds((prev) => ({ ...prev, [issueId]: true }));
    setActiveTechnicalIssues((prev) => {
      if (!prev[issueId]) return prev;
      const next = { ...prev };
      delete next[issueId];
      return next;
    });
  }, []);

  const simulatedHour = Math.floor(simulatedTime / 60) % 24;

  // ── Rows for selected date ────────────────────────────────────────────────
  // Mapped to the shape components expect (timestamp, soc, pv_power_w, gti, etc.)
  const mappedRowsByDate = useMemo(() => {
    if (!selectedSite) return {};
    const mapped = {};
    for (const [dateKey, rows] of Object.entries(selectedSite.rowsByDate)) {
      mapped[dateKey] = rows;   // already in correct shape from useForecastData
    }
    return mapped;
  }, [selectedSite]);

  const todayHourly = useMemo(
    () => mappedRowsByDate[selectedDate] ?? [],
    [mappedRowsByDate, selectedDate]
  );

  // ── Current hour row — closest to simulated time ──────────────────────────
  const currentHourData = useMemo(() => {
    if (!todayHourly.length) return null;
    const found = todayHourly.find((row) => {
      const ts = new Date(row.timestamp);
      return (ts.getUTCHours() * 60 + ts.getUTCMinutes()) === simulatedTime;
    });
    if (found) return found;
    return (
      todayHourly.filter((row) => {
        const ts = new Date(row.timestamp);
        return (ts.getUTCHours() * 60 + ts.getUTCMinutes()) <= simulatedTime;
      }).at(-1) ?? todayHourly[0] ?? null
    );
  }, [todayHourly, simulatedTime]);

  // ── Predictions — straight from Python, no JS re-calculation ─────────────
  const predictionsByDate = useMemo(
    () => selectedSite?.predictionsByDate ?? {},
    [selectedSite]
  );

  const todayPrediction = useMemo(
    () => predictionsByDate[selectedDate] ?? null,
    [predictionsByDate, selectedDate]
  );

  // ── siteData — the shape PlanTab and NowTab consume via siteData ──────────
  const siteData = useMemo(() => {
    // Get per-site battery specs from allsites.json
    const siteBattery = allSitesConfig.sites.find((s) => s.name === selectedSiteName)
                     ?? allSitesConfig.sites.find((s) => s.name === 'Clyde CP2');

    const batteryCapacityWh  = siteBattery?.battery_capacity_wh  ?? siteConfig.physicsConstants.batteryCapacityWh;
    const usableCapacityWh   = siteBattery?.usable_capacity_wh   ?? siteConfig.physicsConstants.usableCapacityWh;
    const inverterLimitW     = siteBattery?.inverter_limit_w      ?? siteConfig.physicsConstants.maxInverterPowerW;
    // min_soc is always 50% of total for AGM 50% DoD batteries
    const minSoc = 50;

    return {
      // Base siteConfig for fields energyCalc needs
      ...siteConfig,
      // Override physics constants with per-site values
      physicsConstants: {
        ...siteConfig.physicsConstants,
        batteryCapacityWh,
        usableCapacityWh,
        maxInverterPowerW: inverterLimitW,
      },
      energy: {
        ...siteConfig.energy,
        min_soc: minSoc,
      },
      site: {
        ...siteConfig.site,
        name:                selectedSiteName,
        battery_capacity_wh: batteryCapacityWh,
        usable_capacity_wh:  usableCapacityWh,
      },
      available_dates: availableDates,
      daily_data: Object.fromEntries(
        availableDates.map((d) => [d, { hourly: mappedRowsByDate[d] ?? [] }])
      ),
      predictions:  predictionsByDate,
      appliances:   siteAppliances,
    };
  }, [availableDates, mappedRowsByDate, predictionsByDate, siteAppliances, selectedSiteName]);

  const value = {
    // ── Core fields all components use ──────────────────────────────────────
    siteData,
    availableDates,
    selectedDate,
    setSelectedDate,
    resolveToAvailableDate,
    simulatedTime,
    setSimulatedTime,
    simulatedHour,
    isOperatorMode,
    setIsOperatorMode,
    isSimulatorOpen,
    setIsSimulatorOpen,
    technicalIssues:        Object.values(activeTechnicalIssues),
    registerTechnicalIssues,
    resolveTechnicalIssue,
    todayHourly,
    currentHourData,
    todayPrediction,        // ← from Python, not JS model
    site:                   siteData.site,
    predictionsByDate,      // ← from Python, not JS model
    rowsByDate:             mappedRowsByDate,
    // ── Multi-site ───────────────────────────────────────────────────────────
    allSites:               sites,
    selectedSiteName,
    setSelectedSiteName,
    // ── Meta ─────────────────────────────────────────────────────────────────
    generatedAt,
    forecastLoading:        loading,
    forecastError:          error,
  };

  return (
    <SimulatorContext.Provider value={value}>
      {children}
    </SimulatorContext.Provider>
  );
}