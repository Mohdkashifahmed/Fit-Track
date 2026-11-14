require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const connectDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/fitness_tracker';

app.use(express.json());

// Needed only when the frontend runs on a different address (e.g. Live Server on :5500)
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5500', credentials: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGO_URI }),
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 * 7 } // 7 days
}));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/fitness', require('./routes/fitness'));
app.use('/api/goals', require('./routes/goals'));

// Optional: serve the frontend from ./public (copy the frontend files there, set API_BASE to '')
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', (req, res) => res.status(404).json({ message: 'Route not found' }));

// Central error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Something went wrong on the server' });
});

connectDB()
  .then(() => app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`)))
  .catch(err => { console.error('Could not connect to MongoDB:', err.message); process.exit(1); });
