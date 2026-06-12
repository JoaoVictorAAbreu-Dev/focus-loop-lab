# Focus Loop

Focus Loop is a lightweight productivity workspace for keeping quick tasks, short focus sessions, and a simple daily agenda in one place.

## What it does

- Capture tasks quickly without leaving the workflow.
- Group tasks by priority: `Agora`, `Hoje`, and `Depois`.
- Use a built-in Pomodoro screen for short focus blocks.
- Review a compact daily agenda.
- Copy a daily summary to paste in chat or notes.
- Persist data through a small local backend.

## Tech Stack

- React
- TypeScript
- Vite
- Node.js HTTP server

## Project Structure

- `src/` - frontend application
- `server.js` - local API and file-based persistence
- `data/state.json` - stored app state created at runtime

## Requirements

- Node.js 22+
- npm 10+

## Setup

```powershell
npm install
```

## Development

Run the frontend and backend together:

```powershell
npm run dev
```

This starts:

- Vite on `http://127.0.0.1:4173`
- API server on `http://127.0.0.1:3001`

## Build

```powershell
npm run build
```

## Lint

```powershell
npm run lint
```

## API

- `GET /api/health` - health check
- `GET /api/state` - returns tasks and Pomodoro state
- `POST /api/tasks` - creates a task
- `PATCH /api/tasks/:id` - updates a task
- `DELETE /api/tasks/:id` - removes a task
- `PATCH /api/pomodoro` - updates Pomodoro state

## Notes

- The backend stores data in `data/state.json`.
- The file is created automatically on first run.
- The app is intentionally simple and local-first.
