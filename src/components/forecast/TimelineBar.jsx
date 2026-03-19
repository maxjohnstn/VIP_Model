/**
 * Horizontal timeline bar from 6am to 8pm.
 * Each hour is a segment coloured by solar/battery state.
 */

const START_HOUR = 6;
const END_HOUR = 20;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

function getSegmentColour(hourData, site) {
  if (!hourData) return '#1f2937'; // dark grey
  const { pv_power_w, soc, voltage } = hourData;
  if (soc >= 99 || voltage >= site.charge_threshold_voltage) return '#00d4aa'; // curtailment green
  if (pv_power_w === 0) return '#1f2937';
  if (pv_power_w < 100) return '#78350f'; // very dim amber
  if (pv_power_w < 200) return '#92400e';
  if (pv_power_w < 300) return '#b45309';
  if (pv_power_w < 400) return '#d97706';
  return '#f59e0b'; // bright amber/yellow
}

export default function TimelineBar({ hourlyRows, predictedFullTime, site, simulatedHour }) {
  // Build lookup by hour
  const byHour = {};
  hourlyRows.forEach((row) => {
    const h = new Date(row.timestamp).getHours();
    byHour[h] = row;
  });

  const fullChargeHour = predictedFullTime
    ? parseInt(predictedFullTime.split(':')[0], 10)
    : null;

  return (
    <div className="px-4">
      <div className="relative">
        {/* Hour labels */}
        <div className="flex mb-1">
          {HOURS.map((h, i) => (
            <div key={h} className="flex-1 text-center">
              {i % 3 === 0 && (
                <span className="text-xs text-slate-600">{h}:00</span>
              )}
            </div>
          ))}
        </div>

        {/* Bar */}
        <div className="flex rounded-xl overflow-hidden h-8 relative">
          {HOURS.map((h) => {
            const data = byHour[h];
            const colour = getSegmentColour(data, site);
            const isPast = h < simulatedHour;
            const isCurrent = h === simulatedHour;
            return (
              <div
                key={h}
                className="flex-1 relative"
                style={{
                  backgroundColor: colour,
                  opacity: isPast ? 0.4 : 1,
                  outline: isCurrent ? '2px solid white' : 'none',
                  outlineOffset: '-2px',
                }}
              />
            );
          })}

          {/* Predicted full charge marker */}
          {fullChargeHour !== null && fullChargeHour >= START_HOUR && fullChargeHour <= END_HOUR && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white/80 z-10"
              style={{
                left: `${((fullChargeHour - START_HOUR) / (END_HOUR - START_HOUR)) * 100}%`,
              }}
            />
          )}
        </div>

        {/* Full charge time label */}
        {fullChargeHour !== null && (
          <div
            className="absolute -bottom-6 flex flex-col items-center"
            style={{
              left: `${((fullChargeHour - START_HOUR) / (END_HOUR - START_HOUR)) * 100}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <span className="text-xs text-white/60 whitespace-nowrap">
              {predictedFullTime} full
            </span>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-9 text-xs text-slate-600">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#1f2937' }} />
          <span>No sun</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#f59e0b' }} />
          <span>Charging</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#00d4aa' }} />
          <span>Battery full</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-3 bg-white/60" />
          <span>Full charge</span>
        </div>
      </div>
    </div>
  );
}
