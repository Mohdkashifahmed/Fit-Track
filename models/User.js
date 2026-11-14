const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true }, // bcrypt hash, never the plain password
  age: { type: Number, min: 5, max: 120 },
  gender: { type: String, default: '' }
}, { timestamps: true });

userSchema.set('toJSON', {
  transform: (doc, ret) => { ret.userId = String(ret._id); delete ret._id; delete ret.__v; delete ret.password; return ret; }
});

module.exports = mongoose.model('User', userSchema);
