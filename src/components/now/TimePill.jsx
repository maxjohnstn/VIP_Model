import { Clock } from 'lucide-react';

export default function TimePill({ predictedFullTime, currentSoc, simulatedHour }) {
  let label;
  if (currentSoc >= 99) {
    label = 'Fully charged';
  } else if (!predictedFullTime) {
    label = 'Peaks ~60% today';
  } else {
    const [h] = predictedFullTime.split(':').map(Number);
    if (simulatedHour >= h) {
      label = `Full since ${predictedFullTime}`;
    } else {
      label = `Full by ~${predictedFullTime}`;
    }
  }

  return (
    <div className="flex-1 flex items-center gap-2 bg-surface rounded-2xl px-3 py-3">
      <Clock size={18} className="text-brand-blue flex-shrink-0" />
      <span className="text-sm font-medium text-white leading-tight">{label}</span>
    </div>
  );
}
