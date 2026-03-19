import ApplianceCard from './ApplianceCard';

export default function ApplianceGrid({ appliances, counts, onIncrement, onDecrement }) {
  const selectableAppliances = appliances.filter((appliance) => appliance.userSelectable !== false);

  return (
    <div className="px-4">
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
        What do you want to charge?
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {selectableAppliances.map((appliance) => (
          <ApplianceCard
            key={appliance.id}
            appliance={appliance}
            count={counts[appliance.id] ?? 0}
            onIncrement={() => onIncrement(appliance.id)}
            onDecrement={() => onDecrement(appliance.id)}
          />
        ))}
      </div>
    </div>
  );
}
