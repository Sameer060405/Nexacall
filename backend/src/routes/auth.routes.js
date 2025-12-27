import { Router } from 'express';
import { register, login, getProfile, addToHistory, getHistory } from '../controllers/auth.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';
const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/profile', authMiddleware, getProfile);
router.post('/history', authMiddleware, addToHistory);
router.get('/history', authMiddleware, getHistory);

export default router;
