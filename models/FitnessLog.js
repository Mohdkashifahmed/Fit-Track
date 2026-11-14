const mongoose = require('mongoose');

const fitnessLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ }, // YYYY-MM-DD
  steps: { type: Number, default: 0, min: 0 },
  caloriesBurned: { type: Number, default: 0, min: 0 },
  waterIntake: { type: Number, default: 0, min: 0 },   // litres
  workoutTime: { type: Number, default: 0, min: 0 },   // minutes
  notes: { type: String, default: '', maxlength: 500 }
}, { timestamps: true });

fitnessLogSchema.index({ userId: 1, date: 1 });

fitnessLogSchema.set('toJSON', {
  transform: (doc, ret) => { ret.logId = String(ret._id); ret.userId = String(ret.userId); delete ret._id; delete ret.__v; return ret; }
});

module.exports = mongoose.model('FitnessLog', fitnessLogSchema);
