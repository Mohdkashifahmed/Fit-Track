# Fitness Tracker Dashboard (frontend + backend in one project)

Everything is already connected. The frontend is in `public/`, the API is in `routes/`, and `.env` is ready for a local MongoDB.

## Steps
1. Install Node.js (LTS) from nodejs.org.
2. Install MongoDB Community Server (keep "run as a service" ticked), or use MongoDB Atlas and paste its link into `MONGO_URI` in `.env`.
3. Open a terminal in this folder and run:
   ```
   npm install
   npm start
   ```
4. Open http://localhost:5001 in your browser.

You should see `MongoDB connected` in the terminal. Stop the server with Ctrl+C; start it again with `npm start`.

## Files
- `server.js` starts the app
- `.env` settings (port, database link, session secret)
- `public/` the website (index.html = login, dashboard.html = dashboard)
- `routes/`, `models/`, `middleware/`, `config/` the backend code

To change the database, edit `MONGO_URI` in `.env`. See `BACKEND-README.md` for the API routes.
