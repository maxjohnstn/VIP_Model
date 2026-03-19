import { useState, useMemo } from 'react';
import { useSimulator } from '../../context/SimulatorContext';
import StatusBanner from '../shared/StatusBanner';
import InfoPillRow from '../now/InfoPillRow';
import ApplianceGrid from '../now/ApplianceGrid';
import ResultBar from '../now/ResultBar';
import { deriveStatus, calcAvailableEnergy, calcFeasibility } from '../../utils/energyCalc';

function hourToHHMM(hourValue) {
  if (!Number.isFinite(hourValue)) return null;
  const safeHour = Math.max(0, Math.min(23.9833, hourValue));
  const hour = Math.floor(safeHour);
  const minute = Math.round((safeHour - hour) * 60);
  return `${String(hour).padStart(2, '0')}:${String(Math.min(59, minute)).padStart(2, '0')}`;
}

export default function NowTab() {
  const { currentHourData, todayHourly, todayPrediction, simulatedHour, simulatedTime, site, siteData } = useSimulator();
  const appliances = siteData.appliances;

  // Appliance counts
  const initial = {};
  appliances.forEach((a) => { initial[a.id] = 0; });
  const [counts, setCounts] = useState(initial);

  const onIncrement = (id) => setCounts((c) => ({ ...c, [id]: c[id] + 1 }));
  const onDecrement = (id) => setCounts((c) => ({ ...c, [id]: Math.max(0, c[id] - 1) }));

  // Derived values in this tab mirror the equations in DASHBOARD_CALCULATIONS.md.
  const status = useMemo(
    () => deriveStatus(currentHourData, site),
    [currentHourData, site]
  );

  const soc = currentHourData?.soc ?? 0;
  const weatherIcon = todayPrediction?.weather_icon ?? 'cloudy';
  const basePredictionHour = todayPrediction?.prediction_hour ?? null;

  const totalWh = useMemo(
    () => appliances.reduce((sum, appliance) => {
      const applianceWh = appliance.energyWh ?? appliance.wh ?? (appliance.watts * appliance.durationMinutes / 60);
      return sum + applianceWh * (counts[appliance.id] ?? 0);
    }, 0),
    [appliances, counts]
  );

  const energyStats = useMemo(
    () => calcAvailableEnergy(todayHourly, simulatedTime, siteData, soc, appliances, counts, basePredictionHour),
    [todayHourly, simulatedTime, siteData, soc, appliances, counts, basePredictionHour]
  );

  const predictedFullTime = useMemo(() => {
    const adjusted = hourToHHMM(energyStats.updatedFullChargeHour);
    return adjusted ?? todayPrediction?.predicted_full_charge_time ?? null;
  }, [energyStats.updatedFullChargeHour, todayPrediction?.predicted_full_charge_time]);

  const feasibility = useMemo(
    () => calcFeasibility(totalWh, energyStats, todayHourly, simulatedTime),
    [totalWh, energyStats, todayHourly, simulatedTime]
  );

  return (
    <div className="flex flex-col gap-4 pt-1 pb-4">
      <StatusBanner status={status} soc={soc} />

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
