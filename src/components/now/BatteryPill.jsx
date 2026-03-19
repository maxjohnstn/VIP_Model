/**
 * Visual battery icon with 3 fill segments. No number shown.
 * soc 0-33: 1 segment (red), 34-66: 2 segments (amber), 67-100: 3 segments (green)
 */
export default function BatteryPill({ soc }) {
  const filled = soc > 66 ? 3 : soc > 33 ? 2 : 1;
  const colour = soc > 66 ? '#00d4aa' : soc > 33 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex-1 flex items-center gap-2 bg-surface rounded-2xl px-3 py-3">
      {/* Battery body */}
      <div className="relative flex items-center">
        <div className="flex items-center gap-0.5 border-2 rounded-sm p-0.5"
          style={{ borderColor: colour }}>
          {[1, 2, 3].map((seg) => (
            <div
              key={seg}
              className="w-3 h-4 rounded-sm transition-all"
              style={{ backgroundColor: seg <= filled ? colour : 'transparent', opacity: seg <= filled ? 1 : 0.15 }}
            />
          ))}
        </div>
        {/* Battery tip */}
        <div className="w-1 h-2 rounded-r-sm ml-0.5" style={{ backgroundColor: colour }} />
      </div>
      <span className="text-sm font-medium text-white">
        {soc > 66 ? 'High' : soc > 33 ? 'Mid' : 'Low'}
      </span>
    </div>
  );
}
