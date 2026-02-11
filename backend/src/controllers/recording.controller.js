import Recording from '../models/recording.model.js';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { UPLOAD_DIR } from '../config/uploadPath.js';

export const uploadRecording = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No recording file provided' });
    }
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ error: 'User not found' });
    }
    const meetingCode = req.body.meetingCode || '';
    const title = req.body.title || 'Meeting recording';
    const durationSeconds = parseInt(req.body.durationSeconds, 10) || 0;

    const recording = new Recording({
      userId: new mongoose.Types.ObjectId(userId),
      meetingCode,
      title,
      filename: req.file.filename,
      durationSeconds,
    });
    await recording.save();

    res.status(201).json({
      success: true,
      recording: {
        _id: recording._id,
        meetingCode: recording.meetingCode,
        title: recording.title,
        filename: recording.filename,
        durationSeconds: recording.durationSeconds,
        createdAt: recording.createdAt,
      },
    });
  } catch (error) {
    console.error('Upload recording error:', error);
    res.status(500).json({ error: 'Failed to save recording' });
  }
};

export const listRecordings = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ error: 'User not found' });
    }
    const recordings = await Recording.find({ userId: new mongoose.Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, recordings });
  } catch (error) {
    console.error('List recordings error:', error);
    res.status(500).json({ error: 'Failed to list recordings' });
  }
};

export const streamRecording = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ error: 'User not found' });
    }
    const id = req.params.id?.trim();
    if (!id) return res.status(400).json({ error: 'Recording ID required' });
    const recording = await Recording.findOne({
      _id: id,
      userId: new mongoose.Types.ObjectId(userId),
    });
    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }
    const filePath = path.join(UPLOAD_DIR, recording.filename);
    if (!fs.existsSync(filePath)) {
      console.error('Recording file missing at:', filePath, 'UPLOAD_DIR:', UPLOAD_DIR);
      return res.status(404).json({ error: 'Recording file not found' });
    }
    res.setHeader('Content-Type', 'video/webm');
    res.setHeader('Content-Disposition', `inline; filename="${recording.title.replace(/"/g, '')}.webm"`);
    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => {
      console.error('Stream read error:', err);
      if (!res.headersSent) res.status(500).json({ error: 'Failed to stream recording' });
    });
    stream.pipe(res);
  } catch (error) {
    console.error('Stream recording error:', error);
    res.status(500).json({ error: 'Failed to stream recording' });
  }
};
