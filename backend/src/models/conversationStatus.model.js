// conversationStatus.model.js
// NEW: Tracks the acceptance status of a direct-message conversation.
// When a non-friend (someone not in your contacts) sends you a first message,
// this record is created with status 'requested'. The recipient sees a
// "Message Request" banner and can accept or reject.
//
// Conversation ID is the same deterministic key used by message.model.js:
//   [userId1, userId2].sort().join('_')
import mongoose from 'mongoose';

const conversationStatusSchema = new mongoose.Schema({
    conversationId: { type: String, required: true, unique: true },
    initiator:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipient:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
        type:    String,
        enum:    ['requested', 'accepted', 'rejected'],
        default: 'requested',
    },
}, { timestamps: true });

const ConversationStatus = mongoose.model('ConversationStatus', conversationStatusSchema);
export default ConversationStatus;
