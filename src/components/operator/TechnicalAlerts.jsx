import { useEffect, useMemo } from 'react';
import AlertCard from '../shared/AlertCard';
import { useSimulator } from '../../context/SimulatorContext';

export default function TechnicalAlerts({ hourlyRows, site, selectedDate }) {
  const {
    technicalIssues,
    registerTechnicalIssues,
    resolveTechnicalIssue,
  } = useSimulator();

  const alerts = useMemo(() => {
    // Thresholds and alert rationale are captured in DASHBOARD_CALCULATIONS.md.
    const nextAlerts = [];
    const sampleHours = hourlyRows.length > 1
      ? Math.max(1 / 60, (new Date(hourlyRows[1].timestamp) - new Date(hourlyRows[0].timestamp)) / (1000 * 60 * 60))
      : 1;

    if (!hourlyRows.length) {
      nextAlerts.push({
        icon: '📡',
        title: 'No data',
        description: 'No telemetry data available for this date.',
        severity: 'warning',
      });
    }

    const maxVoltage = hourlyRows.length ? Math.max(...hourlyRows.map((r) => r.voltage)) : 0;
    const overvoltageEvents = hourlyRows.filter((r) => r.voltage > site.max_voltage).length;
    if (overvoltageEvents > 0) {
      const overvoltageHours = overvoltageEvents * sampleHours;
      nextAlerts.push({
        id: `overvoltage:${selectedDate}`,
        date: selectedDate,
        icon: '⚡',
        title: `Overvoltage - ${maxVoltage.toFixed(1)}V peak`,
        description: `${overvoltageHours.toFixed(1)} hour(s) above ${site.max_voltage}V limit. Review charge controller settings.`,
        severity: 'danger',
      });
    }

    const subZero = hourlyRows.find((r) => r.temperature < 0 && r.pv_power_w > 0);
    if (subZero) {
      nextAlerts.push({
        id: `subzero:${selectedDate}`,
        date: selectedDate,
        icon: '🧊',
        title: 'Sub-zero charging detected',
        description: `Charging at ${subZero.temperature}°C risks battery damage. Check low-temperature cut-off settings.`,
        severity: 'danger',
      });
    }

    const lowSocHours = hourlyRows.filter((r) => r.soc < 20).length * sampleHours;
    if (lowSocHours >= 2) {
      nextAlerts.push({
        id: `lowsoc:${selectedDate}`,
        date: selectedDate,
        icon: '🔋',
        title: `Extended low SOC (${lowSocHours.toFixed(1)}h < 20%)`,
        description: 'Battery spent extended time at critically low charge. Check PV input and load balance.',
        severity: 'warning',
      });
    }

    return nextAlerts;
  }, [hourlyRows, site.max_voltage, selectedDate]);

  useEffect(() => {
    registerTechnicalIssues(alerts.filter((a) => a.id));
  }, [alerts, registerTechnicalIssues]);

  const openIssues = useMemo(
    () => [...technicalIssues].sort((a, b) => (b.raisedAt || '').localeCompare(a.raisedAt || '')),
    [technicalIssues]
  );

  if (openIssues.length === 0) {
    return (
      <p className="text-xs text-slate-500 text-center py-2">No technical alerts today ✓</p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {openIssues.map((alert) => (
        <AlertCard
          key={alert.id}
          {...alert}
          title={`${alert.title}${alert.date ? ` (${alert.date})` : ''}`}
          actionLabel="Issue resolved · Clear error"
          onAction={() => resolveTechnicalIssue(alert.id)}
        />
      ))}
    </div>
  );
}
