# AGENTS.md

## Cursor Cloud specific instructions

### Project Overview

Family Tree web application (Node.js + Express + SQLite). Two deployment configurations exist:

- **Backend API** (`backend/server.js`): Express server on port 5000 with SQLite — this is the primary development target.
- **Combined server** (`index.js`): Serves frontend + API together. Uses JWT-based auth (different from the backend's phone+password flow).
- **Frontend** (`index.html`, `js/app.js`, `css/style.css`): Vanilla HTML/CSS/JS. `API_BASE` auto-detects localhost and uses port 5000 locally, otherwise falls back to the remote Render host.

### Running the Backend

```bash
cd backend && npm start   # or: node server.js
```

Listens on `PORT` env var or 5000 by default. SQLite database (`familytree.db`) is auto-created in the working directory on first start.

### Serving the Frontend Locally

Use any static file server from the repo root, e.g.:

```bash
python3 -m http.server 3000
```

The frontend's `API_BASE` auto-detects localhost and points to `http://localhost:5000/api` for local development.

### Login Credentials (Local Dev)

The backend uses phone+password authentication. To log in:
- **Phone**: any phone number that exists in the `people` table (e.g., `555-000-0000`)
- **Password**: `blackfamily2024` (hardcoded in `backend/server.js`)

You must first seed a person with a phone number via the API before logging in.

### Key Gotchas

- **No linter or test framework configured**: `backend/package.json` has `"test": "echo \"Error: no test specified\" && exit 1"`. There are no ESLint, Prettier, or other lint/test configurations.
- **SQLite DB is a local file**: The `familytree.db` file is created relative to the server's CWD. If you run `backend/server.js` from `/workspace/backend`, the DB is at `/workspace/backend/familytree.db`.
- **No `.env` file**: The backend uses `process.env.PORT` (default 5000) and `process.env.NODE_ENV`. The family password is hardcoded in `server.js`.
- **Express 5**: The backend uses Express 5.x (`^5.1.0`), which has some API differences from Express 4.
- **Massive code duplication in `js/app.js`**: The file is ~9,400 lines with the `DOMContentLoaded` initialization handler duplicated 25+ times. This causes an infinite rendering loop when the page auto-restores a session from localStorage. Workaround: clear `localStorage` before each fresh session or always log in via the modal.
- **Add Person form bug**: The frontend form sends `first_name`/`last_name` as separate fields, but the backend expects a single `name` field. Use the API directly to add people reliably.
