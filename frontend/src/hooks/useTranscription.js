/**
 * useTranscription — Web Speech API live transcription hook
 *
 * Captures the local user's microphone audio through the browser's built-in
 * speech recognition engine (no cost, no backend round-trip).
 */

import { useEffect, useRef, useState, useCallback } from 'react';

const isSupported = () =>
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

// Give up after this many rapid restarts in a row (session < 3 s each)
const MAX_RAPID_FAILURES = 5;

// ─── Caption / transcript text cleanup ──────────────────────────────────────
// Matches common spoken filler words so they can be stripped out.
const FILLER_RE = /\b(um+|uh+|er+|ah+|mhm+|hmm+|you know|i mean|basically|literally)\b\s*/gi;

function stripFillers(raw) {
    return raw.replace(FILLER_RE, ' ').replace(/\s+/g, ' ').trim();
}

// Applied to finalized transcript entries before storing / emitting:
// capitalises, removes fillers, ensures trailing punctuation.
function cleanFinalText(raw) {
    const t = stripFillers(raw);
    if (!t) return '';
    const cap = t.charAt(0).toUpperCase() + t.slice(1);
    return /[.!?]$/.test(cap) ? cap : `${cap}.`;
}

// Applied to interim (still-being-spoken) captions:
// same as above but NO trailing period since the sentence isn't finished.
function cleanInterimText(raw) {
    const t = stripFillers(raw);
    if (!t) return '';
    return t.charAt(0).toUpperCase() + t.slice(1);
}

export function useTranscription({ username, onTranscript, enabled = true }) {
    const [isListening, setIsListening] = useState(false);
    const [currentCaption, setCurrentCaption] = useState('');

    // Keep callbacks in refs so recognition handlers never close over stale values
    const onTranscriptRef = useRef(onTranscript);
    const usernameRef = useRef(username);
    useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);
    useEffect(() => { usernameRef.current = username; }, [username]);

    const recognitionRef   = useRef(null);   // the live SpeechRecognition instance
    const restartTimerRef  = useRef(null);   // pending setTimeout handle
    const shouldRunRef     = useRef(false);  // desired running state
    const sessionStartRef  = useRef(0);      // when current session began
    const rapidFailCountRef = useRef(0);     // consecutive short-lived sessions

    // ─── Stop cleanly ────────────────────────────────────────────────────────
    const stopRecognition = useCallback(() => {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (_) {}
            recognitionRef.current = null;
        }
        setIsListening(false);
        setCurrentCaption('');
    }, []);

    // ─── Start (or restart) ─────────────────────────────────────────────────
    const startRecognition = useCallback(() => {
        if (!isSupported()) return;
        if (!shouldRunRef.current) return;   // stopped while waiting in a timer
        if (recognitionRef.current) return;  // already running — strict single-instance guard

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            sessionStartRef.current = Date.now();
            rapidFailCountRef.current = 0; // successful start resets failure counter
            setIsListening(true);
        };

        recognition.onresult = (event) => {
            let interimText = '';
            let finalText = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const t = event.results[i][0].transcript;
                if (event.results[i].isFinal) finalText += t;
                else interimText += t;
            }

            // Interim: show cleaned text live but don't punctuate (sentence not done yet)
            setCurrentCaption(cleanInterimText(interimText));

            if (finalText.trim()) {
                setCurrentCaption('');
                onTranscriptRef.current?.({
                    speaker: usernameRef.current || 'You',
                    // Final: full cleanup — fillers stripped, capitalised, punctuated
                    text: cleanFinalText(finalText.trim()),
                    timestamp: Date.now(),
                });
            }
        };

        recognition.onend = () => {
            recognitionRef.current = null;
            setIsListening(false);
            setCurrentCaption('');

            if (!shouldRunRef.current) return; // intentional stop

            const sessionMs = Date.now() - sessionStartRef.current;

            if (sessionMs < 3000) {
                // Session died in under 3 s — count as a rapid failure
                rapidFailCountRef.current += 1;
            }

            if (rapidFailCountRef.current >= MAX_RAPID_FAILURES) {
                // Too many crashes in a row — speech recognition is unusable right now
                shouldRunRef.current = false;
                console.warn('[Transcription] Giving up after repeated rapid failures.');
                setIsListening(false);
                return;
            }

            // Back off proportionally to recent failures; healthy sessions get 1 s delay
            const delay = sessionMs < 3000
                ? Math.min(2000 * rapidFailCountRef.current, 15000)
                : 1000;

            restartTimerRef.current = setTimeout(startRecognition, delay);
        };

        recognition.onerror = (event) => {
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                // Permanent failure — user denied mic
                shouldRunRef.current = false;
                setIsListening(false);
                console.warn('[Transcription] Mic permission denied.');
            } else if (event.error === 'aborted') {
                // Intentional stop — onend handles restart
            } else if (event.error === 'network') {
                // Speech service unreachable — long back-off, then re-enable
                shouldRunRef.current = false;
                restartTimerRef.current = setTimeout(() => {
                    if (!enabledRef.current) return;
                    shouldRunRef.current = true;
                    startRecognition();
                }, 5000);
            } else if (event.error === 'audio-capture') {
                // Mic locked (AudioContext conflict) — onend will back off via rapidFailCount
                rapidFailCountRef.current += 1;
            }
            // 'no-speech': normal silence — onend handles restart
        };

        recognitionRef.current = recognition;
        try {
            recognition.start();
        } catch (e) {
            console.warn('[Transcription] start() threw:', e);
            recognitionRef.current = null;
            rapidFailCountRef.current += 1;
            if (shouldRunRef.current && rapidFailCountRef.current < MAX_RAPID_FAILURES) {
                restartTimerRef.current = setTimeout(startRecognition, 2000);
            }
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Keep a ref to enabled so the network-error handler can check it
    const enabledRef = useRef(enabled);
    useEffect(() => { enabledRef.current = enabled; }, [enabled]);

    // ─── Enable / disable ────────────────────────────────────────────────────
    useEffect(() => {
        if (!isSupported()) return;

        if (enabled) {
            rapidFailCountRef.current = 0;
            shouldRunRef.current = true;
            startRecognition();
        } else {
            shouldRunRef.current = false;
            stopRecognition();
        }

        return () => {
            shouldRunRef.current = false;
            stopRecognition();
        };
    }, [enabled, startRecognition, stopRecognition]);

    return { isListening, currentCaption, isSupported: isSupported() };
}
