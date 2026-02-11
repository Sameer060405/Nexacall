import ScheduledMeeting from '../models/scheduledMeeting.model.js';
import User from '../models/user.model.js';
import mongoose from 'mongoose';

const sendError = (res, statusCode, message) => res.status(statusCode).json({ error: message });

export const createMeeting = async (req, res) => {
  try {
    console.log('createMeeting called');
    console.log('Request body:', req.body);
    console.log('Request user:', req.user);
    
    const { 
      title, 
      description, 
      startTime, 
      endTime, 
      participants, 
      location,
      meetingCode,
      password,
      hostVideo,
      participantVideo,
      audio,
      timeZone,
      recurring
    } = req.body;
    
    // Get hostId from JWT token - check both id and _id
    const hostId = req.user?.id || req.user?._id;
    
    console.log('Host ID:', hostId);
    
    if (!hostId) {
      console.error('No hostId found in request.user');
      return sendError(res, 401, 'User ID not found in token');
    }

    if (!title || !startTime || !endTime) {
      return sendError(res, 400, 'Title, start time, and end time are required');
    }

    // Ensure hostId is a valid ObjectId
    let hostObjectId;
    if (mongoose.Types.ObjectId.isValid(hostId)) {
      hostObjectId = new mongoose.Types.ObjectId(hostId);
    } else {
      return sendError(res, 400, 'Invalid user ID format');
    }

    const meeting = new ScheduledMeeting({
      title,
      description: description || '',
      hostId: hostObjectId,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      participants: participants || [],
      location: location || 'Online',
      meetingCode: meetingCode && meetingCode.trim() !== '' ? meetingCode.trim() : undefined, // Will be auto-generated if not provided
      password: password && password.trim() !== '' ? password.trim() : undefined,
      status: 'scheduled',
    });

    await meeting.save();
    await meeting.populate('hostId', 'username email');

    res.status(201).json({
      success: true,
      meeting,
    });
  } catch (error) {
    console.error('Create meeting error:', error);
    if (error.code === 11000) {
      // Duplicate meeting code
      return sendError(res, 400, 'Meeting code already exists. Please try again.');
    }
    if (error.message) {
      return sendError(res, 500, error.message);
    }
    sendError(res, 500, 'Internal server error');
  }
};

export const getMeetings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    let query = {
      $or: [
        { hostId: userId },
        { 'participants.userId': userId },
      ],
    };

    if (startDate && endDate) {
      query.startTime = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const meetings = await ScheduledMeeting.find(query)
      .populate('hostId', 'username email')
      .populate('participants.userId', 'username email')
      .sort({ startTime: 1 });

    res.json({
      success: true,
      meetings,
    });
  } catch (error) {
    console.error('Get meetings error:', error);
    sendError(res, 500, 'Internal server error');
  }
};

export const getTodaysMeetings = async (req, res) => {
  try {
    const userId = req.user.id;
    const hostIdQuery = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    let todayStart;
    let todayEnd;
    const startParam = req.query.start;
    const endParam = req.query.end;
    if (startParam && endParam) {
      todayStart = new Date(startParam);
      todayEnd = new Date(endParam);
      if (isNaN(todayStart.getTime()) || isNaN(todayEnd.getTime()) || todayEnd <= todayStart) {
        todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        todayEnd = new Date(todayStart);
        todayEnd.setDate(todayEnd.getDate() + 1);
      }
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      todayStart = today;
      todayEnd = new Date(today);
      todayEnd.setDate(todayEnd.getDate() + 1);
    }

    // Widen window by 24h each side so timezone differences never exclude "today" meetings
    const windowStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const windowEnd = new Date(todayEnd.getTime() + 24 * 60 * 60 * 1000);

    const meetings = await ScheduledMeeting.find({
      $or: [
        { hostId: hostIdQuery },
        { 'participants.userId': hostIdQuery },
      ],
      startTime: {
        $gte: windowStart,
        $lt: windowEnd,
      },
      status: { $ne: 'cancelled' },
    })
      .populate('hostId', 'username email')
      .populate('participants.userId', 'username email')
      .sort({ startTime: 1 });

    res.json({
      success: true,
      meetings,
    });
  } catch (error) {
    console.error('Get today\'s meetings error:', error);
    sendError(res, 500, 'Internal server error');
  }
};

export const updateMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    const meeting = await ScheduledMeeting.findById(id);
    if (!meeting) {
      return sendError(res, 404, 'Meeting not found');
    }

    if (meeting.hostId.toString() !== userId) {
      return sendError(res, 403, 'Only the host can update this meeting');
    }

    Object.assign(meeting, updates);
    await meeting.save();
    await meeting.populate('hostId', 'username email');
    await meeting.populate('participants.userId', 'username email');

    res.json({
      success: true,
      meeting,
    });
  } catch (error) {
    console.error('Update meeting error:', error);
    sendError(res, 500, 'Internal server error');
  }
};

export const deleteMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const meeting = await ScheduledMeeting.findById(id);
    if (!meeting) {
      return sendError(res, 404, 'Meeting not found');
    }

    if (meeting.hostId.toString() !== userId) {
      return sendError(res, 403, 'Only the host can delete this meeting');
    }

    meeting.status = 'cancelled';
    await meeting.save();

    res.json({
      success: true,
      message: 'Meeting cancelled successfully',
    });
  } catch (error) {
    console.error('Delete meeting error:', error);
    sendError(res, 500, 'Internal server error');
  }
};

/** Public: get meeting info by code (no auth). Used to check if meeting exists and if it requires a password. */
export const getMeetingByCode = async (req, res) => {
  try {
    const { code } = req.params;
    if (!code || !code.trim()) {
      return sendError(res, 400, 'Meeting code is required');
    }
    const meeting = await ScheduledMeeting.findOne({
      meetingCode: code.trim(),
      status: { $ne: 'cancelled' },
    }).select('meetingCode title password').lean();

    if (!meeting) {
      return res.status(404).json({ exists: false });
    }

    res.json({
      exists: true,
      meetingCode: meeting.meetingCode,
      title: meeting.title,
      requiresPassword: !!(meeting.password && meeting.password.length > 0),
    });
  } catch (error) {
    console.error('Get meeting by code error:', error);
    sendError(res, 500, 'Internal server error');
  }
};

/** Public: verify meeting code + password (no auth). */
export const verifyMeetingJoin = async (req, res) => {
  try {
    const { meetingCode, password } = req.body;
    if (!meetingCode || !meetingCode.trim()) {
      return sendError(res, 400, 'Meeting code is required');
    }

    const meeting = await ScheduledMeeting.findOne({
      meetingCode: meetingCode.trim(),
      status: { $ne: 'cancelled' },
    }).select('password');

    if (!meeting) {
      return res.status(404).json({ success: false, error: 'Meeting not found' });
    }

    if (!meeting.password || meeting.password.length === 0) {
      return res.json({ success: true });
    }

    if (!password || typeof password !== 'string') {
      return res.status(401).json({ success: false, error: 'Password is required' });
    }

    if (meeting.password.trim() !== password.trim()) {
      return res.status(401).json({ success: false, error: 'Incorrect password' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Verify meeting join error:', error);
    sendError(res, 500, 'Internal server error');
  }
};

export const getMeetingMetrics = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const meetingsHosted = await ScheduledMeeting.countDocuments({
      hostId: userId,
      startTime: { $gte: startOfWeek },
      status: { $ne: 'cancelled' },
    });

    const totalMeetings = await ScheduledMeeting.countDocuments({
      $or: [
        { hostId: userId },
        { 'participants.userId': userId },
      ],
      startTime: { $gte: startOfWeek },
      status: { $ne: 'cancelled' },
    });

    res.json({
      success: true,
      metrics: {
        meetingsHostedThisWeek: meetingsHosted,
        totalMeetingsThisWeek: totalMeetings,
      },
    });
  } catch (error) {
    console.error('Get meeting metrics error:', error);
    sendError(res, 500, 'Internal server error');
  }
};

