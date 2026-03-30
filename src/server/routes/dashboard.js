import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { getDashboard } from '../controllers/dashboardController.js';

const router = express.Router();

router.use(authenticate);
router.use(requireRole('project_manager'));

router.get('/', getDashboard);

export default router;
