import { createContext, useContext, useState, useMemo, useCallback } from 'react';
import siteConfig from '../data/sitedata.json';
import masterData from '../data/masterdata.json';
import { mean, predictFullChargeHour, sampleStdDev } from '../utils/prediction';

const SimulatorContext = createContext(null);

export function SimulatorProvider({ children }) {
  // This provider is the app's data engine.
  // See README_ARCHITECTURE.md for state ownership and DASHBOARD_CALCULATIONS.md for formulas.
  const rowsByDate = useMemo(() => {
    const grouped = {};
    for (const row of masterData.rows ?? []) {
      if (!grouped[row.date]) grouped[row.date] = [];
      grouped[row.date].push(row);
    }
    Object.keys(grouped).forEach((dateKey) => {
      grouped[dateKey].sort((a, b) => a.datetime.localeCompare(b.datetime));
    });
    return grouped;
  }, []);

  const availableDates = useMemo(
    () => Object.keys(rowsByDate).sort(),
    [rowsByDate]
  );

  const latestDate = availableDates[availableDates.length - 1];
  const firstDate = latestDate;
  const now = new Date();
  const nowMinutes = now.getHours() * 60;

  const [selectedDate, setSelectedDateState] = useState(firstDate);
  const [simulatedTime, setSimulatedTime] = useState(nowMinutes);
  const [isOperatorMode, setIsOperatorMode] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [activeTechnicalIssues, setActiveTechnicalIssues] = useState({});
  const [clearedTechnicalIssueIds, setClearedTechnicalIssueIds] = useState({});

  const resolveToAvailableDate = useCallback((dateStr) => {
    if (!dateStr) return firstDate;
    if (availableDates.includes(dateStr)) return dateStr;

    const targetMs = new Date(`${dateStr}T12:00:00`).getTime();
    if (Number.isNaN(targetMs)) return firstDate;

    return availableDates.reduce((closest, candidate) => {
      const closestMs = new Date(`${closest}T12:00:00`).getTime();
      const candidateMs = new Date(`${candidate}T12:00:00`).getTime();
      const closestDiff = Math.abs(closestMs - targetMs);
      const candidateDiff = Math.abs(candidateMs - targetMs);
      return candidateDiff < closestDiff ? candidate : closest;
    }, availableDates[0]);
  }, [availableDates, firstDate]);

  const setSelectedDate = useCallback((dateStr) => {
    setSelectedDateState(resolveToAvailableDate(dateStr));
  }, [resolveToAvailableDate]);

  const registerTechnicalIssues = useCallback((issues) => {
    if (!issues?.length) return;
    setActiveTechnicalIssues((prev) => {
      const next = { ...prev };
      const nowIso = new Date().toISOString();
      let hasChanges = false;

      issues.forEach((issue) => {
        if (!issue?.id || clearedTechnicalIssueIds[issue.id]) return;

        if (next[issue.id]) {
          const updated = {
            ...next[issue.id],
            ...issue,
            lastSeenAt: nowIso,
          };
          const prevIssue = next[issue.id];
          const changed = Object.keys(updated).some((key) => updated[key] !== prevIssue[key]);
          if (changed) {
            next[issue.id] = updated;
            hasChanges = true;
          }
        } else {
          next[issue.id] = {
            ...issue,
            raisedAt: nowIso,
            lastSeenAt: nowIso,
          };
          hasChanges = true;
        }
      });

      return hasChanges ? next : prev;
    });
  }, [clearedTechnicalIssueIds]);

  const resolveTechnicalIssue = useCallback((issueId) => {
    if (!issueId) return;

    setClearedTechnicalIssueIds((prev) => ({
      ...prev,
      [issueId]: true,
    }));

    setActiveTechnicalIssues((prev) => {
      if (!prev[issueId]) return prev;
      const next = { ...prev };
      delete next[issueId];
      return next;
    });
  }, []);

  const simulatedHour = Math.floor(simulatedTime / 60) % 24;

  const mappedRowsByDate = useMemo(() => {
    const mapped = {};
    for (const [dateKey, rows] of Object.entries(rowsByDate)) {
      // Normalize raw telemetry into the shared row shape consumed by all tabs.
      mapped[dateKey] = rows.map((row) => ({
        timestamp: row.datetime,
        soc: row.bat_soc_pct,
        voltage: row.bat_voltage_mean,
        voltage_max: row.bat_voltage_max,
        temperature: row.bat_temp_c,
        pv_power_w: row.pv_power_w,
        pv_energy_wh: row.pv_energy_wh,
        gti: row.gti,
        clearsky_gti: row.clearsky_gti,
      }));
    }
    return mapped;
  }, [rowsByDate]);

  const todayHourly = useMemo(
    () => mappedRowsByDate[selectedDate] ?? [],
    [mappedRowsByDate, selectedDate]
  );

  const currentHourData = useMemo(() => {
    if (!todayHourly.length) return null;

    const found = todayHourly.find((row) => {
      const ts = new Date(row.timestamp);
      const mins = ts.getHours() * 60 + ts.getMinutes();
      return mins === simulatedTime;
    });
    if (found) return found;

    const atOrBefore = todayHourly
      .filter((row) => {
        const ts = new Date(row.timestamp);
        const mins = ts.getHours() * 60 + ts.getMinutes();
        return mins <= simulatedTime;
      })
      .at(-1);

    return atOrBefore ?? todayHourly[0] ?? null;
  }, [todayHourly, simulatedTime]);

  const predictionsByDate = useMemo(() => {
    const output = {};

    for (const dateKey of availableDates) {
      const dayRows = mappedRowsByDate[dateKey] ?? [];
      if (!dayRows.length) {
        output[dateKey] = null;
        continue;
      }

      const hour8 = dayRows.filter((r) => new Date(r.timestamp).getHours() === 8);
      const before9 = dayRows.filter((r) => {
        const dt = new Date(r.timestamp);
        return dt.getHours() < 9;
      });
      const latestBefore9 = before9.at(-1);
      const soc8am = hour8.length ? mean(hour8.map((r) => r.soc)) : latestBefore9?.soc;

      const morn = dayRows.filter((r) => {
        const h = new Date(r.timestamp).getHours();
        return h >= 7 && h <= 9;
      });
      const forecastMornGti = mean(morn.map((r) => r.gti));
      const clearskyMornGti = mean(morn.map((r) => r.clearsky_gti));
      const forecastMornCsRatio = Number.isFinite(forecastMornGti) && Number.isFinite(clearskyMornGti) && clearskyMornGti > 0
        ? forecastMornGti / clearskyMornGti
        : NaN;

      const gtiStd = sampleStdDev(dayRows.filter((r) => r.gti > 10).map((r) => r.gti));
      const firstSoc = dayRows[0]?.soc;
      const socDeficit = Number.isFinite(firstSoc) ? 100 - firstSoc : NaN;
      const forecastMeanGti = mean(dayRows.map((r) => r.gti));

      const tempMornRows = dayRows.filter((r) => {
        const h = new Date(r.timestamp).getHours();
        return h >= 6 && h <= 8;
      });
      const batTempMorn = mean(tempMornRows.map((r) => r.temperature));

      const month = Number(dateKey.split('-')[1]);
      // Build model features for this day, then run the linear full-charge predictor.
      const pred = predictFullChargeHour(
        {
          soc_8am: soc8am,
          forecast_morn_gti: forecastMornGti,
          forecast_morn_cs_ratio: forecastMornCsRatio,
          gti_std: gtiStd,
          soc_deficit: socDeficit,
          forecast_mean_gti: forecastMeanGti,
          bat_temp_morn: batTempMorn,
          current_soc: dayRows[0]?.soc,
          clearsky_morn_gti: clearskyMornGti,
          clearsky_mean_gti: mean(dayRows.map((r) => r.clearsky_gti)),
          start_soc: firstSoc,
          month,
        },
        Math.floor(simulatedTime / 60)
      );

      const meanCsky = mean(dayRows.map((r) => r.clearsky_gti));
      const ratio = Number.isFinite(forecastMeanGti) && Number.isFinite(meanCsky) && meanCsky > 0
        ? forecastMeanGti / meanCsky
        : 0;

      let weatherIcon = 'overcast';
      if (ratio > 0.75) weatherIcon = 'sunny';
      else if (ratio > 0.5) weatherIcon = 'partly_cloudy';
      else if (ratio > 0.25) weatherIcon = 'cloudy';
      else weatherIcon = 'rainy';

      const confidenceMap = {
        high: 'high',
        moderate: 'medium',
        early_estimate: 'low',
      };

      const dailyGtiKwh = (dayRows.reduce((sum, r) => sum + (r.gti || 0), 0) * (10 / 60)) / 1000;

      output[dateKey] = {
        predicted_full_charge_time: pred.predicted_time_str,
        actual_full_charge_time: null,
        day_type: weatherIcon,
        confidence: confidenceMap[pred.confidence] ?? 'low',
        weather_description: `Predicted full charge around ${pred.predicted_time_str} using live model features from this day.`,
        weather_icon: weatherIcon,
        daily_gti_kwh: Number(dailyGtiKwh.toFixed(2)),
        prediction_hour: pred.predicted_hour,
      };
    }

    return output;
  }, [availableDates, mappedRowsByDate, simulatedTime]);

  const todayPrediction = useMemo(
    () => predictionsByDate[selectedDate] ?? null,
    [predictionsByDate, selectedDate]
  );

  const siteData = useMemo(() => ({
    ...siteConfig,
    available_dates: availableDates,
    daily_data: Object.fromEntries(
      availableDates.map((dateKey) => [dateKey, { hourly: mappedRowsByDate[dateKey] ?? [] }])
    ),
    predictions: predictionsByDate,
    appliances: siteConfig.appliances,
  }), [availableDates, mappedRowsByDate, predictionsByDate]);

  const value = {
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
    technicalIssues: Object.values(activeTechnicalIssues),
    registerTechnicalIssues,
    resolveTechnicalIssue,
    todayHourly,
    currentHourData,
    todayPrediction,
    site: siteConfig.site,
    predictionsByDate,
    rowsByDate: mappedRowsByDate,
  };

  return (
    <SimulatorContext.Provider value={value}>
      {children}
    </SimulatorContext.Provider>
  );
}

export function useSimulator() {
  const ctx = useContext(SimulatorContext);
  if (!ctx) throw new Error('useSimulator must be used inside SimulatorProvider');
  return ctx;
}
