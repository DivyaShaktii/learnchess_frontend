# Chess Mistake Coach Frontend

This is the frontend for the Chess Mistake Coach, built with React, Vite, and Tailwind CSS. It connects to the FastAPI backend to provide real-time coaching feedback before committing a chess move.

## Local Development Run Order

To run this application locally, you need both the backend and frontend running simultaneously.

### 1. Start the Backend
From the root of the backend directory (`chess-mistake-coach`), ensure your virtual environment is active and `STOCKFISH_PATH` is set, then run:

```bash
uvicorn app.main:app --reload --port 8000
```

Confirm the backend is healthy by visiting:
`http://localhost:8000/health` (It should return `{"status":"ok"}`).

### 2. Start the Frontend
From the `Frontend` directory, install dependencies (if not already done) and start the Vite dev server. The API base URL is configured via `.env.local`.

```bash
npm install
npm run dev
```

The application will be available at `http://localhost:5173` (or whichever port Vite assigns).

## Architecture Notes
- The frontend strictly uses the backend as the single source of truth for move evaluations and classifications.
- Local `chess.js` is used only for pre-validating drag-and-drop legality to prevent sending invalid SAN/UCI to the server.
- The visual piece drop is deferred until the backend's `/api/move/precheck` endpoint confirms the move is acceptable or until the user explicitly commits to a warned move.
