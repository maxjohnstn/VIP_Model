import { User } from 'lucide-react';
import { useSimulator } from '../../context/SimulatorContext';

export default function TopBar() {
  const { site, isOperatorMode, setIsOperatorMode } = useSimulator();

  return (
    <div className="flex items-center justify-between px-5 pt-4 pb-3">
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">SolarSmart</p>
        <h1 className="text-base font-semibold text-white leading-tight">{site.name}</h1>
      </div>
      <button
        onClick={() => setIsOperatorMode((v) => !v)}
        className={`flex items-center justify-center w-9 h-9 rounded-full border transition-all ${
          isOperatorMode
            ? 'bg-brand-blue border-brand-blue text-white'
            : 'bg-surface border-white/10 text-slate-400'
        }`}
        aria-label="Toggle operator mode"
      >
        <User size={16} />
      </button>
    </div>
  );
}
