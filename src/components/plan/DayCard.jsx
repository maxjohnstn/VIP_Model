import { toDayName, toShortDate } from '../../utils/formatters';
import { weatherEmoji, classifyDay } from '../../utils/dayClassifier';

const dotColour = {
  green: 'bg-brand-green',
  amber: 'bg-brand-amber',
  red: 'bg-brand-red',
};

export default function DayCard({ dateStr, prediction, isSelected, onSelect }) {
  const dayClass = classifyDay(prediction);
  const isToday = false; // could enhance later

  return (
    <button
      onClick={() => onSelect(dateStr)}
      className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl flex-shrink-0 border transition-all ${
        isSelected
          ? 'bg-surface-raised border-brand-green/50 text-white'
          : 'bg-surface border-white/5 text-slate-400'
      }`}
    >
      <span className="text-xs font-semibold uppercase tracking-wide">
        {toDayName(dateStr)}
      </span>
      <span className="text-xl leading-none">{weatherEmoji(prediction?.weather_icon ?? 'cloudy')}</span>
      <div className={`w-2.5 h-2.5 rounded-full ${dotColour[dayClass]}`} />
      <span className="text-xs opacity-60">{toShortDate(dateStr)}</span>
    </button>
  );
}
