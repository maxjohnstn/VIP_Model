import { User, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useSimulator } from '../../context/useSimulator';

export default function TopBar() {
  const {
    site,
    isOperatorMode,
    setIsOperatorMode,
    allSites,
    selectedSiteName,
    setSelectedSiteName,
  } = useSimulator();

  const [open, setOpen] = useState(false);

  const displayName = selectedSiteName || site.name;

  return (
    <div className="flex items-center justify-between px-5 pt-4 pb-3 relative">
      {/* Site name + dropdown trigger */}
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">SolarSmart</p>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 text-base font-semibold text-white leading-tight hover:text-brand-teal transition-colors"
        >
          {displayName}
          <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Operator mode toggle */}
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

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-5 z-50 mt-1 w-56 rounded-xl bg-surface border border-white/10 shadow-xl overflow-hidden">
          {allSites && allSites.length > 0 ? (
            allSites.map((s) => {
              const isActive = s.name === selectedSiteName;
              const socPct   = s.current_soc ?? 0;
              const socColor = socPct >= 60 ? 'bg-brand-teal' : socPct >= 30 ? 'bg-amber-400' : 'bg-red-400';
              return (
                <button
                  key={s.name}
                  onClick={() => { setSelectedSiteName(s.name); setOpen(false); }}
                  className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-white/5 ${
                    isActive ? 'bg-white/10 text-white' : 'text-slate-300'
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-slate-500">{s.capacity_kwp?.toFixed(2)} kWp</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${socColor}`} />
                    <span className="text-xs text-slate-400">{socPct?.toFixed(0)}%</span>
                  </div>
                </button>
              );
            })
          ) : (
            <p className="px-4 py-3 text-sm text-slate-500">Loading sites…</p>
          )}
        </div>
      )}
    </div>
  );
}
