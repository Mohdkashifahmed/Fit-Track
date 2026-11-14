const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/fitness_tracker';
  await mongoose.connect(uri);
  console.log('MongoDB connected');
  return uri;
}

module.exports = connectDB;
