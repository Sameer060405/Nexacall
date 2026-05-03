import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema({
    name:  { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true, index: true },
}, { timestamps: true });

const Contact = mongoose.model('Contact', contactSchema);
export default Contact;
