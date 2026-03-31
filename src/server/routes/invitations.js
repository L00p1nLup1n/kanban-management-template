import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  listPendingInvitations,
  acceptInvitation,
  declineInvitation,
  deleteInvitation,
} from '../controllers/invitationController.js';

const router = Router();

router.use(authenticate);

router.get('/pending', listPendingInvitations);
router.post('/:invitationId/accept', acceptInvitation);
router.post('/:invitationId/decline', declineInvitation);
router.delete('/:invitationId', deleteInvitation);

export default router;
