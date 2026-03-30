import { X } from 'lucide-react';
import { useSimulator } from '../../context/useSimulator';
import { minutesToHHMM } from '../../utils/formatters';

export default function SimulatorPanel() {
  const {
    availableDates,
    selectedDate, setSelectedDate,
    simulatedTime, setSimulatedTime,
    isSimulatorOpen, setIsSimulatorOpen,
    resolveToAvailableDate,
  } = useSimulator();

  const onTimeInputChange = (value) => {
    if (!value || !value.includes(':')) return;
    const [hoursRaw, minutesRaw] = value.split(':');
    const hours = Number(hoursRaw);
    const minutes = Number(minutesRaw);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return;
    const total = (hours * 60) + minutes;
    setSimulatedTime(Math.max(0, Math.min(1439, total)));
  };

  if (!isSimulatorOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={() => setIsSimulatorOpen(false)}
      />

      {/* Panel */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface rounded-t-3xl border border-white/10 p-6 pb-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚙️</span>
            <div>
              <p className="font-semibold text-white text-base">Test Mode</p>
              <p className="text-xs text-slate-500">Prototype simulator — not live data</p>
            </div>
          </div>
          <button
            onClick={() => setIsSimulatorOpen(false)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Date input */}
        <div className="mb-5">
          <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">
            Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full bg-surface-raised border border-white/10 text-white rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-brand-green"
            list="available-dates"
          />
          <datalist id="available-dates">
            {availableDates.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
          <p className="text-[11px] text-slate-500 mt-2">
            Datasheet dates available: {availableDates[0]} to {availableDates[availableDates.length - 1]}. Any other date maps to the nearest available day (current: {resolveToAvailableDate(selectedDate)}).
          </p>
        </div>

        {/* Time input */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              Time
            </label>
            <span className="text-base font-semibold text-white tabular-nums">
              {minutesToHHMM(simulatedTime)}
            </span>
          </div>
          <input
            type="time"
            value={minutesToHHMM(simulatedTime)}
            onChange={(e) => onTimeInputChange(e.target.value)}
            step={60}
            className="w-full bg-surface-raised border border-white/10 text-white rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-brand-green"
          />
        </div>

        {/* Time slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              Time of Day
            </label>
            <span className="text-lg font-bold text-brand-green tabular-nums">
              {minutesToHHMM(simulatedTime)}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1439}
            step={1}
            value={simulatedTime}
            onChange={(e) => setSimulatedTime(Number(e.target.value))}
            className="w-full accent-brand-green h-2 rounded-full"
          />
          <div className="flex justify-between text-xs text-slate-600 mt-1">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>23:59</span>
          </div>
        </div>
      </div>
    </>
  );
}
