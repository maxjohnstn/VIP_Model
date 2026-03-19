export default function AlertCard({ icon, title, description, severity = 'warning', actionLabel, onAction }) {
  const colours = {
    warning: 'border-brand-amber/30 bg-brand-amber/5 text-brand-amber',
    danger: 'border-brand-red/30 bg-brand-red/5 text-brand-red',
    info: 'border-brand-blue/30 bg-brand-blue/5 text-brand-blue',
  };
  return (
    <div className={`rounded-2xl border px-4 py-3 ${colours[severity]}`}>
      <div className="flex items-start gap-3">
        <span className="text-xl mt-0.5 flex-shrink-0">{icon}</span>
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs mt-0.5 opacity-80 leading-snug">{description}</p>
          {onAction && actionLabel && (
            <button
              type="button"
              onClick={onAction}
              className="mt-2 text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-current/40 hover:bg-white/10 transition-colors"
            >
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
