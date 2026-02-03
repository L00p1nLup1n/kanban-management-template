import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import cors from 'cors';
import http from 'http';
import { initSocket } from './socket.js';
import authRoutes from './routes/auth.js';
import projectsRoutes from './routes/projects.js';
import tasksRoutes from './routes/tasks.js';
import sprintsRoutes from './routes/sprints.js';
import process from 'process';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: [
      process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
      'http://localhost:5174',
    ],
    credentials: true,
  }),
);

app.get('/health', (_req, res) => res.json({ ok: true }));

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/projects', projectsRoutes);
app.use('/api/v1/projects', tasksRoutes); // tasks are nested under projects
app.use('/api/v1', sprintsRoutes); // sprints are nested under projects

const PORT = process.env.PORT || 4000;

async function start() {
  const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/kanban';
  try {
    await mongoose.connect(MONGO);
    console.log('MongoDB connected');

    const server = http.createServer(app);
    // initialize socket.io on the server
    initSocket(server, {
      cors: {
        origin: [
          process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
          'http://localhost:5174',
        ],
        methods: ['GET', 'POST'],
      },
    });

    server.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
}

start();
