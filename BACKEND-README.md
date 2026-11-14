# Fitness Tracker Dashboard: backend

Node.js + Express REST API with MongoDB (Mongoose). Passwords are hashed with bcrypt and login uses a session cookie stored in MongoDB.

## Setup
1. Install Node.js 18 or newer and MongoDB (local, or a free MongoDB Atlas cluster).
2. In this folder:
   ```bash
   npm install
   cp .env.example .env     # on Windows: copy .env.example .env
   npm start                # or: npm run dev
   ```
3. Edit `.env` if needed (`MONGO_URI`, `SESSION_SECRET`, `CLIENT_ORIGIN`). The server runs on http://localhost:5000.

## Connect the frontend
**Option A: separate servers.** In the frontend `js/config.js` set `USE_MOCK: false` and `API_BASE: 'http://localhost:5000'`. Open the frontend with Live Server on port 5500 and set `CLIENT_ORIGIN` in `.env` to exactly that address. Use `localhost` in both places (do not mix `localhost` and `127.0.0.1`), or the session cookie will not be sent.

**Option B: one server.** Copy the frontend files into `public/`, set `API_BASE: ''` and `USE_MOCK: false`, then open http://localhost:5000.

## Routes (all except register and login need a logged-in session)
| Method | Route | Purpose |
|---|---|---|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Log in |
| POST | /api/auth/logout | Log out |
| GET | /api/auth/me | Check the session |
| POST | /api/fitness/add | Add a daily log |
| GET | /api/fitness/logs?from=&to= | List logs (optionally in a date range) |
| GET | /api/fitness/logs/:date | Logs for one date (YYYY-MM-DD) |
| PUT | /api/fitness/logs/:id | Update a log |
| DELETE | /api/fitness/logs/:id | Delete a log |
| POST | /api/goals | Set a goal |
| GET | /api/goals/progress | Goals with currentValue and completionPercent |
| GET | /api/fitness/summary/weekly | Last 7 days: totalSteps, averageCalories, totalWater, totalWorkoutTime |
| GET | /api/fitness/stats?from=&to= | Per-day arrays for charts |

## Dashboard logic
- Total steps this week = sum of `steps` over the last 7 days.
- Average calories burned = sum of `caloriesBurned` divided by the number of days that have a log.
- Goal completion % = min(100, current value / target value x 100), where current value is the sum of the matching field (steps, caloriesBurned or waterIntake) between the goal's start and end dates.
- `/stats` returns one value per day in the range, with 0 for days that have no log.

## Structure
```
server.js          app setup, session, routes
config/db.js       MongoDB connection
models/            User, FitnessLog, Goal
middleware/auth.js login check
routes/            auth, fitness, goals
public/            optional place for the frontend files
```

## Data model
- Users: name, email (unique), password (hash), age, gender
- FitnessLogs: userId, date, steps, caloriesBurned, waterIntake, workoutTime, notes
- Goals: userId, goalType, targetValue, startDate, endDate, completionPercent

Every query is filtered by the logged-in user's id, so users only see their own data.
