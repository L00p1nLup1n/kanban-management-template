import { execSync } from 'child_process';
import os from 'os';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import process from 'process';
import { VALID_ROLES } from '../../shared/roles.js';

// Define schemas inline to avoid TS import issues
const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    name: { type: String },
    role: {
      type: String,
      enum: VALID_ROLES,
      required: true,
    },
  },
  { timestamps: true },
);

const ColumnSchema = new Schema({
  id: { type: String, required: true },
  key: { type: String, required: true },
  title: { type: String, required: true },
  order: { type: Number, required: true },
});

const ProjectSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    description: { type: String },
    columns: [ColumnSchema],
    members: [
      {
        _id: false,
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, required: true },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    joinCode: { type: String, index: true },
  },
  { timestamps: true },
);

const TaskSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    columnKey: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    color: { type: String },
    order: { type: Number, required: true },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User' },
    labels: [{ type: String }],
    estimate: { type: Number },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

// Create indexes
ProjectSchema.index({ ownerId: 1 });
TaskSchema.index({ projectId: 1, columnKey: 1, order: 1 });

const User = mongoose.model('User', UserSchema);
const Project = mongoose.model('Project', ProjectSchema);
const Task = mongoose.model('Task', TaskSchema);

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function ensureMongoDB() {
  if (os.platform() !== 'darwin') {
    console.log(
      'Non-macOS detected, skipping Homebrew check. Ensure MongoDB is running.\n',
    );
    return;
  }

  // Check if mongodb-community@6.0 is installed via Homebrew
  try {
    execSync('brew list mongodb-community@6.0 2>&1', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch {
    console.log(
      'mongodb-community@6.0 not found via Homebrew, skipping auto-start.\n',
    );
    return;
  }

  // Check if it's running, start if not
  try {
    const info = JSON.parse(
      execSync('brew services info mongodb-community@6.0 --json', {
        encoding: 'utf-8',
      }),
    );
    const isRunning = info[0]?.running;
    if (!isRunning) {
      console.log('Starting mongodb-community@6.0 via Homebrew...');
      execSync('brew services start mongodb-community@6.0', {
        stdio: 'inherit',
      });
      console.log('MongoDB started\n');
    } else {
      console.log('MongoDB is already running\n');
    }
  } catch (err) {
    console.log('Could not auto-start MongoDB via Homebrew:', err.message);
    console.log('Attempting to connect anyway...\n');
  }
}

async function initializeDatabase() {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/kanban';

  try {
    console.log('Initializing database...\n');

    ensureMongoDB();

    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB\n');

    // Create indexes
    console.log('Creating indexes...');
    await User.createIndexes();
    await Project.createIndexes();
    await Task.createIndexes();
    console.log('Indexes created\n');

    // Show summary
    const userCount = await User.countDocuments();
    const projectCount = await Project.countDocuments();
    const taskCount = await Task.countDocuments();

    console.log('Database Summary:');
    console.log(`  Users: ${userCount}`);
    console.log(`  Projects: ${projectCount}`);
    console.log(`  Tasks: ${taskCount}`);
    console.log('\nDatabase initialized successfully!');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

initializeDatabase();
