// friendRequest.routes.js
// NEW: REST endpoints for connection/friend requests.
// All routes require a valid JWT (authMiddleware).
import { Router } from 'express';
import authMiddleware from '../middleware/auth.middleware.js';
import {
    sendRequest,
    getIncoming,
    getSent,
    acceptRequest,
    rejectRequest,
    cancelRequest,
} from '../controllers/friendRequest.controller.js';

const router = Router();
router.use(authMiddleware);

// POST   /api/v1/friend-requests              — send a request   { recipientId }
// GET    /api/v1/friend-requests/incoming     — list incoming pending requests
// GET    /api/v1/friend-requests/sent         — list sent requests (all statuses)
// PUT    /api/v1/friend-requests/:id/accept   — accept a pending request
// PUT    /api/v1/friend-requests/:id/reject   — reject a pending request
// DELETE /api/v1/friend-requests/:id          — cancel a sent pending request

router.get('/incoming',       getIncoming);
router.get('/sent',           getSent);
router.post('/',              sendRequest);
router.put('/:id/accept',     acceptRequest);
router.put('/:id/reject',     rejectRequest);
router.delete('/:id',         cancelRequest);

export default router;
