import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema({
    name:  { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, trim: true, maxlength: 25 },
    email: { type: String, trim: true, maxlength: 200, default: '' },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
}, { timestamps: true });

// One phone number per user — prevents duplicates at the DB level
contactSchema.index({ phone: 1, owner: 1 }, { unique: true });

const Contact = mongoose.model('Contact', contactSchema);
export default Contact;
