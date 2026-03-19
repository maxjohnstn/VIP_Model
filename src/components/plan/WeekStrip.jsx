import DayCard from './DayCard';

export default function WeekStrip({ dates, predictions, selectedDate, onSelectDate }) {
  return (
    <div className="px-4">
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
        7-Day Outlook
      </h2>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {dates.map((d) => (
          <DayCard
            key={d}
            dateStr={d}
            prediction={predictions[d]}
            isSelected={d === selectedDate}
            onSelect={onSelectDate}
          />
        ))}
      </div>
    </div>
  );
}
