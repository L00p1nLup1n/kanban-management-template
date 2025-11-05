import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcrypt';
import process from 'process';

// Define schemas inline to avoid TS import issues
const { Schema } = mongoose;

const UserSchema = new Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  name: { type: String },
}, { timestamps: true });

const ColumnSchema = new Schema({
  id: { type: String, required: true },
  key: { type: String, required: true },
  title: { type: String, required: true },
  order: { type: Number, required: true },
});

const ProjectSchema = new Schema({
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  description: { type: String },
  columns: [ColumnSchema],
}, { timestamps: true });

const TaskSchema = new Schema({
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
}, { timestamps: true });

// Create indexes
ProjectSchema.index({ ownerId: 1 });
TaskSchema.index({ projectId: 1, columnKey: 1, order: 1 });

const User = mongoose.model('User', UserSchema);
const Project = mongoose.model('Project', ProjectSchema);
const Task = mongoose.model('Task', TaskSchema);

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function initializeDatabase() {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/kanban';
  
  try {
    console.log('🚀 Initializing database...\n');
    
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Create indexes
    console.log('📑 Creating indexes...');
    await User.createIndexes();
    await Project.createIndexes();
    await Task.createIndexes();
    console.log('✅ Indexes created\n');
    
    // Check if demo user exists
    const demoEmail = 'demo@kanban.local';
    let demoUser = await User.findOne({ email: demoEmail });
    
    if (!demoUser) {
      console.log('👤 Creating demo user...');
      const passwordHash = await bcrypt.hash('demo123', 10);
      demoUser = await User.create({
        email: demoEmail,
        passwordHash,
        name: 'Demo User',
      });
      console.log('✅ Demo user created:');
      console.log('   Email:', demoEmail);
      console.log('   Password: demo123');
      console.log('   (Change this in production!)\n');
    } else {
      console.log('ℹ️  Demo user already exists\n');
    }
    
    // Check if demo project exists
    let demoProject = await Project.findOne({ ownerId: demoUser._id });
    
    if (!demoProject) {
      console.log('📋 Creating demo project...');
      demoProject = await Project.create({
        ownerId: demoUser._id,
        name: 'My First Kanban Board',
        description: 'Welcome to your Kanban board!',
        columns: [
          { id: 'col-1', key: 'hot-tasks', title: 'Hot tasks', order: 1 },
          { id: 'col-2', key: 'to-do', title: 'To do', order: 2 },
          { id: 'col-3', key: 'in-work', title: 'In work', order: 3 },
          { id: 'col-4', key: 'done', title: 'Done', order: 4 },
        ],
      });
      console.log('✅ Demo project created\n');
      
      // Create sample tasks
      console.log('📝 Creating sample tasks...');
      const sampleTasks = [
        {
          projectId: demoProject._id,
          columnKey: 'hot-tasks',
          title: 'Review API documentation',
          color: 'orange.300',
          order: 1000,
          createdBy: demoUser._id,
        },
        {
          projectId: demoProject._id,
          columnKey: 'to-do',
          title: 'Set up authentication',
          color: 'blue.300',
          order: 1000,
          createdBy: demoUser._id,
        },
        {
          projectId: demoProject._id,
          columnKey: 'in-work',
          title: 'Build task management API',
          color: 'yellow.300',
          order: 1000,
          createdBy: demoUser._id,
        },
        {
          projectId: demoProject._id,
          columnKey: 'done',
          title: 'Initialize MongoDB database',
          color: 'green.300',
          order: 1000,
          createdBy: demoUser._id,
        },
      ];
      
      await Task.insertMany(sampleTasks);
      console.log('✅ Sample tasks created\n');
    } else {
      console.log('ℹ️  Demo project already exists\n');
    }
    
    // Show summary
    const userCount = await User.countDocuments();
    const projectCount = await Project.countDocuments();
    const taskCount = await Task.countDocuments();
    
    console.log('📊 Database Summary:');
    console.log(`   Users: ${userCount}`);
    console.log(`   Projects: ${projectCount}`);
    console.log(`   Tasks: ${taskCount}`);
    console.log('\n✅ Database initialized successfully!');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

initializeDatabase();
