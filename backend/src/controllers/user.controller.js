import User from '../models/user.model.js';

const sendError = (res, statusCode, message) => res.status(statusCode).json({ error: message });

export const searchUsers = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q || q.length < 2) {
      return res.json({ users: [] });
    }

    const regex = new RegExp(q, 'i');
    const users = await User.find({
      _id: { $ne: req.user.id },
      $or: [{ username: regex }, { email: regex }],
    })
      .select('_id username email')
      .limit(20)
      .lean();

    res.json({ users });
  } catch (err) {
    console.error('Search users error:', err);
    sendError(res, 500, 'Internal server error');
  }
};

export const getContacts = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('contacts', '_id username email')
      .lean();

    if (!user) return sendError(res, 404, 'User not found');
    res.json({ contacts: user.contacts || [] });
  } catch (err) {
    console.error('Get contacts error:', err);
    sendError(res, 500, 'Internal server error');
  }
};

export const addContact = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return sendError(res, 400, 'userId is required');
    if (userId === req.user.id) return sendError(res, 400, 'Cannot add yourself');

    const target = await User.findById(userId).select('_id');
    if (!target) return sendError(res, 404, 'User not found');

    const user = await User.findById(req.user.id);
    if (user.contacts.some((c) => c.toString() === userId)) {
      return sendError(res, 400, 'Already in contacts');
    }

    user.contacts.push(userId);
    await user.save();

    const populated = await User.findById(req.user.id)
      .populate('contacts', '_id username email')
      .lean();

    res.json({ contacts: populated.contacts });
  } catch (err) {
    console.error('Add contact error:', err);
    sendError(res, 500, 'Internal server error');
  }
};

export const removeContact = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(req.user.id);
    if (!user) return sendError(res, 404, 'User not found');

    user.contacts = user.contacts.filter((c) => c.toString() !== userId);
    user.speedDial = user.speedDial.filter((c) => c.toString() !== userId);
    await user.save();

    const populated = await User.findById(req.user.id)
      .populate('contacts', '_id username email')
      .lean();

    res.json({ contacts: populated.contacts });
  } catch (err) {
    console.error('Remove contact error:', err);
    sendError(res, 500, 'Internal server error');
  }
};

export const getSpeedDial = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('speedDial', '_id username email')
      .lean();

    if (!user) return sendError(res, 404, 'User not found');
    res.json({ speedDial: user.speedDial || [] });
  } catch (err) {
    console.error('Get speed dial error:', err);
    sendError(res, 500, 'Internal server error');
  }
};

export const addSpeedDial = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return sendError(res, 400, 'userId is required');

    const user = await User.findById(req.user.id);
    if (!user) return sendError(res, 404, 'User not found');

    if (!user.contacts.some((c) => c.toString() === userId)) {
      return sendError(res, 400, 'User must be in your contacts first');
    }

    if (user.speedDial.some((c) => c.toString() === userId)) {
      return sendError(res, 400, 'Already in speed dial');
    }

    user.speedDial.push(userId);
    await user.save();

    const populated = await User.findById(req.user.id)
      .populate('speedDial', '_id username email')
      .lean();

    res.json({ speedDial: populated.speedDial });
  } catch (err) {
    console.error('Add speed dial error:', err);
    sendError(res, 500, 'Internal server error');
  }
};

export const removeSpeedDial = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(req.user.id);
    if (!user) return sendError(res, 404, 'User not found');

    user.speedDial = user.speedDial.filter((c) => c.toString() !== userId);
    await user.save();

    const populated = await User.findById(req.user.id)
      .populate('speedDial', '_id username email')
      .lean();

    res.json({ speedDial: populated.speedDial });
  } catch (err) {
    console.error('Remove speed dial error:', err);
    sendError(res, 500, 'Internal server error');
  }
};
