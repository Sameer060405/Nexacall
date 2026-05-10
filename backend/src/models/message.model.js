import mongoose from 'mongoose';

// Stores individual direct messages between two NexaCall users.
// conversationId is a deterministic key: [userId1, userId2].sort().join('_')
// This avoids a separate Conversation collection and allows efficient queries.
const messageSchema = new mongoose.Schema({
    conversationId: { type: String, required: true },
    sender:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipient:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    body:           { type: String, required: true, trim: true, maxlength: 2000 },
    read:           { type: Boolean, default: false },
}, { timestamps: true });

// Primary access pattern: fetch all messages in a conversation sorted by time
messageSchema.index({ conversationId: 1, createdAt: 1 });

const Message = mongoose.model('Message', messageSchema);
export default Message;
