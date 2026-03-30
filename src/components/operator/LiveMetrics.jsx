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

  // Forecast rows don't have voltage or temperature — show N/A gracefully
  const voltageDisplay     = voltage    != null ? Number(voltage).toFixed(1)     : 'N/A';
  const temperatureDisplay = temperature != null ? Number(temperature).toFixed(1) : 'N/A';

  const sampleHours = todayHourly.length > 1
    ? Math.max(1 / 60, (new Date(todayHourly[1].timestamp) - new Date(todayHourly[0].timestamp)) / (1000 * 60 * 60))
    : 1;

  // Curtailment: only count rows where we actually have voltage data
  const curtailmentPeriods = todayHourly.filter((r) => {
    const aboveThreshold = r.voltage != null && r.voltage >= (site.charge_threshold_voltage ?? Infinity);
    return r.soc >= 99 || aboveThreshold;
  }).length;
  const curtailmentHours = curtailmentPeriods * sampleHours;

  const socColour     = soc > 66 ? 'text-brand-green' : soc > 33 ? 'text-brand-amber' : 'text-brand-red';
  const voltageColour = voltage != null && voltage > (site.max_voltage ?? Infinity) ? 'text-brand-red' : 'text-white';
  const tempColour    = temperature != null && temperature < 0 ? 'text-brand-blue' : 'text-white';

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <MetricItem label="Battery SOC"   value={soc}               unit="%"  colour={socColour} />
        <MetricItem label="Voltage"        value={voltageDisplay}    unit={voltage != null ? 'V' : null} colour={voltageColour} />
        <MetricItem label="Temperature"    value={temperatureDisplay} unit={temperature != null ? '°C' : null} colour={tempColour} />
        <MetricItem label="PV Output"      value={pv_power_w}        unit="W"  colour="text-brand-amber" />
      </div>
      <MetricItem
        label="Curtailment today"
        value={curtailmentHours.toFixed(1)}
        unit="hrs battery full"
        colour="text-brand-green"
      />
      {(voltage == null || temperature == null) && (
        <p className="text-xs text-slate-600 text-center">
          Voltage &amp; temperature not available for forecast days
        </p>
      )}
    </div>
  );
}
