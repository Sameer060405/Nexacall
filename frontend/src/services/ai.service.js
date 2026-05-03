/**
 * AI Service — HTTP client for Smart Meeting Assistant backend endpoints
 *
 * All methods accept the running transcript (array of { speaker, text, timestamp })
 * and call the corresponding POST endpoint on the backend.
 */

import axios from 'axios';
import server from '../environment';

const BASE = `${server}/api/v1/ai`;

// Generate overall summary, key points, and decisions from the transcript
export const generateSummary = (transcript) =>
    axios.post(`${BASE}/summary`, { transcript }).then((r) => r.data);

// Extract action items with assignees + priority from the transcript
export const extractActionItems = (transcript) =>
    axios.post(`${BASE}/action-items`, { transcript }).then((r) => r.data);

// Ask an open-ended question answered using the transcript as context
export const askQuestion = (question, transcript) =>
    axios.post(`${BASE}/ask`, { question, transcript }).then((r) => r.data);
