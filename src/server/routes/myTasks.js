import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getMyTasksList } from '../controllers/myTasksController.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getMyTasksList);

export default router;
