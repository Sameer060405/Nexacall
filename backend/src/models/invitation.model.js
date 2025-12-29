import mongoose from 'mongoose';

const InvitationSchema = new mongoose.Schema({
  meetingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ScheduledMeeting',
    required: true,
  },
  inviterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  inviteeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'tentative'],
    default: 'pending',
  },
  message: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
});

// Index for efficient queries
InvitationSchema.index({ inviteeId: 1, status: 1 });
InvitationSchema.index({ meetingId: 1 });

const Invitation = mongoose.model('Invitation', InvitationSchema);

export default Invitation;

