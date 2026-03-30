import { useSimulator } from '../../context/useSimulator';
import TimelineBar from '../forecast/TimelineBar';
import WeatherSummary from '../forecast/WeatherSummary';
import AlertSection from '../forecast/AlertSection';

export default function ForecastTab() {
  const { todayHourly, todayPrediction, simulatedHour, site, currentHourData, isOperatorMode } = useSimulator();

  return (
    <div className="flex flex-col gap-6 pt-2 pb-4">
      {/* Forecast rendering and thresholds are documented in DASHBOARD_CALCULATIONS.md. */}
      <div className="px-4">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
          Today's solar forecast
        </h2>
        <TimelineBar
          hourlyRows={todayHourly}
          predictedFullTime={todayPrediction?.predicted_full_charge_time}
          site={site}
          simulatedHour={simulatedHour}
        />
      </div>

      <div className="h-px bg-white/5 mx-4" />

      <WeatherSummary prediction={todayPrediction} />

      <AlertSection
        isOperatorMode={isOperatorMode}
        prediction={todayPrediction}
        currentHourData={currentHourData}
        hourlyRows={todayHourly}
        site={site}
      />
    </div>
  );
}
