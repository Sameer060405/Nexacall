import Contact from '../models/contact.model.js';
import User from '../models/user.model.js';
import crypto from 'crypto';
import { sendSMSInvite } from '../services/sms.service.js';

// Accepts: +12125551234, +44 7700 900000, 0712345678, (800) 555-1234, etc.
// Strips formatting chars, then validates length + leading digit.
const normalisePhone = (raw) => {
    const stripped = raw.replace(/[\s\-().]/g, '');
    // Must be 7-15 digits with optional leading +
    if (/^\+?[1-9]\d{6,14}$/.test(stripped)) return stripped;
    return null;
};

// ── GET /api/v1/contacts?q=<optional search> ─────────────────────────────────
export const getContacts = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        const { q } = req.query;

        const filter = { owner: userId };
        if (q && q.trim().length > 0) {
            const regex = new RegExp(q.trim(), 'i');
            filter.$or = [{ name: regex }, { phone: regex }, { email: regex }];
        }

        const contacts = await Contact.find(filter).sort({ name: 1 });
        res.json({ success: true, contacts });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── POST /api/v1/contacts ─────────────────────────────────────────────────────
export const addContact = async (req, res) => {
    try {
        const { name, phone, email } = req.body;

        if (!name?.trim())  return res.status(400).json({ error: 'Name is required.' });
        if (!phone?.trim()) return res.status(400).json({ error: 'Phone number is required.' });

        const cleanedPhone = normalisePhone(phone.trim());
        if (!cleanedPhone) {
            return res.status(400).json({
                error: 'Invalid phone number. Use international format, e.g. +12125551234.',
            });
        }

        const userId = req.user?._id || req.user?.id;

        // Application-level duplicate check for a friendlier error message
        const existing = await Contact.findOne({ phone: cleanedPhone, owner: userId });
        if (existing) {
            return res.status(409).json({
                error: `A contact with this number already exists: "${existing.name}".`,
            });
        }

        const contact = await Contact.create({
            name:  name.trim(),
            phone: cleanedPhone,
            email: email?.trim() || '',
            owner: userId,
        });

        res.status(201).json({ success: true, contact });
    } catch (err) {
        // Catch MongoDB unique-index violation as fallback
        if (err.code === 11000) {
            return res.status(409).json({ error: 'This phone number is already in your contacts.' });
        }
        res.status(500).json({ error: err.message });
    }
};

// ── PUT /api/v1/contacts/:id ──────────────────────────────────────────────────
export const updateContact = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        const { name, phone, email } = req.body;

        const update = {};

        if (name !== undefined) {
            if (!name.trim()) return res.status(400).json({ error: 'Name cannot be empty.' });
            update.name = name.trim();
        }

        if (phone !== undefined) {
            if (!phone.trim()) return res.status(400).json({ error: 'Phone cannot be empty.' });
            const cleanedPhone = normalisePhone(phone.trim());
            if (!cleanedPhone) {
                return res.status(400).json({ error: 'Invalid phone number format.' });
            }
            // Check if the new number is already used by a different contact of this user
            const conflict = await Contact.findOne({
                phone: cleanedPhone,
                owner: userId,
                _id: { $ne: req.params.id },
            });
            if (conflict) {
                return res.status(409).json({
                    error: `Phone number already used by "${conflict.name}".`,
                });
            }
            update.phone = cleanedPhone;
        }

        if (email !== undefined) update.email = email.trim();

        if (Object.keys(update).length === 0) {
            return res.status(400).json({ error: 'No fields provided to update.' });
        }

        const contact = await Contact.findOneAndUpdate(
            { _id: req.params.id, owner: userId },
            update,
            { new: true, runValidators: true }
        );

        if (!contact) return res.status(404).json({ error: 'Contact not found.' });
        res.json({ success: true, contact });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ error: 'This phone number is already in your contacts.' });
        }
        res.status(500).json({ error: err.message });
    }
};

// ── DELETE /api/v1/contacts/:id ───────────────────────────────────────────────
export const deleteContact = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        const deleted = await Contact.findOneAndDelete({ _id: req.params.id, owner: userId });
        if (!deleted) return res.status(404).json({ error: 'Contact not found.' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── POST /api/v1/contacts/:id/invite ─────────────────────────────────────────
// Generates a one-time meeting code and sends an SMS invite via Twilio.
export const sendContactInvite = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;

        const contact = await Contact.findOne({ _id: req.params.id, owner: userId });
        if (!contact) return res.status(404).json({ error: 'Contact not found.' });

        // Look up the caller's display name
        const caller = await User.findById(userId).select('username').lean();
        const callerName = caller?.username || 'Someone';

        // Generate a 6-character alphanumeric meeting code
        const meetingCode = crypto.randomBytes(3).toString('hex').toUpperCase();
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const meetingLink = `${frontendUrl}/${meetingCode}`;

        const smsBody =
            `${callerName} invited you to a NexaCall meeting.\n` +
            `Join here: ${meetingLink}`;

        const smsResult = await sendSMSInvite(contact.phone, smsBody);

        if (!smsResult.success) {
            return res.status(502).json({
                error: smsResult.error || 'Failed to send SMS invitation.',
                // Include meetingLink so the caller can share it manually
                meetingCode,
                meetingLink,
            });
        }

        res.json({
            success: true,
            meetingCode,
            meetingLink,
            simulated: smsResult.simulated || false,
            message: `Invitation sent to ${contact.name} (${contact.phone})`,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
