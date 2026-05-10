import React, { useEffect, useState } from 'react';
import { PhoneIcon, VideoCameraIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { useCall } from '../contexts/CallContext';

const RING_SECONDS = 30;

// ── Incoming call overlay (callee sees this) ─────────────────────────────────
export default function IncomingCallModal() {
    const { incomingCall, answerCall, rejectCall } = useCall();
    const [countdown, setCountdown] = useState(RING_SECONDS);

    useEffect(() => {
        if (!incomingCall) { setCountdown(RING_SECONDS); return; }
        setCountdown(RING_SECONDS);

        const interval = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    rejectCall();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [incomingCall, rejectCall]);

    if (!incomingCall) return null;

    const isVideo  = incomingCall.callType !== 'audio';
    const CallIcon = isVideo ? VideoCameraIcon : PhoneIcon;

    return (
        <div className="fixed bottom-6 right-6 z-[60] w-80 bg-white rounded-2xl shadow-2xl border border-[#e2e8f0] overflow-hidden">
            <div className={`h-1 ${isVideo ? 'bg-[#0B5CFF]' : 'bg-emerald-500'}`} />
            <div className="p-5">
                <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isVideo ? 'bg-[#eff6ff]' : 'bg-emerald-50'
                    }`}>
                        <CallIcon className={`w-5 h-5 ${isVideo ? 'text-[#0B5CFF]' : 'text-emerald-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-[#9caabb] mb-0.5">
                            Incoming {isVideo ? 'video' : 'audio'} call
                        </p>
                        <p className="text-base font-semibold text-[#1a1a1a] truncate">
                            {incomingCall.callerName || 'Unknown caller'}
                        </p>
                    </div>
                    <span className="text-xs text-[#9caabb] tabular-nums flex-shrink-0">
                        {countdown}s
                    </span>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={rejectCall}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 text-red-500 text-sm font-medium hover:bg-red-100 transition-colors"
                    >
                        <XMarkIcon className="w-4 h-4" />
                        Decline
                    </button>
                    <button
                        onClick={answerCall}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-medium transition-colors ${
                            isVideo
                                ? 'bg-[#0B5CFF] hover:bg-[#0047AB]'
                                : 'bg-emerald-500 hover:bg-emerald-600'
                        }`}
                    >
                        <CallIcon className="w-4 h-4" />
                        Answer
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Outgoing call overlay (caller sees this while waiting) ───────────────────
export function OutgoingCallOverlay() {
    const { outgoingCall, cancelCall } = useCall();
    if (!outgoingCall) return null;

    const isVideo  = outgoingCall.callType !== 'audio';
    const CallIcon = isVideo ? VideoCameraIcon : PhoneIcon;

    return (
        <div className="fixed bottom-6 right-6 z-[60] w-72 bg-[#1C1E2B] rounded-2xl shadow-2xl overflow-hidden">
            <div className={`h-1 ${isVideo ? 'bg-[#0B5CFF]' : 'bg-emerald-500'}`} />
            <div className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isVideo ? 'bg-[#0B5CFF]/20' : 'bg-emerald-500/20'
                }`}>
                    <CallIcon className={`w-4 h-4 animate-pulse ${
                        isVideo ? 'text-[#6E9BFF]' : 'text-emerald-400'
                    }`} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#a2a3b7]">Calling…</p>
                    <p className="text-sm font-semibold text-white truncate">
                        {outgoingCall.user?.username || 'User'}
                    </p>
                </div>
                <button
                    onClick={cancelCall}
                    className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors flex-shrink-0"
                    title="Cancel call"
                >
                    <XMarkIcon className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
