import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
    listTasks,
    createTask,
    updateTask,
    deleteTask,
    reorderTasks,
    importLocalTasks,
    getBacklog,
    createBacklogTask,
    moveTask,
} from '../controllers/tasksController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Task CRUD
router.get('/:projectId/tasks', listTasks);
router.post('/:projectId/tasks', createTask);
router.patch('/:projectId/tasks/:taskId', updateTask);
router.delete('/:projectId/tasks/:taskId', deleteTask);

// Backlog endpoints
router.get('/:projectId/backlog', getBacklog);
router.post('/:projectId/backlog', createBacklogTask);

// Move a task (handles moves between backlog and columns with WIP checks)
router.post('/:projectId/tasks/:taskId/move', moveTask);

// Bulk reorder
router.patch('/:projectId/tasks-reorder', reorderTasks);

// Import from localStorage
router.post('/:projectId/import-local', importLocalTasks);

export default router;
