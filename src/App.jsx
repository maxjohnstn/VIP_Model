import AppShell from './components/layout/AppShell';
import { SimulatorProvider } from './context/SimulatorContext';

function App() {
  // App-wide state is centralized in SimulatorProvider.
  // Docs: README_ARCHITECTURE.md and DASHBOARD_CALCULATIONS.md.
  return (
    <SimulatorProvider>
      <AppShell />
    </SimulatorProvider>
  );
}

export default App;
