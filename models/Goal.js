const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  goalType: { type: String, enum: ['steps', 'calories', 'water'], required: true },
  targetValue: { type: Number, required: true, min: 0.000001 },
  startDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  endDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  completionPercent: { type: Number, default: 0 }
}, { timestamps: true });

goalSchema.set('toJSON', {
  transform: (doc, ret) => { ret.goalId = String(ret._id); ret.userId = String(ret.userId); delete ret._id; delete ret.__v; return ret; }
});

module.exports = mongoose.model('Goal', goalSchema);
