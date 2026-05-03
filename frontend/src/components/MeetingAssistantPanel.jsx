/**
 * MeetingAssistantPanel — AI-powered meeting assistant sidebar
 *
 * Three sections accessible via tabs:
 *   1. Q&A Bot  — ask questions, answered using the transcript as context
 *   2. Summary  — generate meeting summary, key points, decisions
 *   3. Actions  — extract action items with assignees and priority
 *
 * Props:
 *   transcript – array of { speaker, text, timestamp }
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    ChatBubbleLeftEllipsisIcon,
    DocumentTextIcon,
    CheckCircleIcon,
    PaperAirplaneIcon,
    ArrowPathIcon,
} from '@heroicons/react/24/solid';
import * as aiService from '../services/ai.service';

// Priority badge colours
const PRIORITY_COLORS = {
    high: 'bg-red-500/20 text-red-300 border border-red-500/30',
    medium: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
    low: 'bg-green-500/20 text-green-300 border border-green-500/30',
};

// ── Tab selector ────────────────────────────────────────────────────────────
function TabButton({ active, onClick, icon: Icon, label }) {
    return (
        <button
            onClick={onClick}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors
                ${active ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200'}`}
        >
            <Icon className="h-4 w-4" />
            {label}
        </button>
    );
}

// ── Q&A Bot tab ─────────────────────────────────────────────────────────────
function QATab({ transcript }) {
    const [messages, setMessages] = useState([
        { role: 'assistant', text: 'Hi! Ask me anything about this meeting.' },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        const q = input.trim();
        if (!q || loading) return;

        setMessages((prev) => [...prev, { role: 'user', text: q }]);
        setInput('');
        setLoading(true);

        try {
            const res = await aiService.askQuestion(q, transcript);
            setMessages((prev) => [...prev, { role: 'assistant', text: res.answer }]);
        } catch (err) {
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', text: `Error: ${err.response?.data?.error || err.message}` },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Message list */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                            className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                                msg.role === 'user'
                                    ? 'bg-blue-600 text-white rounded-br-none'
                                    : 'bg-gray-700 text-gray-100 rounded-bl-none'
                            }`}
                        >
                            {msg.text}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-gray-700 rounded-xl px-4 py-2 text-sm text-gray-400 animate-pulse">
                            Thinking…
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="flex gap-2 px-3 py-3 border-t border-gray-700 flex-shrink-0">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about the meeting…"
                    className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
                <button
                    onClick={handleSend}
                    disabled={!input.trim() || loading}
                    className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    <PaperAirplaneIcon className="h-4 w-4 text-white" />
                </button>
            </div>
        </div>
    );
}

// ── Summary tab ──────────────────────────────────────────────────────────────
function SummaryTab({ transcript }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const generate = async () => {
        if (transcript.length === 0) {
            setError('Start speaking to build a transcript first.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await aiService.generateSummary(transcript);
            setData(res.data);
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full overflow-y-auto px-3 py-4 gap-4">
            <button
                onClick={generate}
                disabled={loading}
                className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-sm font-medium transition-colors"
            >
                {loading ? (
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                ) : (
                    <DocumentTextIcon className="h-4 w-4" />
                )}
                {loading ? 'Generating…' : 'Generate Summary'}
            </button>

            {error && (
                <p className="text-sm text-red-400 bg-red-900/20 rounded-lg px-3 py-2">{error}</p>
            )}

            {data && (
                <div className="space-y-4 text-sm">
                    {/* Overview */}
                    <div className="bg-gray-700/60 rounded-xl p-3">
                        <h4 className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-1">
                            Overview
                        </h4>
                        <p className="text-gray-200 leading-relaxed">{data.summary}</p>
                    </div>

                    {/* Key Points */}
                    {data.keyPoints?.length > 0 && (
                        <div className="bg-gray-700/60 rounded-xl p-3">
                            <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">
                                Key Points
                            </h4>
                            <ul className="space-y-1">
                                {data.keyPoints.map((pt, i) => (
                                    <li key={i} className="flex gap-2 text-gray-200">
                                        <span className="text-blue-400 mt-0.5">•</span>
                                        <span>{pt}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Decisions */}
                    {data.decisions?.length > 0 && (
                        <div className="bg-gray-700/60 rounded-xl p-3">
                            <h4 className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-2">
                                Decisions
                            </h4>
                            <ul className="space-y-1">
                                {data.decisions.map((d, i) => (
                                    <li key={i} className="flex gap-2 text-gray-200">
                                        <span className="text-green-400 mt-0.5">✓</span>
                                        <span>{d}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {!data && !loading && !error && (
                <p className="text-sm text-gray-500 text-center mt-4">
                    Click the button above to generate a summary from the current transcript.
                </p>
            )}
        </div>
    );
}

// ── Action Items tab ─────────────────────────────────────────────────────────
function ActionItemsTab({ transcript }) {
    const [items, setItems] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [checked, setChecked] = useState({});

    const extract = async () => {
        if (transcript.length === 0) {
            setError('Start speaking to build a transcript first.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await aiService.extractActionItems(transcript);
            setItems(res.data.actionItems || []);
            setChecked({});
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleCheck = (i) => setChecked((prev) => ({ ...prev, [i]: !prev[i] }));

    return (
        <div className="flex flex-col h-full overflow-y-auto px-3 py-4 gap-4">
            <button
                onClick={extract}
                disabled={loading}
                className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-sm font-medium transition-colors"
            >
                {loading ? (
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                ) : (
                    <CheckCircleIcon className="h-4 w-4" />
                )}
                {loading ? 'Extracting…' : 'Extract Action Items'}
            </button>

            {error && (
                <p className="text-sm text-red-400 bg-red-900/20 rounded-lg px-3 py-2">{error}</p>
            )}

            {items !== null && items.length === 0 && (
                <p className="text-sm text-gray-500 text-center">No action items found.</p>
            )}

            {items && items.length > 0 && (
                <div className="space-y-2">
                    {items.map((item, i) => (
                        <div
                            key={i}
                            onClick={() => toggleCheck(i)}
                            className={`cursor-pointer rounded-xl p-3 border transition-all ${
                                checked[i]
                                    ? 'bg-gray-800 border-gray-700 opacity-60'
                                    : 'bg-gray-700/70 border-gray-600 hover:border-gray-500'
                            }`}
                        >
                            <div className="flex items-start gap-2">
                                {/* Checkbox */}
                                <div
                                    className={`mt-0.5 h-4 w-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                                        checked[i] ? 'bg-green-500 border-green-500' : 'border-gray-500'
                                    }`}
                                >
                                    {checked[i] && (
                                        <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm text-gray-100 ${checked[i] ? 'line-through text-gray-500' : ''}`}>
                                        {item.task}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        {item.assignedTo && item.assignedTo !== 'Unassigned' && (
                                            <span className="text-xs text-blue-400">@ {item.assignedTo}</span>
                                        )}
                                        {item.priority && (
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.medium}`}>
                                                {item.priority}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {items === null && !loading && !error && (
                <p className="text-sm text-gray-500 text-center mt-4">
                    Click the button above to extract action items from the transcript.
                </p>
            )}
        </div>
    );
}

// ── Main export ──────────────────────────────────────────────────────────────
export default function MeetingAssistantPanel({ transcript = [] }) {
    const [tab, setTab] = useState('qa');

    return (
        <div className="flex flex-col h-full bg-gray-900 text-white">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-700 flex-shrink-0">
                <h3 className="text-sm font-semibold text-white">AI Assistant</h3>
                <p className="text-xs text-gray-400">{transcript.length} transcript entries</p>
            </div>

            {/* Tab bar */}
            <div className="flex border-b border-gray-700 flex-shrink-0">
                <TabButton
                    active={tab === 'qa'}
                    onClick={() => setTab('qa')}
                    icon={ChatBubbleLeftEllipsisIcon}
                    label="Q&A"
                />
                <TabButton
                    active={tab === 'summary'}
                    onClick={() => setTab('summary')}
                    icon={DocumentTextIcon}
                    label="Summary"
                />
                <TabButton
                    active={tab === 'actions'}
                    onClick={() => setTab('actions')}
                    icon={CheckCircleIcon}
                    label="Actions"
                />
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-hidden">
                {tab === 'qa' && <QATab transcript={transcript} />}
                {tab === 'summary' && <SummaryTab transcript={transcript} />}
                {tab === 'actions' && <ActionItemsTab transcript={transcript} />}
            </div>
        </div>
    );
}
