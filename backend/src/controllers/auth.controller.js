import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import {Meeting} from '../models/meeting.model.js';
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

const sendError = (res, statusCode, message) => res.status(statusCode).json({ error: message });

export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return sendError(res, 400, 'Missing required fields');
    }

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return sendError(res, 400, 'Username or email already exists');
    }

    const user = new User({ username, email, password });
    await user.save();
    
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { username: user.username, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('Registration error:', err);
    sendError(res, 500, 'Internal server error');
  }
};



export const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return sendError(res, 400, 'Username and password are required');
    }

    const user = await User.findOne({ username });
    if (!user) {
      return sendError(res, 401, 'Invalid credentials');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return sendError(res, 401, 'Invalid credentials');
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: { username: user.username, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('Login error:', err);
    sendError(res, 500, 'Internal server error');
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' }); // <-- add this
    res.json({ user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};


export const addToHistory = async (req, res) => {
  try {
    const { meetingCode } = req.body;
    if (!meetingCode) return res.status(400).json({ error: "Meeting code is required" });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const exists = user.history.some(h => h.meetingCode === meetingCode);
    if (!exists) {
      user.history.push({ meetingCode });
      await user.save();
    }

    res.json({ success: true, message: "Added to history successfully" });
  } catch (err) {
    console.error("Add to history error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getHistory = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("history");
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user.history);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

