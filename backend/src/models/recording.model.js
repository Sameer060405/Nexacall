import mongoose from 'mongoose';

const RecordingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  meetingCode: {
    type: String,
    default: '',
  },
  title: {
    type: String,
    default: 'Meeting recording',
  },
  filename: {
    type: String,
    required: true,
  },
  durationSeconds: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

const Recording = mongoose.model('Recording', RecordingSchema);
export default Recording;
