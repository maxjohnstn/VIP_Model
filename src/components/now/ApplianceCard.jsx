export default function ApplianceCard({ appliance, count, onIncrement, onDecrement }) {
  return (
    <div
      className={`bg-surface rounded-2xl p-4 flex flex-col gap-3 border transition-all ${
        count > 0 ? 'border-brand-green/40' : 'border-white/5'
      }`}
    >
      {/* Icon + info */}
      <div>
        <span className="text-3xl leading-none">{appliance.icon}</span>
        <p className="text-sm font-semibold text-white mt-2 leading-tight">{appliance.name}</p>
        <p className="text-xs text-slate-500 mt-0.5">{appliance.description}</p>
      </div>

      {/* Counter */}
      <div className="flex items-center gap-3 mt-auto">
        <button
          onClick={onDecrement}
          disabled={count === 0}
          className={`w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold transition-all border ${
            count === 0
              ? 'border-white/5 text-white/20'
              : 'border-white/20 text-white hover:border-brand-green hover:text-brand-green'
          }`}
        >
          −
        </button>
        <span className={`text-lg font-bold w-4 text-center tabular-nums ${count > 0 ? 'text-brand-green' : 'text-slate-500'}`}>
          {count}
        </span>
        <button
          onClick={onIncrement}
          className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold border border-white/20 text-white hover:border-brand-green hover:text-brand-green transition-all"
        >
          +
        </button>
      </div>
    </div>
  );
}
