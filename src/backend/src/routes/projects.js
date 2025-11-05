import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
    listProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
    joinProjectByCode,
} from '../controllers/projectsController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/', listProjects);
router.post('/', createProject);
router.post('/join', joinProjectByCode);
router.get('/:projectId', getProject);
router.patch('/:projectId', updateProject);
router.delete('/:projectId', deleteProject);

export default router;
