import { Sun, CloudSun, CalendarDays } from 'lucide-react';

const tabs = [
  { id: 'now', label: 'Now', Icon: Sun },
  { id: 'forecast', label: 'Forecast', Icon: CloudSun },
  { id: 'plan', label: 'Plan', Icon: CalendarDays },
];

export default function BottomNav({ activeTab, setActiveTab }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-white/10">
      <div className="flex">
        {tabs.map(({ id, label, Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                active ? 'text-brand-green' : 'text-slate-500'
              }`}
            >
              {active && (
                <span className="absolute top-0 left-0 right-0 h-0.5 bg-brand-green rounded-full opacity-0" />
              )}
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-xs font-medium">{label}</span>
            </button>
          );
        })}
      </div>
      {/* safe area spacer */}
      <div className="h-safe-bottom" style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
    </nav>
  );
}
