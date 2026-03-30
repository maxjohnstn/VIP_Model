import { useState } from 'react';
import { useSimulator } from '../../context/useSimulator';
import WeekStrip from '../plan/WeekStrip';
import VisitPlanner from '../plan/VisitPlanner';

export default function PlanTab() {
  const { siteData } = useSimulator();
  const { available_dates, predictions, daily_data, appliances } = siteData;

  // Plan tab reuses core feasibility logic at a user-selected arrival time.
  // See README_ARCHITECTURE.md and DASHBOARD_CALCULATIONS.md.
  const [selectedDate, setSelectedDate] = useState(available_dates[0]);

  const hourlyRows = daily_data[selectedDate]?.hourly ?? [];
  const prediction = predictions[selectedDate] ?? null;

  return (
    <div className="flex flex-col gap-6 pt-2 pb-4">
      <WeekStrip
        dates={available_dates}
        predictions={predictions}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />

      <div className="h-px bg-white/5 mx-4" />

      <VisitPlanner
        selectedDate={selectedDate}
        prediction={prediction}
        hourlyRows={hourlyRows}
        appliances={appliances}
        siteData={siteData}
      />
    </div>
  );
}
