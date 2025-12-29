import mongoose from 'mongoose';

const ScheduledMeetingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'tentative'],
      default: 'pending',
    },
  }],
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
    required: true,
  },
  meetingCode: {
    type: String,
    unique: true,
    sparse: true,
  },
  password: {
    type: String,
    default: null,
  },
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
    default: 'scheduled',
  },
  location: {
    type: String,
    default: 'Online',
  },
}, {
  timestamps: true,
});

// Generate meeting code before saving
ScheduledMeetingSchema.pre('save', async function(next) {
  // Only generate if meetingCode is not provided or is empty
  if (!this.meetingCode || this.meetingCode.trim() === '') {
    // Generate unique meeting code
    let code;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!isUnique && attempts < maxAttempts) {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const existing = await this.constructor.findOne({ meetingCode: code });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }
    
    if (!isUnique) {
      return next(new Error('Failed to generate unique meeting code'));
    }
    
    this.meetingCode = code;
  }
  next();
});

const ScheduledMeeting = mongoose.model('ScheduledMeeting', ScheduledMeetingSchema);

export default ScheduledMeeting;

