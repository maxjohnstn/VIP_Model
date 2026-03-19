const configs = {
  curtailment: {
    bg: 'bg-brand-green',
    text: 'text-brand-bg',
    emoji: '⚡',
    message: 'Battery full — solar still coming in, great time to charge',
    pulse: true,
  },
  charging: {
    bg: 'bg-brand-green/15',
    text: 'text-brand-green',
    emoji: '🟢',
    message: 'Great solar day — plenty of power available',
    pulse: false,
  },
  low: {
    bg: 'bg-brand-amber/15',
    text: 'text-brand-amber',
    emoji: '🟡',
    message: 'Moderate power today — charging available',
    pulse: false,
  },
  critical: {
    bg: 'bg-brand-red/15',
    text: 'text-brand-red',
    emoji: '🔴',
    message: 'Limited power today — essentials only',
    pulse: false,
  },
  idle: {
    bg: 'bg-white/5',
    text: 'text-slate-300',
    emoji: '🌙',
    message: 'Overnight — battery holding charge',
    pulse: false,
  },
  offline: {
    bg: 'bg-brand-red/15',
    text: 'text-brand-red',
    emoji: '🔴',
    message: 'System offline — no data available',
    pulse: false,
  },
};

export default function StatusBanner({ status, soc }) {
  const cfg = configs[status] ?? configs.idle;
  const showSocAdvisory = Number.isFinite(soc) && soc < 50;

  return (
    <div className="mx-4 flex flex-col gap-2">
      <div
        className={`rounded-2xl px-5 py-4 ${cfg.bg} ${cfg.pulse ? 'animate-pulse' : ''}`}
      >
        <p className={`text-base font-semibold leading-snug ${cfg.text}`}>
          {cfg.emoji}&nbsp;&nbsp;{cfg.message}
        </p>
      </div>

      {showSocAdvisory && (
        <div className="rounded-2xl px-5 py-3 bg-brand-amber/10 border border-brand-amber/30">
          <p className="text-sm font-medium text-brand-amber leading-snug">
            Advisory: Battery is below 50% ({Math.round(soc)}%). Keep above 50% where possible; operation below 50% is still allowed.
          </p>
        </div>
      )}
    </div>
  );
}
