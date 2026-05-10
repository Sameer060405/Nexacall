// message.routes.js
// All routes are protected by authMiddleware — no unauthenticated access.
import { Router } from 'express';
import authMiddleware from '../middleware/auth.middleware.js';
import {
    getMessages,
    sendMessage,
    getConversations,
    acceptMessageRequest,
    rejectMessageRequest,
} from '../controllers/message.controller.js';

const router = Router();
router.use(authMiddleware);

// GET  /api/v1/messages                              — list all conversations
// POST /api/v1/messages                              — send a message { recipientId, body }
// GET  /api/v1/messages/:recipientId                 — fetch full thread
// PUT  /api/v1/messages/conversation/:convId/accept  — accept message request
// PUT  /api/v1/messages/conversation/:convId/reject  — reject message request

// NOTE: specific paths must come BEFORE /:recipientId to avoid param matching
router.get('/conversation/:convId/accept', (req, res) => res.redirect(308, req.path)); // guard
router.put('/conversation/:convId/accept', acceptMessageRequest);
router.put('/conversation/:convId/reject', rejectMessageRequest);

router.get('/',              getConversations);
router.post('/',             sendMessage);
router.get('/:recipientId',  getMessages);

export default router;
