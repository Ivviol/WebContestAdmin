import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/contest-app';

export async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('MongoDB connected:', MONGO_URI);
  } catch (err) {
    console.error('MongoDB connection failed:', MONGO_URI, err.message);
    process.exit(1);
  }
}
