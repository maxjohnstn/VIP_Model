import { weatherEmoji, weatherLabel } from '../../utils/dayClassifier';

export default function WeatherPill({ weatherIcon }) {
  return (
    <div className="flex-1 flex items-center gap-2 bg-surface rounded-2xl px-3 py-3">
      <span className="text-xl leading-none">{weatherEmoji(weatherIcon)}</span>
      <span className="text-sm font-medium text-white leading-tight">
        {weatherLabel(weatherIcon)}
      </span>
    </div>
  );
}
