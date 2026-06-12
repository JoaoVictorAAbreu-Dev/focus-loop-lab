# Architecture

Focus Loop is split into a frontend app and a small local backend.

## Frontend

- React + TypeScript + Vite
- Owns the task board, Pomodoro view, agenda view, and summary copy action
- Talks to the backend through `/api`

## Backend

- Node.js HTTP server in `server.js`
- Persists state in `data/state.json`
- Exposes a minimal REST API for tasks and Pomodoro state

## Data Flow

1. The app loads state from `GET /api/state`.
2. User actions update tasks or Pomodoro state through `POST`, `PATCH`, or `DELETE`.
3. The backend writes the current state to disk.
4. The UI refreshes after each update.

## Why This Shape

- Easy to run locally.
- Simple to inspect and extend.
- Keeps the UI focused on product behavior instead of infrastructure.

