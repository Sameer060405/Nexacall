import { Router } from 'express';
import {
  sendInvitation,
  getInvitations,
  respondToInvitation,
  deleteInvitation,
} from '../controllers/invitation.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = Router();

router.post('/', authMiddleware, sendInvitation);
router.get('/', authMiddleware, getInvitations);
router.put('/:id/respond', authMiddleware, respondToInvitation);
router.delete('/:id', authMiddleware, deleteInvitation);

export default router;

