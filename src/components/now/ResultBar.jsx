const statusConfig = {
  idle: {
    bg: 'bg-surface border-t border-white/10',
    text: 'text-slate-400',
    icon: null,
  },
  go: {
    bg: 'bg-brand-green/15 border-t border-brand-green/30',
    text: 'text-brand-green',
    icon: '✅',
  },
  wait: {
    bg: 'bg-brand-amber/10 border-t border-brand-amber/30',
    text: 'text-brand-amber',
    icon: '⏳',
  },
  insufficient: {
    bg: 'bg-brand-red/10 border-t border-brand-red/30',
    text: 'text-brand-red',
    icon: '❌',
  },
};

export default function ResultBar({ status, message, totalWh }) {
  const cfg = statusConfig[status] ?? statusConfig.idle;
  return (
    <div className={`px-5 py-4 ${cfg.bg}`}>
      <div className="flex items-center justify-between gap-3">
        <p className={`text-sm font-semibold leading-snug ${cfg.text}`}>
          {cfg.icon && <span className="mr-2">{cfg.icon}</span>}
          {message}
        </p>
        {totalWh > 0 && (
          <span className="text-xs text-slate-500 whitespace-nowrap flex-shrink-0">
            {totalWh} Wh
          </span>
        )}
      </div>
    </div>
  );
}
