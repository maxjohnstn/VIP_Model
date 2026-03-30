import { useState, useMemo } from 'react';
import { useSimulator } from '../../context/useSimulator';
import StatusBanner from '../shared/StatusBanner';
import InfoPillRow from '../now/InfoPillRow';
import ApplianceGrid from '../now/ApplianceGrid';
import ResultBar from '../now/ResultBar';
import { deriveStatus, calcAvailableEnergy, calcFeasibility } from '../../utils/energyCalc';

function timeStrToMinutes(str) {
  const [h, m] = str.split(':').map(Number);
  return h * 60 + (m || 0);
}

function minutesToTimeStr(mins) {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

export default function NowTab() {
  const {
    currentHourData,
    todayHourly,
    todayPrediction,
    simulatedHour,
    simulatedTime,
    setSimulatedTime,
    site,
    siteData,
  } = useSimulator();

  const appliances = siteData.appliances;

  // Arrival time — defaults to now
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const [arrivalMinutes, setArrivalMinutes] = useState(nowMinutes);
  const isNow = Math.abs(arrivalMinutes - nowMinutes) < 10;

  // Appliance counts
  const initial = {};
  appliances.forEach((a) => { initial[a.id] = 0; });
  const [counts, setCounts] = useState(initial);

  const onIncrement = (id) => setCounts((c) => ({ ...c, [id]: c[id] + 1 }));
  const onDecrement = (id) => setCounts((c) => ({ ...c, [id]: Math.max(0, c[id] - 1) }));

  // Find the hourly row closest to arrival time
  const arrivalHourData = useMemo(() => {
    if (!todayHourly.length) return currentHourData;
    const found = todayHourly.find((row) => {
      const ts = new Date(row.timestamp);
      return (ts.getUTCHours() * 60 + ts.getUTCMinutes()) >= arrivalMinutes;
    });
    return found ?? todayHourly[todayHourly.length - 1] ?? currentHourData;
  }, [todayHourly, arrivalMinutes, currentHourData]);

  const status = useMemo(
    () => deriveStatus(isNow ? currentHourData : arrivalHourData, site),
    [currentHourData, arrivalHourData, site, isNow]
  );

  const soc = (isNow ? currentHourData : arrivalHourData)?.soc ?? 0;
  const weatherIcon = todayPrediction?.weather_icon ?? 'cloudy';
  const basePredictionHour = todayPrediction?.prediction_hour ?? null;

  const totalWh = useMemo(
    () => appliances.reduce((sum, appliance) => {
      const wh = appliance.energyWh ?? (appliance.watts * appliance.durationMinutes / 60);
      return sum + wh * (counts[appliance.id] ?? 0);
    }, 0),
    [appliances, counts]
  );

  // Energy calc from arrival time onwards
  const energyStats = useMemo(
    () => calcAvailableEnergy(
      todayHourly, arrivalMinutes, siteData, soc,
      appliances, counts, basePredictionHour
    ),
    [todayHourly, arrivalMinutes, siteData, soc, appliances, counts, basePredictionHour]
  );

  const predictedFullTime = useMemo(() => {
    if (!energyStats.updatedFullChargeHour) return todayPrediction?.predicted_full_charge_time ?? null;
    const h = Math.floor(energyStats.updatedFullChargeHour);
    const m = Math.round((energyStats.updatedFullChargeHour % 1) * 60);
    return `${String(h).padStart(2,'0')}:${String(Math.min(59,m)).padStart(2,'0')}`;
  }, [energyStats.updatedFullChargeHour, todayPrediction]);

  const feasibility = useMemo(
    () => calcFeasibility(totalWh, energyStats, todayHourly, arrivalMinutes),
    [totalWh, energyStats, todayHourly, arrivalMinutes]
  );

  // Available hours for the time picker (current hour → 23:00)
  const nowHour = Math.floor(nowMinutes / 60);
  const timeOptions = Array.from({ length: 24 - nowHour }, (_, i) => {
    const mins = (nowHour + i) * 60;
    return { label: minutesToTimeStr(mins), value: mins };
  });

  return (
    <div className="flex flex-col gap-4 pt-1 pb-4">
      <StatusBanner status={status} soc={soc} />

      {/* Arrival time picker */}
      <div className="px-4">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
          When are you arriving?
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {timeOptions.map(({ label, value }) => {
            const active = Math.abs(arrivalMinutes - value) < 30;
            return (
              <button
                key={value}
                onClick={() => setArrivalMinutes(value)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                  active
                    ? 'bg-teal-500/20 border-teal-500/50 text-teal-400'
                    : 'bg-surface border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                {value === nowMinutes - (nowMinutes % 60) ? 'Now' : label}
              </button>
            );
          })}
        </div>

        {/* SOC at arrival time */}
        {!isNow && arrivalHourData && (
          <p className="text-xs text-slate-500 mt-2">
            Battery at {minutesToTimeStr(arrivalMinutes)}:{' '}
            <span className={`font-semibold ${
              soc >= 60 ? 'text-teal-400' : soc >= 30 ? 'text-amber-400' : 'text-red-400'
            }`}>{soc?.toFixed(0)}%</span>
            {arrivalHourData.pv_power_w > 0 && (
              <span className="text-slate-500">
                {' '}· {arrivalHourData.pv_power_w?.toFixed(0)}W PV
              </span>
            )}
          </p>
        )}
      </div>

      <InfoPillRow
        weatherIcon={weatherIcon}
        soc={soc}
        predictedFullTime={predictedFullTime}
        simulatedHour={simulatedHour}
      />

      <ApplianceGrid
        appliances={appliances}
        counts={counts}
        onIncrement={onIncrement}
        onDecrement={onDecrement}
      />

      <ResultBar
        status={feasibility.status}
        message={feasibility.message}
        totalWh={totalWh}
      />
    </div>
  );
}