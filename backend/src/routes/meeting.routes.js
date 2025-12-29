import { Router } from 'express';
import {
  createMeeting,
  getMeetings,
  getTodaysMeetings,
  updateMeeting,
  deleteMeeting,
  getMeetingMetrics,
} from '../controllers/meeting.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = Router();

// Debug middleware to log requests
router.use((req, res, next) => {
    console.log(`Meeting route: ${req.method} ${req.path}`);
    console.log(`Request body:`, req.body);
    next();
});

// Test endpoint without auth to verify route is accessible
router.get('/test', (req, res) => {
    res.json({ message: 'Meeting routes are working!' });
});

router.post('/', authMiddleware, createMeeting);
router.get('/', authMiddleware, getMeetings);
router.get('/today', authMiddleware, getTodaysMeetings);
router.get('/metrics', authMiddleware, getMeetingMetrics);
router.put('/:id', authMiddleware, updateMeeting);
router.delete('/:id', authMiddleware, deleteMeeting);

export default router;

