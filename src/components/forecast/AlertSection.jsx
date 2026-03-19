import AlertCard from '../shared/AlertCard';

function getUserAlerts(prediction, currentHourData) {
  const alerts = [];
  if (!prediction) return alerts;

  const { daily_gti_kwh, predicted_full_charge_time } = prediction;
  const soc = currentHourData?.soc ?? 100;

  if (!predicted_full_charge_time && daily_gti_kwh < 1.5) {
    alerts.push({
      icon: '☁️',
      title: 'Poor solar day',
      description: 'Not enough sun to fully charge today. Plan your charging for tomorrow.',
      severity: 'warning',
    });
  }
  if (soc < 20) {
    alerts.push({
      icon: '🔋',
      title: 'Battery running low',
      description: 'Charge level is low. Please limit use to essentials until the battery recovers.',
      severity: 'danger',
    });
  }
  return alerts;
}

function getOperatorAlerts(hourlyRows, site) {
  const alerts = [];
  if (!hourlyRows.length) return alerts;

  const sampleHours = hourlyRows.length > 1
    ? Math.max(1 / 60, (new Date(hourlyRows[1].timestamp) - new Date(hourlyRows[0].timestamp)) / (1000 * 60 * 60))
    : 1;

  const maxVoltage = Math.max(...hourlyRows.map((r) => r.voltage));
  const overvoltageEvents = hourlyRows.filter((r) => r.voltage > site.max_voltage).length;
  if (overvoltageEvents > 0) {
    const overvoltageHours = overvoltageEvents * sampleHours;
    alerts.push({
      icon: '⚡',
      title: `Overvoltage alert — ${maxVoltage.toFixed(1)}V`,
      description: `${overvoltageHours.toFixed(1)} hour(s) today exceeded ${site.max_voltage}V. Max voltage: ${maxVoltage.toFixed(1)}V.`,
      severity: 'danger',
    });
  }

  const subZeroCharging = hourlyRows.find((r) => r.temperature < 0 && r.pv_power_w > 0);
  if (subZeroCharging) {
    alerts.push({
      icon: '🧊',
      title: 'Sub-zero charging',
      description: `Charging detected while temperature was below 0°C (${subZeroCharging.temperature}°C). This may damage the battery.`,
      severity: 'danger',
    });
  }

  const lowSocHours = hourlyRows.filter((r) => r.soc < 20).length * sampleHours;
  if (lowSocHours >= 2) {
    alerts.push({
      icon: '🔋',
      title: `Low SOC for ${lowSocHours.toFixed(1)} hours`,
      description: 'Battery was below 20% for an extended period today. Consider reducing load or checking the solar input.',
      severity: 'warning',
    });
  }

  return alerts;
}

export default function AlertSection({ isOperatorMode, prediction, currentHourData, hourlyRows, site }) {
  const userAlerts = getUserAlerts(prediction, currentHourData);
  const operatorAlerts = isOperatorMode ? getOperatorAlerts(hourlyRows, site) : [];
  const allAlerts = [...userAlerts, ...operatorAlerts];

  if (allAlerts.length === 0) return null;

  return (
    <div className="px-4 flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Alerts</h2>
      {allAlerts.map((alert, i) => (
        <AlertCard key={i} {...alert} />
      ))}
    </div>
  );
}
