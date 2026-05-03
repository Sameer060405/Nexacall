/**
 * AI Controller — Smart Meeting Assistant
 *
 * Handles three endpoints:
 *   POST /api/v1/ai/summary       → generate meeting summary + key points + decisions
 *   POST /api/v1/ai/action-items  → extract action items from transcript
 *   POST /api/v1/ai/ask           → answer a question using transcript as context
 *
 * Uses the Google Gemini API (gemini-1.5-flash — free tier).
 * Set GEMINI_API_KEY in backend/.env to activate.
 * Get a free key at: https://aistudio.google.com/app/apikey
 */

// gemini-2.0-flash — current stable model, replaces the deprecated gemini-1.5-flash
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// ---------------------------------------------------------------------------
// Internal helper: call Gemini generateContent
// ---------------------------------------------------------------------------
async function callGemini(systemPrompt, userContent, maxTokens = 1000) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error(
            'GEMINI_API_KEY is not set. Add it to backend/.env and restart the server. ' +
            'Get a free key at https://aistudio.google.com/app/apikey'
        );
    }

    const url = `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    const body = {
        // System instruction tells Gemini its role
        system_instruction: {
            parts: [{ text: systemPrompt }],
        },
        contents: [
            {
                role: 'user',
                parts: [{ text: userContent }],
            },
        ],
        generationConfig: {
            temperature: 0.3,        // Lower = more deterministic / professional
            maxOutputTokens: maxTokens,
        },
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    const candidate = data?.candidates?.[0];
    if (!candidate) {
        throw new Error('Gemini returned no candidates. Check your API key and quota.');
    }
    if (candidate.finishReason === 'SAFETY') {
        throw new Error('Gemini blocked the response due to safety filters.');
    }
    const text = candidate?.content?.parts?.[0]?.text;
    if (!text) {
        throw new Error('Gemini returned an empty response. The model may be overloaded — try again.');
    }
    return text.trim();
}

// ---------------------------------------------------------------------------
// Helper: convert transcript array → readable string for LLM context
// ---------------------------------------------------------------------------
function formatTranscript(transcript) {
    if (!Array.isArray(transcript) || transcript.length === 0) {
        return 'No transcript available.';
    }
    return transcript.map((entry) => `[${entry.speaker}]: ${entry.text}`).join('\n');
}

// ---------------------------------------------------------------------------
// Helper: safely parse JSON from LLM response (handles ```json … ``` wrappers)
// ---------------------------------------------------------------------------
function safeParseJSON(text, fallback) {
    try {
        // Strip markdown code fences if present
        const jsonMatch =
            text.match(/```json\s*([\s\S]*?)\s*```/) ||
            text.match(/```\s*([\s\S]*?)\s*```/) ||
            text.match(/(\{[\s\S]*\})/);
        const raw = jsonMatch ? jsonMatch[1] : text;
        return JSON.parse(raw);
    } catch {
        return fallback;
    }
}

// ---------------------------------------------------------------------------
// POST /api/v1/ai/summary
// Body: { transcript: [{ speaker, text, timestamp }] }
// ---------------------------------------------------------------------------
export const generateSummary = async (req, res) => {
    try {
        const { transcript } = req.body;

        if (!Array.isArray(transcript) || transcript.length === 0) {
            return res.status(400).json({ error: 'Transcript array is empty or missing.' });
        }

        const formatted = formatTranscript(transcript);

        const systemPrompt =
            'You are an expert meeting assistant. Provide structured, concise, professional meeting summaries.';

        const userContent = `Analyze the following meeting transcript and respond ONLY with valid JSON (no markdown, no extra text) in this exact shape:
{
  "summary": "<2-3 sentence overview of the entire meeting>",
  "keyPoints": ["<point 1>", "<point 2>"],
  "decisions": ["<decision 1>", "<decision 2>"]
}

Transcript:
${formatted}`;

        const raw = await callGemini(systemPrompt, userContent, 900);
        const parsed = safeParseJSON(raw, {
            summary: raw,
            keyPoints: [],
            decisions: [],
        });

        res.json({ success: true, data: parsed });
    } catch (error) {
        console.error('[AI] Summary error:', error.message);
        res.status(500).json({ error: error.message });
    }
};

// ---------------------------------------------------------------------------
// POST /api/v1/ai/action-items
// Body: { transcript: [{ speaker, text, timestamp }] }
// ---------------------------------------------------------------------------
export const extractActionItems = async (req, res) => {
    try {
        const { transcript } = req.body;

        if (!Array.isArray(transcript) || transcript.length === 0) {
            return res.status(400).json({ error: 'Transcript array is empty or missing.' });
        }

        const formatted = formatTranscript(transcript);

        const systemPrompt =
            'You are an expert meeting assistant that identifies actionable tasks from meeting conversations.';

        const userContent = `From the following meeting transcript, extract every action item. Respond ONLY with valid JSON in this exact shape:
{
  "actionItems": [
    { "task": "<description>", "assignedTo": "<name or Unassigned>", "priority": "high|medium|low" }
  ]
}

If no action items are found, return { "actionItems": [] }.

Transcript:
${formatted}`;

        const raw = await callGemini(systemPrompt, userContent, 700);
        const parsed = safeParseJSON(raw, { actionItems: [] });

        res.json({ success: true, data: parsed });
    } catch (error) {
        console.error('[AI] Action items error:', error.message);
        res.status(500).json({ error: error.message });
    }
};

// ---------------------------------------------------------------------------
// POST /api/v1/ai/ask
// Body: { question: string, transcript: [{ speaker, text, timestamp }] }
// ---------------------------------------------------------------------------
export const askQuestion = async (req, res) => {
    try {
        const { question, transcript } = req.body;

        if (!question || typeof question !== 'string' || question.trim() === '') {
            return res.status(400).json({ error: 'question is required.' });
        }

        const formatted = formatTranscript(transcript);

        const systemPrompt =
            'You are a helpful meeting assistant. Answer user questions based solely on the provided meeting transcript. If the answer is not present, say so clearly and briefly.';

        const userContent = `Meeting Transcript:
${formatted}

User Question: ${question.trim()}

Provide a concise, direct answer (2-5 sentences max).`;

        const answer = await callGemini(systemPrompt, userContent, 400);

        res.json({ success: true, answer });
    } catch (error) {
        console.error('[AI] Q&A error:', error.message);
        res.status(500).json({ error: error.message });
    }
};
