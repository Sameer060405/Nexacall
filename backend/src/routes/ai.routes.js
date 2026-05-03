/**
 * AI Routes — Smart Meeting Assistant
 *
 * All routes require a valid request body with a `transcript` array.
 * Authentication is intentionally omitted so guests can use AI features
 * during the meeting (same pattern as the existing public meeting routes).
 */

import express from 'express';
import { generateSummary, extractActionItems, askQuestion } from '../controllers/ai.controller.js';

const router = express.Router();

// Generate overall summary, key points, and decisions
router.post('/summary', generateSummary);

// Extract action items with assignees and priority
router.post('/action-items', extractActionItems);

// Answer a question using the transcript as context
router.post('/ask', askQuestion);

export default router;
