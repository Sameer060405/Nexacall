/**
 * TranscriptPanel
 *
 * Displays the running meeting transcript with speaker labels and timestamps.
 * Automatically scrolls to the latest entry.
 *
 * Props:
 *   transcript  – array of { speaker, text, timestamp, socketId }
 *   localSocketId – the current user's socket ID (used to style local entries)
 */

import React, { useEffect, useRef } from 'react';
import { ArrowDownTrayIcon } from '@heroicons/react/24/solid';

export default function TranscriptPanel({ transcript = [], localSocketId }) {
    const bottomRef = useRef(null);

    // Keep the transcript scrolled to the latest message
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcript]);

    // Export transcript as a plain-text .txt file
    const handleExport = () => {
        if (transcript.length === 0) return;
        const text = transcript
            .map((e) => {
                const time = new Date(e.timestamp).toLocaleTimeString();
                return `[${time}] ${e.speaker}: ${e.text}`;
            })
            .join('\n');

        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transcript-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex flex-col h-full bg-gray-900 text-white">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 flex-shrink-0">
                <div>
                    <h3 className="text-sm font-semibold text-white">Live Transcript</h3>
                    <p className="text-xs text-gray-400">{transcript.length} entries</p>
                </div>
                <button
                    onClick={handleExport}
                    disabled={transcript.length === 0}
                    title="Export transcript"
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                    Export
                </button>
            </div>

            {/* Transcript entries */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
                {transcript.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 gap-2">
                        <svg className="h-10 w-10 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M9 4h1m4 0h1M5 8h2m10 0h2" />
                        </svg>
                        <p className="text-sm">No transcript yet.</p>
                        <p className="text-xs">Enable transcription and start speaking.</p>
                    </div>
                ) : (
                    transcript.map((entry, idx) => {
                        const isLocal = entry.socketId === localSocketId;
                        const time = new Date(entry.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                        });

                        return (
                            <div key={idx} className={`flex flex-col gap-0.5 ${isLocal ? 'items-end' : 'items-start'}`}>
                                <span className={`text-xs font-medium ${isLocal ? 'text-blue-400' : 'text-purple-400'}`}>
                                    {entry.speaker}
                                </span>
                                <div
                                    className={`max-w-[90%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                                        isLocal
                                            ? 'bg-blue-600 text-white rounded-br-none'
                                            : 'bg-gray-700 text-gray-100 rounded-bl-none'
                                    }`}
                                >
                                    {entry.text}
                                </div>
                                <span className="text-[10px] text-gray-500">{time}</span>
                            </div>
                        );
                    })
                )}
                <div ref={bottomRef} />
            </div>
        </div>
    );
}
