import express from 'express';
import multer from 'multer';
import path from 'path';
import authMiddleware from '../middleware/auth.middleware.js';
import { UPLOAD_DIR } from '../config/uploadPath.js';
import {
  uploadRecording,
  listRecordings,
  streamRecording,
} from '../controllers/recording.controller.js';

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    cb(null, `${unique}.webm`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
});

const router = express.Router();

router.post('/', authMiddleware, upload.single('file'), uploadRecording);
router.get('/', authMiddleware, listRecordings);
router.get('/:id/file', authMiddleware, streamRecording);

export default router;
