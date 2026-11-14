const express = require('express');
const mongoose = require('mongoose');
const FitnessLog = require('../models/FitnessLog');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();
router.use(requireLogin);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const toISO = d => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); };
const uid = req => new mongoose.Types.ObjectId(req.session.userId);

// Checks the body and returns { data } or { error }
function cleanLog(body) {
  const { date, notes } = body;
  if (!date || !DATE_RE.test(date)) return { error: 'Date is required (YYYY-MM-DD)' };
  const data = { date, notes: notes ? String(notes).slice(0, 500) : '' };
  for (const k of ['steps', 'caloriesBurned', 'waterIntake', 'workoutTime']) {
    const v = body[k] === undefined || body[k] === '' ? 0 : Number(body[k]);
    if (!Number.isFinite(v) || v < 0) return { error: `${k} must be a number of 0 or more` };
    data[k] = v;
  }
  return { data };
}

function rangeFromQuery(q) {
  const end = new Date(); const start = new Date(); start.setDate(end.getDate() - 6);
  const from = q.from || toISO(start); const to = q.to || toISO(end);
  if (!DATE_RE.test(from) || !DATE_RE.test(to)) return { error: 'from and to must be YYYY-MM-DD' };
  if (from > to) return { error: 'from must be on or before to' };
  return { from, to };
}

function dayList(from, to) {
  const out = []; const d = new Date(from + 'T00:00:00'); const end = new Date(to + 'T00:00:00');
  while (d <= end) { out.push(toISO(d)); d.setDate(d.getDate() + 1); }
  return out;
}

// POST /api/fitness/add
router.post('/add', async (req, res, next) => {
  try {
    const { data, error } = cleanLog(req.body);
    if (error) return res.status(400).json({ message: error });
    const log = await FitnessLog.create({ ...data, userId: uid(req) });
    res.status(201).json(log);
  } catch (err) { next(err); }
});

// GET /api/fitness/logs?from=&to=   (no range = all logs)
router.get('/logs', async (req, res, next) => {
  try {
    const filter = { userId: uid(req) };
    if (req.query.from || req.query.to) {
      const r = rangeFromQuery(req.query);
      if (r.error) return res.status(400).json({ message: r.error });
      filter.date = { $gte: r.from, $lte: r.to };
    }
    res.json(await FitnessLog.find(filter).sort({ date: -1, createdAt: -1 }));
  } catch (err) { next(err); }
});

// GET /api/fitness/logs/:date
router.get('/logs/:date', async (req, res, next) => {
  try {
    if (!DATE_RE.test(req.params.date)) return res.status(400).json({ message: 'Date must be YYYY-MM-DD' });
    res.json(await FitnessLog.find({ userId: uid(req), date: req.params.date }));
  } catch (err) { next(err); }
});

// PUT /api/fitness/logs/:id
router.put('/logs/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid log id' });
    const { data, error } = cleanLog(req.body);
    if (error) return res.status(400).json({ message: error });
    const log = await FitnessLog.findOneAndUpdate({ _id: req.params.id, userId: uid(req) }, data, { new: true });
    if (!log) return res.status(404).json({ message: 'Log not found' });
    res.json(log);
  } catch (err) { next(err); }
});

// DELETE /api/fitness/logs/:id
router.delete('/logs/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid log id' });
    const log = await FitnessLog.findOneAndDelete({ _id: req.params.id, userId: uid(req) });
    if (!log) return res.status(404).json({ message: 'Log not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

// GET /api/fitness/summary/weekly  -> last 7 days including today
router.get('/summary/weekly', async (req, res, next) => {
  try {
    const end = new Date(); const start = new Date(); start.setDate(end.getDate() - 6);
    const logs = await FitnessLog.find({ userId: uid(req), date: { $gte: toISO(start), $lte: toISO(end) } });
    const days = new Set(logs.map(l => l.date)).size;
    const sum = k => logs.reduce((a, l) => a + (l[k] || 0), 0);
    res.json({
      totalSteps: sum('steps'),
      averageCalories: days ? Math.round(sum('caloriesBurned') / days) : 0, // average over days that have a log
      totalWater: +sum('waterIntake').toFixed(1),
      totalWorkoutTime: sum('workoutTime'),
      days
    });
  } catch (err) { next(err); }
});

// GET /api/fitness/stats?from=&to=  -> one value per day (0 when nothing was logged)
router.get('/stats', async (req, res, next) => {
  try {
    const r = rangeFromQuery(req.query);
    if (r.error) return res.status(400).json({ message: r.error });
    const labels = dayList(r.from, r.to);
    if (labels.length > 366) return res.status(400).json({ message: 'Choose a range of 366 days or less' });
    const logs = await FitnessLog.find({ userId: uid(req), date: { $gte: r.from, $lte: r.to } });
    const by = k => labels.map(day => +logs.filter(l => l.date === day).reduce((a, l) => a + (l[k] || 0), 0).toFixed(2));
    res.json({ labels, steps: by('steps'), calories: by('caloriesBurned'), water: by('waterIntake'), workout: by('workoutTime') });
  } catch (err) { next(err); }
});

module.exports = router;
