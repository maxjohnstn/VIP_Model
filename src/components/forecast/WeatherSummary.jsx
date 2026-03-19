const confidenceConfig = {
  high: { label: 'High confidence', colour: 'text-brand-green bg-brand-green/10' },
  medium: { label: 'Moderate confidence', colour: 'text-brand-amber bg-brand-amber/10' },
  low: { label: 'Early estimate', colour: 'text-slate-400 bg-white/5' },
};

export default function WeatherSummary({ prediction }) {
  if (!prediction) return null;
  const { weather_description, confidence, predicted_full_charge_time, actual_full_charge_time } = prediction;
  const cc = confidenceConfig[confidence] ?? confidenceConfig.low;

  return (
    <div className="px-4 flex flex-col gap-3">
      <p className="text-base text-slate-200 leading-relaxed">{weather_description}</p>

      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${cc.colour}`}>
          {cc.label}
        </span>
        {actual_full_charge_time && (
          <span className="text-xs text-slate-500">
            Actual: {actual_full_charge_time}
          </span>
        )}
      </div>
    </div>
  );
}
