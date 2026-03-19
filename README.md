# VIP Dashboard

This project is a React + Vite dashboard that simulates an off-grid solar + battery site.

It supports three practical workflows:
- **Now**: Decide if selected appliances can run now, later, or not today.
- **Forecast**: See today's charging timeline, model confidence, and alerts.
- **Plan**: Choose a day and arrival time, then test appliance combinations.

## Documentation Index

Start here, then follow links based on what you need:

1. **System overview and architecture**: [README_ARCHITECTURE.md](README_ARCHITECTURE.md)
2. **Calculation and model details**: [DASHBOARD_CALCULATIONS.md](DASHBOARD_CALCULATIONS.md)
3. **Editing and extension guide**: [README_EDITING_GUIDE.md](README_EDITING_GUIDE.md)
4. **How to clone/run from GitHub with Vite**: [README_RUN_FROM_GITHUB.md](README_RUN_FROM_GITHUB.md)

## Quick Start

### Requirements
- Node.js 20+
- npm 10+

### Install

```bash
npm install
```

### Run dev server

```bash
npm run dev -- --host --port 5180 --strictPort --open
```

If port `5180` is already in use, stop the existing Vite process first.

### Build

```bash
npm run build
```

### Lint

```bash
npm run lint
```

## Project Map

```text
src/
	components/
		forecast/   # Forecast tab visuals and alert section
		layout/     # App shell, top bar, bottom nav, simulator panel
		now/        # Appliance controls + result UI for current time
		operator/   # Operator overlay, metrics, chart, technical alerts
		plan/       # Visit planning widgets and day strip
		shared/     # Shared cards and banners
		tabs/       # Tab entry components: Now, Forecast, Plan
	context/
		SimulatorContext.jsx   # Central state + derived predictions/data mapping
	data/
		masterdata.json        # Telemetry/irradiance rows
		sitedata.json          # Site constants and appliance catalog
	utils/
		energyCalc.js          # Availability + feasibility + status logic
		prediction.js          # Full-charge hour prediction model
		dayClassifier.js       # Plan day color classification
		formatters.js          # Date/time formatting helpers
```

## What New Developers Should Read First

1. [README_ARCHITECTURE.md](README_ARCHITECTURE.md)
2. [DASHBOARD_CALCULATIONS.md](DASHBOARD_CALCULATIONS.md)
3. [README_EDITING_GUIDE.md](README_EDITING_GUIDE.md)
4. [README_RUN_FROM_GITHUB.md](README_RUN_FROM_GITHUB.md)

After that, start in `src/context/SimulatorContext.jsx` and follow data into each tab component.
