// friendRequest.model.js
// NEW: Tracks friend/connection requests between NexaCall users.
// When a user wants to add another NexaCall user, a request is created here
// rather than immediately pushing to User.contacts — the other party must accept.
import mongoose from 'mongoose';

const friendRequestSchema = new mongoose.Schema({
    from: {
        type: mongoose.Schema.Types.ObjectId,
        ref:  'User',
        required: true,
    },
    to: {
        type: mongoose.Schema.Types.ObjectId,
        ref:  'User',
        required: true,
    },
    status: {
        type:    String,
        enum:    ['pending', 'accepted', 'rejected'],
        default: 'pending',
    },
}, { timestamps: true });

// Prevent duplicate requests: one user can only have one request TO another user at a time
friendRequestSchema.index({ from: 1, to: 1 }, { unique: true });

const FriendRequest = mongoose.model('FriendRequest', friendRequestSchema);
export default FriendRequest;
