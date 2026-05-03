import Contact from '../models/contact.model.js';

export const getContacts = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        const contacts = await Contact.find({ owner: userId }).sort({ name: 1 });
        res.json({ success: true, contacts });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const addContact = async (req, res) => {
    try {
        const { name, phone } = req.body;
        if (!name?.trim()) return res.status(400).json({ error: 'name is required.' });
        if (!phone?.trim()) return res.status(400).json({ error: 'phone is required.' });

        const userId = req.user?._id || req.user?.id;
        const contact = await Contact.create({
            name: name.trim(),
            phone: phone.trim(),
            owner: userId,
        });
        res.status(201).json({ success: true, contact });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

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
