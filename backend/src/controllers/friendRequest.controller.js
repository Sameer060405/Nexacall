// friendRequest.controller.js
// NEW: Full CRUD for friend/connection requests.
// On acceptance, BOTH users are added to each other's contacts automatically,
// which fixes the "messaging only works if both users manually add each other" bug.
import FriendRequest from '../models/friendRequest.model.js';
import User from '../models/user.model.js';
import { emitToUser } from './socketManager.js';

// Helper: resolve caller's userId from JWT payload
const myId = (req) => String(req.user?.id || req.user?._id);

// ── POST /api/v1/friend-requests ──────────────────────────────────────────────
// Send a connection request to another NexaCall user.
// Validates: not self, target exists, not already friends, no duplicate request.
export const sendRequest = async (req, res) => {
    try {
        const me = myId(req);
        const { recipientId } = req.body;

        if (!recipientId) return res.status(400).json({ error: 'recipientId is required' });
        if (me === String(recipientId)) return res.status(400).json({ error: 'Cannot send a request to yourself' });

        // Ensure target user exists
        const target = await User.findById(recipientId).select('_id username email').lean();
        if (!target) return res.status(404).json({ error: 'User not found' });

        // Prevent request if they are already contacts
        const alreadyFriends = await User.exists({ _id: me, contacts: recipientId });
        if (alreadyFriends) return res.status(409).json({ error: 'Already connected' });

        // Prevent re-sending a pending request (either direction)
        const existing = await FriendRequest.findOne({
            $or: [
                { from: me,          to: recipientId },
                { from: recipientId, to: me          },
            ],
            status: 'pending',
        }).lean();
        if (existing) return res.status(409).json({ error: 'A pending request already exists' });

        const request = await FriendRequest.create({ from: me, to: recipientId });
        const sender  = await User.findById(me).select('username email _id').lean();

        // Notify recipient in real-time if they are online
        emitToUser(recipientId, 'friend-request-received', {
            request: { _id: request._id, from: sender, status: 'pending', createdAt: request.createdAt },
        });

        res.status(201).json({ success: true, request });
    } catch (err) {
        // Mongoose duplicate key error (11000) means a request already exists
        if (err.code === 11000) return res.status(409).json({ error: 'Request already exists' });
        console.error('[sendRequest]', err);
        res.status(500).json({ error: 'Failed to send request' });
    }
};

// ── GET /api/v1/friend-requests/incoming ─────────────────────────────────────
// Returns all PENDING requests sent TO the current user.
export const getIncoming = async (req, res) => {
    try {
        const requests = await FriendRequest.find({ to: myId(req), status: 'pending' })
            .populate('from', 'username email _id')
            .sort({ createdAt: -1 })
            .lean();
        res.json({ success: true, requests });
    } catch (err) {
        console.error('[getIncoming]', err);
        res.status(500).json({ error: 'Failed to fetch requests' });
    }
};

// ── GET /api/v1/friend-requests/sent ─────────────────────────────────────────
// Returns all requests sent BY the current user (all statuses).
export const getSent = async (req, res) => {
    try {
        const requests = await FriendRequest.find({ from: myId(req) })
            .populate('to', 'username email _id')
            .sort({ createdAt: -1 })
            .lean();
        res.json({ success: true, requests });
    } catch (err) {
        console.error('[getSent]', err);
        res.status(500).json({ error: 'Failed to fetch sent requests' });
    }
};

// ── PUT /api/v1/friend-requests/:id/accept ────────────────────────────────────
// Accept a pending request. Adds both users to each other's contacts, which
// enables bidirectional messaging, calling, and contact list visibility.
export const acceptRequest = async (req, res) => {
    try {
        const me = myId(req);
        const request = await FriendRequest.findOne({
            _id:    req.params.id,
            to:     me,
            status: 'pending',
        });
        if (!request) return res.status(404).json({ error: 'Request not found' });

        request.status = 'accepted';
        await request.save();

        const fromId = String(request.from);

        // Add each user to the other's contacts array (atomic, no duplicates)
        await User.findByIdAndUpdate(me,     { $addToSet: { contacts: fromId } });
        await User.findByIdAndUpdate(fromId, { $addToSet: { contacts: me     } });

        // Tell the original sender their request was accepted
        const accepter = await User.findById(me).select('username email _id').lean();
        emitToUser(fromId, 'friend-request-accepted', {
            request: { _id: request._id, by: accepter },
        });

        res.json({ success: true, request });
    } catch (err) {
        console.error('[acceptRequest]', err);
        res.status(500).json({ error: 'Failed to accept request' });
    }
};

// ── PUT /api/v1/friend-requests/:id/reject ────────────────────────────────────
// Reject a pending request. Does NOT add to contacts.
export const rejectRequest = async (req, res) => {
    try {
        const me = myId(req);
        const request = await FriendRequest.findOne({
            _id:    req.params.id,
            to:     me,
            status: 'pending',
        });
        if (!request) return res.status(404).json({ error: 'Request not found' });

        request.status = 'rejected';
        await request.save();

        const rejecter = await User.findById(me).select('username _id').lean();
        emitToUser(String(request.from), 'friend-request-rejected', {
            request: { _id: request._id, by: rejecter },
        });

        res.json({ success: true, request });
    } catch (err) {
        console.error('[rejectRequest]', err);
        res.status(500).json({ error: 'Failed to reject request' });
    }
};

// ── DELETE /api/v1/friend-requests/:id ───────────────────────────────────────
// Cancel a pending request you sent.
export const cancelRequest = async (req, res) => {
    try {
        const deleted = await FriendRequest.findOneAndDelete({
            _id:    req.params.id,
            from:   myId(req),
            status: 'pending',
        });
        if (!deleted) return res.status(404).json({ error: 'Request not found' });
        res.json({ success: true });
    } catch (err) {
        console.error('[cancelRequest]', err);
        res.status(500).json({ error: 'Failed to cancel request' });
    }
};
