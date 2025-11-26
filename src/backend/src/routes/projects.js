import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
    listProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
    joinProjectByCode,
    removeMember,
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
router.delete('/:projectId/members/:memberId', removeMember);

export default router;
