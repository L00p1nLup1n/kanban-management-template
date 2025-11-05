import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import process from 'process';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function testConnection() {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/kanban';
  
  try {
    console.log('Testing MongoDB connection...');
    console.log('URI:', MONGO_URI);
    
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB connected successfully!');
    
    // Test basic operations
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📦 Available collections:', collections.map(c => c.name));
    
    // Show database stats
    const stats = await mongoose.connection.db.stats();
    console.log('📊 Database stats:');
    console.log('  - Database:', stats.db);
    console.log('  - Collections:', stats.collections);
    console.log('  - Data size:', (stats.dataSize / 1024).toFixed(2), 'KB');
    
    await mongoose.connection.close();
    console.log('✅ Connection closed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();
