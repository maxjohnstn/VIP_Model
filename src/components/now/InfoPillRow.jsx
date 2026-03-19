import WeatherPill from './WeatherPill';
import BatteryPill from './BatteryPill';
import TimePill from './TimePill';

export default function InfoPillRow({ weatherIcon, soc, predictedFullTime, simulatedHour }) {
  return (
    <div className="flex gap-2 px-4">
      <WeatherPill weatherIcon={weatherIcon} />
      <BatteryPill soc={soc} />
      <TimePill
        predictedFullTime={predictedFullTime}
        currentSoc={soc}
        simulatedHour={simulatedHour}
      />
    </div>
  );
}
