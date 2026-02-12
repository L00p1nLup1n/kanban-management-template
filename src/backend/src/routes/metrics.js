import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getProjectMetrics } from '../controllers/metricsController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Flow metrics for a project
router.get('/:projectId/metrics', getProjectMetrics);

export default router;
