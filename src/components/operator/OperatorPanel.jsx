import { X } from 'lucide-react';
import { useSimulator } from '../../context/useSimulator';
import LiveMetrics from './LiveMetrics';
import SOCChart from './SOCChart';
import TechnicalAlerts from './TechnicalAlerts';
import ForecastChartsPanel from './ForecastChartsPanel';

export default function OperatorPanel() {
  const {
    site,
    currentHourData,
    todayHourly,
    todayPrediction,
    simulatedTime,
    setIsOperatorMode,
    selectedDate,
  } = useSimulator();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={() => setIsOperatorMode(false)}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-brand-bg border-l border-white/10 overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 sticky top-0 bg-brand-bg border-b border-white/5 z-10">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">Operator View</p>
            <h2 className="text-base font-semibold text-white">{site.name}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{selectedDate}</p>
          </div>
          <button
            onClick={() => setIsOperatorMode(false)}
            className="text-slate-400 hover:text-white transition-colors p-2"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-6 pb-10">

          {/* ── Live readings ─────────────────────────────────────────────── */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Live Readings
            </h3>
            <LiveMetrics
              currentHourData={currentHourData}
              site={site}
              todayHourly={todayHourly}
            />
          </div>

          {/* ── Forecast accuracy ─────────────────────────────────────────── */}
          {todayPrediction && (
            <div className="bg-surface rounded-2xl p-4 border border-white/5">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Today's Forecast
              </h3>
              <div className="flex gap-4 flex-wrap">
                <div>
                  <p className="text-xs text-slate-500">Predicted full charge</p>
                  <p className="text-lg font-bold text-white">
                    {todayPrediction.predicted_full_charge_time ?? 'Not today'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Generation</p>
                  <p className="text-lg font-bold text-brand-amber">
                    {todayPrediction.gen_kwh != null
                      ? `${todayPrediction.gen_kwh.toFixed(2)} kWh`
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Confidence</p>
                  <p className="text-lg font-bold text-brand-green capitalize">
                    {todayPrediction.confidence ?? '—'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Today's SOC curve ─────────────────────────────────────────── */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Today's SOC Curve
            </h3>
            <div className="bg-surface rounded-2xl p-3 border border-white/5">
              <SOCChart hourlyRows={todayHourly} simulatedTime={simulatedTime} />
            </div>
          </div>

          {/* ── 7-Day forecast charts with load modelling ─────────────────── */}
          <div className="bg-surface rounded-2xl p-4 border border-white/5">
            <ForecastChartsPanel />
          </div>

          {/* ── Technical alerts ──────────────────────────────────────────── */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Technical Alerts
            </h3>
            <TechnicalAlerts
              hourlyRows={todayHourly}
              site={site}
              selectedDate={selectedDate}
            />
          </div>

        </div>
      </div>
    </>
  );
}
