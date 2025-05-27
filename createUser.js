// createUser.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import bcrypt from 'bcryptjs';

dotenv.config();

// Wrap everything in an async function
async function createUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    const hashedPassword = await bcrypt.hash('Admin@1', 12);
    const user = await User.create({
      username: 'Admin',  // Fixed spelling from 'Libarian'
      password: hashedPassword,
      role: 'admin'      // Fixed spelling from 'libarian'
    });

    console.log('✅ User created:', user);
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);  // Added to ensure script exits
  }
}

// Execute the function
createUser();