function MetricItem({ label, value, unit, colour }) {
  return (
    <div className="bg-surface-raised rounded-xl p-3 flex flex-col gap-1">
      <span className="text-xs text-slate-500 uppercase tracking-wide">{label}</span>
      <span className={`text-xl font-bold tabular-nums ${colour ?? 'text-white'}`}>
        {value}
        {unit && <span className="text-sm font-normal text-slate-400 ml-1">{unit}</span>}
      </span>
    </div>
  );
}

export default function LiveMetrics({ currentHourData, site, todayHourly }) {
  if (!currentHourData) return null;
  const { soc, voltage, temperature, pv_power_w } = currentHourData;

  const sampleHours = todayHourly.length > 1
    ? Math.max(1 / 60, (new Date(todayHourly[1].timestamp) - new Date(todayHourly[0].timestamp)) / (1000 * 60 * 60))
    : 1;

  // Calculate curtailment duration today
  const curtailmentPeriods = todayHourly.filter(
    (r) => r.soc >= 99 || r.voltage >= site.charge_threshold_voltage
  ).length;
  const curtailmentHours = curtailmentPeriods * sampleHours;

  const socColour = soc > 66 ? 'text-brand-green' : soc > 33 ? 'text-brand-amber' : 'text-brand-red';
  const voltageColour = voltage > site.max_voltage ? 'text-brand-red' : 'text-white';
  const tempColour = temperature < 0 ? 'text-brand-blue' : 'text-white';

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <MetricItem label="Battery SOC" value={soc} unit="%" colour={socColour} />
        <MetricItem label="Voltage" value={voltage.toFixed(1)} unit="V" colour={voltageColour} />
        <MetricItem label="Temperature" value={temperature.toFixed(1)} unit="°C" colour={tempColour} />
        <MetricItem label="PV Output" value={pv_power_w} unit="W" colour="text-brand-amber" />
      </div>
      <MetricItem
        label="Curtailment today"
        value={curtailmentHours.toFixed(1)}
        unit="hrs battery full"
        colour="text-brand-green"
      />
    </div>
  );
}
