// message.controller.js
// Handles direct messaging between NexaCall users.
// UPDATED: Integrates ConversationStatus for the message-request flow —
// when a non-friend sends a first message the recipient sees a request banner
// instead of a regular chat. Also includes accept/reject endpoints for that flow.
import Message from '../models/message.model.js';
import ConversationStatus from '../models/conversationStatus.model.js';
import User from '../models/user.model.js';
import { emitToUser } from './socketManager.js';

// Build a stable conversation key so both users query the same document set.
const makeConvId = (a, b) => [String(a), String(b)].sort().join('_');

// ── GET /api/v1/messages/:recipientId ────────────────────────────────────────
// Returns all messages + the conversation status (null if friends / no requests).
export const getMessages = async (req, res) => {
    try {
        const myId = String(req.user?.id || req.user?._id);
        const { recipientId } = req.params;

        const convId = makeConvId(myId, recipientId);

        const [msgs, convStatus] = await Promise.all([
            Message.find({ conversationId: convId }).sort({ createdAt: 1 }).lean(),
            ConversationStatus.findOne({ conversationId: convId }).lean(),
        ]);

        // Mark incoming messages as read now that the user is viewing them
        await Message.updateMany(
            { conversationId: convId, recipient: myId, read: false },
            { $set: { read: true } }
        );

        res.json({ success: true, messages: msgs, conversationStatus: convStatus });
    } catch (err) {
        console.error('[getMessages]', err);
        res.status(500).json({ error: 'Failed to load messages' });
    }
};

// ── POST /api/v1/messages ─────────────────────────────────────────────────────
// Send a message. If sender and recipient are not contacts:
//   - Creates a ConversationStatus(status:'requested') on the FIRST message
//   - Blocks further messages if status is 'rejected'
//   - Allows messages once status is 'accepted'
export const sendMessage = async (req, res) => {
    try {
        const myId = String(req.user?.id || req.user?._id);
        const { recipientId, body } = req.body;

        if (!recipientId)
            return res.status(400).json({ error: 'recipientId is required' });
        if (!body || !body.trim())
            return res.status(400).json({ error: 'Message body cannot be empty' });
        if (body.trim().length > 2000)
            return res.status(400).json({ error: 'Message too long (max 2000 characters)' });
        if (myId === String(recipientId))
            return res.status(400).json({ error: 'Cannot send a message to yourself' });

        const recipientExists = await User.exists({ _id: recipientId });
        if (!recipientExists)
            return res.status(404).json({ error: 'Recipient not found' });

        const convId = makeConvId(myId, recipientId);

        // Check if they are already contacts (contacts array is bidirectional after friend request)
        const areFriends = await User.exists({ _id: myId, contacts: recipientId });

        if (!areFriends) {
            // Look up or create conversation status
            let convStatus = await ConversationStatus.findOne({ conversationId: convId });

            if (!convStatus) {
                // First message from non-friend — create a message request
                convStatus = await ConversationStatus.create({
                    conversationId: convId,
                    initiator:      myId,
                    recipient:      recipientId,
                    status:         'requested',
                });
                // Notify recipient of the incoming message request
                emitToUser(recipientId, 'message-request-received', {
                    conversationId: convId,
                    from: { _id: myId },
                });
            } else if (convStatus.status === 'rejected') {
                return res.status(403).json({ error: 'This user has declined messages from you' });
            }
            // status === 'requested' || 'accepted' → let the message through
        }

        const message = await Message.create({
            conversationId: convId,
            sender:         myId,
            recipient:      recipientId,
            body:           body.trim(),
        });

        // Push the message instantly if the recipient has an active socket
        emitToUser(String(recipientId), 'dm-receive', { message });

        res.status(201).json({ success: true, message });
    } catch (err) {
        console.error('[sendMessage]', err);
        res.status(500).json({ error: 'Failed to send message' });
    }
};

// ── GET /api/v1/messages ─────────────────────────────────────────────────────
// All conversations for the current user, newest-first.
// Includes conversation status so the UI can show "Message Request" badges.
export const getConversations = async (req, res) => {
    try {
        const myId = String(req.user?.id || req.user?._id);

        const allMessages = await Message.find({
            $or: [{ sender: myId }, { recipient: myId }],
        }).sort({ createdAt: -1 }).lean();

        // Group by conversationId: keep the latest message + tally unread
        const convMap = new Map();
        for (const msg of allMessages) {
            if (!convMap.has(msg.conversationId)) {
                convMap.set(msg.conversationId, { lastMessage: msg, unread: 0 });
            }
            if (!msg.read && String(msg.recipient) === myId) {
                convMap.get(msg.conversationId).unread++;
            }
        }

        // Resolve the other participant's profile + conversation status for each conversation
        const conversations = await Promise.all(
            Array.from(convMap.entries()).map(async ([convId, data]) => {
                const [id1, id2] = convId.split('_');
                const otherId = id1 === myId ? id2 : id1;
                const [otherUser, convStatus] = await Promise.all([
                    User.findById(otherId).select('_id username email').lean(),
                    ConversationStatus.findOne({ conversationId: convId }).lean(),
                ]);
                return { conversationId: convId, ...data, otherUser, conversationStatus: convStatus };
            })
        );

        conversations.sort(
            (a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt)
        );

        res.json({ success: true, conversations });
    } catch (err) {
        console.error('[getConversations]', err);
        res.status(500).json({ error: 'Failed to load conversations' });
    }
};

// ── PUT /api/v1/messages/conversation/:convId/accept ─────────────────────────
// Recipient accepts a message request — moves status to 'accepted'.
export const acceptMessageRequest = async (req, res) => {
    try {
        const myId = String(req.user?.id || req.user?._id);
        const { convId } = req.params;

        const status = await ConversationStatus.findOne({ conversationId: convId, recipient: myId });
        if (!status) return res.status(404).json({ error: 'Conversation request not found' });

        status.status = 'accepted';
        await status.save();

        // Notify the initiator their message request was accepted
        emitToUser(String(status.initiator), 'message-request-accepted', { conversationId: convId });

        res.json({ success: true, conversationStatus: status });
    } catch (err) {
        console.error('[acceptMessageRequest]', err);
        res.status(500).json({ error: 'Failed to accept request' });
    }
};

// ── PUT /api/v1/messages/conversation/:convId/reject ─────────────────────────
// Recipient rejects a message request — future messages from initiator are blocked.
export const rejectMessageRequest = async (req, res) => {
    try {
        const myId = String(req.user?.id || req.user?._id);
        const { convId } = req.params;

        const status = await ConversationStatus.findOne({ conversationId: convId, recipient: myId });
        if (!status) return res.status(404).json({ error: 'Conversation request not found' });

        status.status = 'rejected';
        await status.save();

        emitToUser(String(status.initiator), 'message-request-rejected', { conversationId: convId });

        res.json({ success: true, conversationStatus: status });
    } catch (err) {
        console.error('[rejectMessageRequest]', err);
        res.status(500).json({ error: 'Failed to reject request' });
    }
};
