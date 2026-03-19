# Run From GitHub (Vite Guide)

This guide is for a new person who has only the GitHub repo URL and wants to run the dashboard locally.

Related docs:
- Project overview: [README.md](README.md)
- Architecture details: [README_ARCHITECTURE.md](README_ARCHITECTURE.md)
- Calculations/model rules: [DASHBOARD_CALCULATIONS.md](DASHBOARD_CALCULATIONS.md)

## 1) Prerequisites

Install:
- Node.js 20+
- npm 10+
- Git

Check versions:

```bash
node -v
npm -v
git --version
```

## 2) Clone The Repository

```bash
git clone https://github.com/jackmclean25/VIP_Model.git
cd VIP_Model
```

If your local folder has a different name, `cd` into that folder.

## 3) Install Dependencies

```bash
npm install
```

## 4) Start Vite Dev Server

Recommended command for this project:

```bash
npm run dev -- --host --port 5180 --strictPort --open
```

What the flags do:
- `--host`: allows access from local network if needed
- `--port 5180`: runs on port 5180
- `--strictPort`: fails instead of auto-switching ports
- `--open`: opens browser automatically

You can also run default Vite behavior:

```bash
npm run dev
```

That usually opens on the default Vite port (`5173`) unless occupied.

## 5) Open In Browser Manually

If browser does not open automatically:

```bash
open -a "Google Chrome" http://localhost:5180/
```

Or use your browser at:
- `http://localhost:5180`
- If using default port mode, check terminal output for the URL.

## 6) Common Issues

### Port 5180 already in use

Kill processes using 5180 and restart:

```bash
(lsof -tiTCP:5180 -sTCP:LISTEN | xargs kill -9) 2>/dev/null || true
```

Then run dev server again.

### Dependencies look broken

Try a clean reinstall:

```bash
rm -rf node_modules package-lock.json
npm install
```

### Verify scripts available

```bash
npm run
```

Expected key scripts:
- `dev`
- `build`
- `lint`
- `preview`

## 7) Build And Preview

Build production bundle:

```bash
npm run build
```

Preview production bundle locally:

```bash
npm run preview
```

## 8) Stop The Dev Server

Press `Ctrl + C` in the terminal where Vite is running.
