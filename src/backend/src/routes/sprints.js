import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  listSprints,
  createSprint,
  getSprint,
  updateSprint,
  deleteSprint,
  getSprintMetrics,
  getActiveSprint,
} from '../controllers/sprintController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Sprint CRUD
router.get('/projects/:projectId/sprints', listSprints);
router.post('/projects/:projectId/sprints', createSprint);
router.get('/projects/:projectId/sprints/active', getActiveSprint);
router.get('/projects/:projectId/sprints/:sprintId', getSprint);
router.patch('/projects/:projectId/sprints/:sprintId', updateSprint);
router.delete('/projects/:projectId/sprints/:sprintId', deleteSprint);

// Sprint metrics
router.get('/projects/:projectId/sprints/:sprintId/metrics', getSprintMetrics);

export default router;
