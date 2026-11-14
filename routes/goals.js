const express = require('express');
const mongoose = require('mongoose');
const Goal = require('../models/Goal');
const FitnessLog = require('../models/FitnessLog');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();
router.use(requireLogin);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const FIELD = { steps: 'steps', calories: 'caloriesBurned', water: 'waterIntake' };
const uid = req => new mongoose.Types.ObjectId(req.session.userId);

// POST /api/goals
router.post('/', async (req, res, next) => {
  try {
    const { goalType, targetValue, startDate, endDate } = req.body;
    if (!FIELD[goalType]) return res.status(400).json({ message: 'goalType must be steps, calories or water' });
    const target = Number(targetValue);
    if (!(target > 0)) return res.status(400).json({ message: 'targetValue must be above zero' });
    if (!DATE_RE.test(startDate || '') || !DATE_RE.test(endDate || '')) return res.status(400).json({ message: 'Dates must be YYYY-MM-DD' });
    if (endDate < startDate) return res.status(400).json({ message: 'endDate must be on or after startDate' });
    const goal = await Goal.create({ userId: uid(req), goalType, targetValue: target, startDate, endDate });
    res.status(201).json(goal);
  } catch (err) { next(err); }
});

// GET /api/goals/progress
// currentValue = sum of the matching log field between startDate and endDate
// completionPercent = min(100, currentValue / targetValue * 100)
router.get('/progress', async (req, res, next) => {
  try {
    const goals = await Goal.find({ userId: uid(req) }).sort({ createdAt: -1 });
    const result = await Promise.all(goals.map(async g => {
      const agg = await FitnessLog.aggregate([
        { $match: { userId: uid(req), date: { $gte: g.startDate, $lte: g.endDate } } },
        { $group: { _id: null, total: { $sum: '$' + FIELD[g.goalType] } } }
      ]);
      const current = agg.length ? agg[0].total : 0;
      const percent = Math.min(100, Math.round((current / g.targetValue) * 100));
      if (g.completionPercent !== percent) { g.completionPercent = percent; await g.save(); }
      return { ...g.toJSON(), currentValue: +current.toFixed(1), completionPercent: percent };
    }));
    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;
