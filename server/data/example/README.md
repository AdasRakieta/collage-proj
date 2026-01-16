Sample dev data for Journey Planner

Location: `server/data/example/`

Purpose:
- Provide small, tracked example JSON files for other developers to use when running the server in JSON fallback or for local development.
- These files live in `server/data/example/` (subfolder) so they are not ignored by the `.gitignore` rule `server/data/*.json`.

Included files:
- `users.json` - sample users (includes `admin` placeholder). Note: when the server runs with JSON fallback and `users` has no `admin` user, the server will automatically create an admin account with username `admin` and password `admin123` and store it in `server/data/users.json`.
- `journeys.json`, `stops.json`, `transports.json`, `attractions.json`, `attachments.json` - small sample records linked to the sample `dev` user.

Default JSON-fallback admin account:
- username: `admin`
- password: `admin123`
- The server (`server/src/index.ts`) will create this account automatically if it does not find an `admin` user in the JSON store. The created account contains a hashed password in `password_hash`.

How to use these samples locally:
1. Copy example files into `server/data/` (the server expects JSON files directly under `server/data/`):

```powershell
# from repository root (Windows PowerShell)
Copy-Item -Path server\data\example\* -Destination server\data\ -Force
```

2. Start the server in dev mode (ensure your env variables are set) and it will use these JSON files:

```powershell
cd server
npm run dev
```

3. Notes:
- `server/data/*.json` files in `server/data/` are ignored by Git in this repo (they are untracked by design). Use the `server/data/example/` files as a tracked source of truth for initial data that developers can copy locally.
- If you want to clear and re-seed `server/data/`, back up the existing JSON files first.

If you want, I can also add a small script (`server/scripts/load-example-data.ps1`) that copies these example files into `server/data/` automatically.
