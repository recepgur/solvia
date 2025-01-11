import mongoose from 'mongoose';

export async function setupMongoDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/solvia';
  
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}
