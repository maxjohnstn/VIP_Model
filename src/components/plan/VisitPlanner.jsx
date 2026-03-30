import { useState, useMemo } from 'react';
import ApplianceCard from '../now/ApplianceCard';
import NotifyButton from './NotifyButton';
import { calcAvailableEnergy, calcFeasibility } from '../../utils/energyCalc';
import { weatherEmoji, classifyDay } from '../../utils/dayClassifier';

const statusColours = {
  idle: 'text-slate-400',
  go: 'text-brand-green',
  wait: 'text-brand-amber',
  insufficient: 'text-brand-red',
};

const statusIcons = {
  idle: '',
  go: '✅',
  wait: '⏳',
  insufficient: '❌',
};

export default function VisitPlanner({ selectedDate, prediction, hourlyRows, appliances, siteData }) {
  const [arrivalHour, setArrivalHour] = useState(10);

  const selectableAppliances = useMemo(
    () => appliances.filter((a) => a.userSelectable !== false),
    [appliances]
  );

  const initial = {};
  appliances.forEach((a) => { initial[a.id] = 0; });
  const [counts, setCounts] = useState(initial);

  const onIncrement = (id) => setCounts((c) => ({ ...c, [id]: c[id] + 1 }));
  const onDecrement = (id) => setCounts((c) => ({ ...c, [id]: Math.max(0, c[id] - 1) }));

  // Find SOC at arrival hour using UTC hours to match ISO timestamps
  const arrivalMinutes = arrivalHour * 60;  // UTC minutes since midnight

  const arrivalData = useMemo(() => {
    const sorted = [...hourlyRows].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const atOrBefore = sorted.filter((r) => {
      const ts = new Date(r.timestamp);
      return ts.getUTCHours() * 60 + ts.getUTCMinutes() <= arrivalMinutes;
    });
    return atOrBefore.at(-1) ?? sorted[0];
  }, [hourlyRows, arrivalMinutes]);

  const arrivalSoc = arrivalData?.soc ?? 50;

  const totalWh = useMemo(
    () => appliances.reduce((sum, a) => {
      const wh = a.energyWh ?? a.wh ?? (a.watts * (a.durationMinutes ?? 60) / 60);
      return sum + wh * (counts[a.id] ?? 0);
    }, 0),
    [appliances, counts]
  );

  const energyStats = useMemo(
    () => calcAvailableEnergy(
      hourlyRows, arrivalMinutes, siteData,
      arrivalSoc, appliances, counts, prediction?.prediction_hour
    ),
    [hourlyRows, arrivalMinutes, siteData, arrivalSoc, appliances, counts, prediction?.prediction_hour]
  );

  const feasibility = useMemo(
    () => calcFeasibility(totalWh, energyStats, hourlyRows, arrivalMinutes),
    [totalWh, energyStats, hourlyRows, arrivalMinutes]
  );

  const dayClass = classifyDay(prediction);
  const dayClassLabels  = { green: 'Great day', amber: 'Good day', red: 'Limited sun' };
  const dayClassColours = { green: 'text-brand-green', amber: 'text-brand-amber', red: 'text-brand-red' };

  return (
    <div className="px-4 flex flex-col gap-5">
      {/* Day summary */}
      <div className="bg-surface rounded-2xl p-4 border border-white/5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xl">{weatherEmoji(prediction?.weather_icon)}</span>
          <span className={`text-sm font-semibold ${dayClassColours[dayClass]}`}>
            {dayClassLabels[dayClass]}
          </span>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          {prediction?.weather_description ?? 'No forecast data available for this day.'}
        </p>
      </div>

      {/* Arrival time */}
      <div>
        <label className="block text-sm font-semibold text-slate-400 mb-3">Arriving at</label>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setArrivalHour((h) => Math.max(5, h - 1))}
            className="w-10 h-10 rounded-full border border-white/20 text-white text-xl flex items-center justify-center"
          >−</button>
          <div className="flex-1 text-center">
            <span className="text-3xl font-bold text-white tabular-nums">
              {String(arrivalHour).padStart(2, '0')}:00
            </span>
          </div>
          <button
            onClick={() => setArrivalHour((h) => Math.min(20, h + 1))}
            className="w-10 h-10 rounded-full border border-white/20 text-white text-xl flex items-center justify-center"
          >+</button>
        </div>
        <p className="text-xs text-slate-500 text-center mt-2">
          Battery at arrival: ~{arrivalSoc.toFixed(1)}%
        </p>
        {/* Show energy breakdown when load is selected */}
        {totalWh > 0 && (
          <div className="flex justify-center gap-4 mt-2 text-xs text-slate-600">
            <span>🔋 {Math.round(energyStats.batteryAboveFloor)} Wh</span>
            {energyStats.pvDuringLoadWh > 0 && (
              <span>☀️ +{Math.round(energyStats.pvDuringLoadWh)} Wh PV</span>
            )}
          </div>
        )}
      </div>

      {/* Appliance grid */}
      <div>
        <p className="text-sm font-semibold text-slate-400 mb-3">What do you need?</p>
        <div className="grid grid-cols-2 gap-3">
          {selectableAppliances.map((appliance) => (
            <ApplianceCard
              key={appliance.id}
              appliance={appliance}
              count={counts[appliance.id] ?? 0}
              onIncrement={() => onIncrement(appliance.id)}
              onDecrement={() => onDecrement(appliance.id)}
            />
          ))}
        </div>
      </div>

      {/* Result */}
      {totalWh > 0 && (
        <div className={`bg-surface rounded-2xl p-4 border ${
          feasibility.status === 'go'           ? 'border-brand-green/30' :
          feasibility.status === 'wait'         ? 'border-brand-amber/30' :
          feasibility.status === 'insufficient' ? 'border-brand-red/30'   :
          'border-white/10'
        }`}>
          <p className={`font-semibold text-base ${statusColours[feasibility.status]}`}>
            {statusIcons[feasibility.status] && (
              <span className="mr-2">{statusIcons[feasibility.status]}</span>
            )}
            {feasibility.message}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Total energy needed: {totalWh} Wh &middot; Available now: ~{Math.round(energyStats.immediateAvailableWh || 0)} Wh
          </p>
        </div>
      )}

      <NotifyButton />
    </div>
  );
}