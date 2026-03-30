import { useState } from 'react';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import SimulatorPanel from './SimulatorPanel';
import NowTab from '../tabs/NowTab';
import ForecastTab from '../tabs/ForecastTab';
import PlanTab from '../tabs/PlanTab';
import OperatorPanel from '../operator/OperatorPanel';
import { useSimulator } from '../../context/useSimulator';

export default function AppShell() {
  const [activeTab, setActiveTab] = useState('now');
  const { isSimulatorOpen, setIsSimulatorOpen, isOperatorMode } = useSimulator();

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col max-w-md mx-auto relative">
      <TopBar />

      {/* Tab router shell. See README_ARCHITECTURE.md for ownership of each tab. */}
      <main className="flex-1 overflow-y-auto pb-24">
        {activeTab === 'now' && <NowTab />}
        {activeTab === 'forecast' && <ForecastTab />}
        {activeTab === 'plan' && <PlanTab />}
      </main>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Floating simulator button */}
      <button
        onClick={() => setIsSimulatorOpen((v) => !v)}
        className="fixed bottom-20 left-4 z-40 w-10 h-10 flex items-center justify-center bg-surface border border-white/10 rounded-full text-lg shadow-lg"
        aria-label="Open test mode simulator"
      >
        ⚙️
      </button>

      <SimulatorPanel />

      {/* Operator overlay */}
      {isOperatorMode && <OperatorPanel />}
    </div>
  );
}
