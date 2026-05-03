import { Router } from 'express';
import {
  searchUsers,
  getContacts,
  addContact,
  removeContact,
  getSpeedDial,
  addSpeedDial,
  removeSpeedDial,
} from '../controllers/user.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = Router();

router.get('/search', authMiddleware, searchUsers);
router.get('/contacts', authMiddleware, getContacts);
router.post('/contacts', authMiddleware, addContact);
router.delete('/contacts/:userId', authMiddleware, removeContact);
router.get('/speed-dial', authMiddleware, getSpeedDial);
router.post('/speed-dial', authMiddleware, addSpeedDial);
router.delete('/speed-dial/:userId', authMiddleware, removeSpeedDial);

export default router;
