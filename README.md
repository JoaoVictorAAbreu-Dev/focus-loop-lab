# Focus Loop

Focus Loop is a lightweight productivity workspace for people who want to capture tasks fast, keep a clear daily rhythm, and preserve focus without switching tools.

It combines three daily surfaces in one app:

- task capture and triage
- a simple Pomodoro workspace
- a compact agenda view

The project uses a local Node.js backend with file-based persistence so the app stays easy to run, inspect, and extend.

## Features

- Capture quick tasks with priority levels: `Agora`, `Hoje`, and `Depois`
- Mark tasks as complete, reopen them, or clear completed items
- Copy a daily summary for chat, notes, or standup updates
- Use the Pomodoro screen to start, pause, switch, and reset focus sessions
- Review a minimal agenda view with day structure
- Persist tasks and Pomodoro state through a local backend API

## Tech Stack

- React
- TypeScript
- Vite
- Node.js HTTP server
- File-based persistence

## Architecture

- `src/` contains the frontend application
- `server.js` exposes the local API
- `data/state.json` is generated automatically and stores the persisted state
- `vite.config.ts` proxies `/api` requests to the local backend during development
- Full details: [`docs/architecture.md`](docs/architecture.md)

## API Surface

- `GET /api/health` returns a basic health check
- `GET /api/state` returns the current task and Pomodoro state
- `POST /api/tasks` creates a new task
- `PATCH /api/tasks/:id` updates a task
- `DELETE /api/tasks/:id` removes a task
- `PATCH /api/pomodoro` updates Pomodoro state

## Requirements

- Node.js 22 or newer
- npm 10 or newer

## Setup

```powershell
npm install
```

## Development

Start the frontend and backend together:

```powershell
npm run dev
```

Development endpoints:

- Frontend: `http://127.0.0.1:4173`
- API: `http://127.0.0.1:3001`

## Quality Checks

```powershell
npm run build
npm run lint
npm run test:server
```

## Project Structure

- `src/App.tsx` - main UI and app behavior
- `src/App.css` - layout and visual system
- `server.js` - HTTP API and persistence
- `server.test.js` - backend tests
- `data/` - generated state storage
- Contribution notes: [`docs/contributing.md`](docs/contributing.md)

## Notes

- The backend creates `data/state.json` automatically on first run.
- The app is intentionally local-first and simple to extend.
- If you want to reset the app state, delete `data/state.json` and restart the backend.
