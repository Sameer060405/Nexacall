// DirectMessagePanel.jsx
// Added: persistent 1-on-1 chat panel for NexaCall connections.
// Renders inside the center column of the Calls page when the user clicks
// "Send Message" on a connection. Messages persist in MongoDB and are
// delivered in real-time via the presence socket (dm-receive event).
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeftIcon, PaperAirplaneIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/solid';
import messageService from '../services/message.service';
import presenceService from '../services/presence.service';

function formatMsgTime(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === now.toDateString()) return time;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' · ' + time;
}

// Loading skeleton rows shown while the thread history is being fetched
function MessageSkeletons() {
    return (
        <div className="space-y-3 p-4">
            {[false, true, false, true].map((right, i) => (
                <div key={i} className={`flex ${right ? 'justify-end' : 'justify-start'}`}>
                    <div
                        className={`h-8 rounded-2xl bg-[#e2e8f0] animate-pulse ${
                            right ? 'w-36' : 'w-44'
                        }`}
                    />
                </div>
            ))}
        </div>
    );
}

/**
 * Props:
 *   contact       — the NexaCall user object ({ _id, username })
 *   currentUserId — the logged-in user's _id (decoded from JWT in calls.jsx)
 *   online        — boolean, whether the contact is currently online
 *   onBack        — callback to close the panel and return to call history
 */
export default function DirectMessagePanel({ contact, currentUserId, online, onBack }) {
    const [messages,  setMessages]  = useState([]);
    const [body,      setBody]      = useState('');
    const [loading,   setLoading]   = useState(true);
    const [sending,   setSending]   = useState(false);
    const [error,     setError]     = useState('');
    const [convStatus, setConvStatus] = useState(null);
    const [reqLoading, setReqLoading] = useState(false);
    const bottomRef                  = useRef(null);
    const inputRef                   = useRef(null);

    // Load message history whenever the active contact changes
    useEffect(() => {
        if (!contact?._id) return;
        setLoading(true);
        setMessages([]);
        setBody('');
        setError('');
        setConvStatus(null);

        messageService.getMessages(contact._id).then((res) => {
            if (res.success) {
                setMessages(res.messages);
                setConvStatus(res.conversationStatus || null);
            } else {
                setError(res.error || 'Failed to load messages');
            }
            setLoading(false);
        });

        inputRef.current?.focus();
    }, [contact._id]);

    // Subscribe to real-time incoming messages via the presence socket.
    // Only accept messages that belong to this specific conversation.
    useEffect(() => {
        const unsub = presenceService.onMessage(({ message }) => {
            const senderId    = String(message.sender);
            const recipientId = String(message.recipient);
            const contactId   = String(contact._id);
            const myId        = String(currentUserId);

            const belongsHere =
                (senderId === contactId && recipientId === myId) ||
                (senderId === myId      && recipientId === contactId);

            if (!belongsHere) return;

            setMessages((prev) => {
                // Deduplicate: the sender already appended the message optimistically
                if (prev.some((m) => String(m._id) === String(message._id))) return prev;
                return [...prev, message];
            });
        });
        return unsub;
    }, [contact._id, currentUserId]);

    // Keep the view scrolled to the most recent message
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = useCallback(async () => {
        const trimmed = body.trim();
        if (!trimmed || sending) return;

        setError('');
        setSending(true);

        const res = await messageService.sendMessage(contact._id, trimmed);
        setSending(false);

        if (res.success) {
            setBody('');
            // Append optimistically; the dm-receive listener will deduplicate if
            // the server also echoes back via socket (it currently does not for sender,
            // but this guards against any future change).
            setMessages((prev) => {
                if (prev.some((m) => String(m._id) === String(res.message._id))) return prev;
                return [...prev, res.message];
            });
        } else {
            setError(res.error || 'Failed to send message');
        }
    }, [body, contact._id, sending]);

    const handleAcceptRequest = async () => {
        if (!convStatus) return;
        setReqLoading(true);
        const res = await messageService.acceptMessageRequest(convStatus.conversationId);
        setReqLoading(false);
        if (res.success) setConvStatus(res.conversationStatus);
    };

    const handleRejectRequest = async () => {
        if (!convStatus) return;
        setReqLoading(true);
        const res = await messageService.rejectMessageRequest(convStatus.conversationId);
        setReqLoading(false);
        if (res.success) setConvStatus((prev) => ({ ...prev, status: 'rejected' }));
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const getInitials = (name) => (name || '??').slice(0, 2).toUpperCase();

    return (
        <div className="flex flex-col h-full">

            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[#e2e8f0] bg-white flex-shrink-0">
                <button
                    onClick={onBack}
                    className="p-1.5 rounded-lg text-[#5e6c84] hover:bg-[#f1f5f9] transition-colors"
                    title="Back to call history"
                >
                    <ArrowLeftIcon className="w-4 h-4" />
                </button>

                <div className="relative flex-shrink-0">
                    <div className="w-9 h-9 rounded-full bg-[#0B5CFF] flex items-center justify-center text-xs font-bold text-white">
                        {getInitials(contact.username)}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5">
                        <span
                            className={`inline-block w-2.5 h-2.5 rounded-full border-2 border-white ${
                                online ? 'bg-emerald-500' : 'bg-[#d1d5db]'
                            }`}
                        />
                    </span>
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1a1a1a] truncate">
                        {contact.username}
                    </p>
                    <p className={`text-xs ${online ? 'text-emerald-500' : 'text-[#9caabb]'}`}>
                        {online ? 'Online' : 'Offline'}
                    </p>
                </div>
            </div>

            {/* ── Message list ───────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto">
                {/* Message request banner — shown when this user is the recipient of a pending request */}
                {!loading && convStatus?.status === 'requested' &&
                    String(convStatus.recipient) === String(currentUserId) && (
                    <div className="mx-4 mt-4 rounded-xl border border-[#dfe1e6] bg-[#fffbeb] p-4">
                        <p className="text-sm font-semibold text-[#1a1a1a] mb-1">
                            Message request from {contact.username}
                        </p>
                        <p className="text-xs text-[#5e6c84] mb-3">
                            Accept to reply. Once accepted you can message freely.
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={handleRejectRequest}
                                disabled={reqLoading}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-[#e2e8f0] text-[#5e6c84] text-xs font-medium hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors disabled:opacity-50"
                            >
                                <XMarkIcon className="w-3.5 h-3.5" />
                                Decline
                            </button>
                            <button
                                onClick={handleAcceptRequest}
                                disabled={reqLoading}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#0B5CFF] text-white text-xs font-medium hover:bg-[#0047AB] transition-colors disabled:opacity-50"
                            >
                                <CheckIcon className="w-3.5 h-3.5" />
                                Accept
                            </button>
                        </div>
                    </div>
                )}

                {/* Rejected state — sender is blocked */}
                {!loading && convStatus?.status === 'rejected' &&
                    String(convStatus.recipient) !== String(currentUserId) && (
                    <div className="mx-4 mt-4 rounded-xl border border-red-100 bg-red-50 p-4 text-center">
                        <p className="text-sm text-red-600 font-medium">
                            {contact.username} has declined messages from you.
                        </p>
                    </div>
                )}

                {loading && <MessageSkeletons />}

                {!loading && messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                        <div className="w-14 h-14 rounded-full bg-[#eff6ff] flex items-center justify-center mb-3">
                            <PaperAirplaneIcon className="w-6 h-6 text-[#0B5CFF]" />
                        </div>
                        <p className="text-sm text-[#5e6c84] font-medium">No messages yet</p>
                        <p className="text-xs text-[#9caabb] mt-1">
                            Say hi to {contact.username}!
                        </p>
                    </div>
                )}

                {!loading && messages.length > 0 && (
                    <div className="px-4 py-4 space-y-2">
                        {messages.map((msg) => {
                            const isMine = String(msg.sender) === String(currentUserId);
                            return (
                                <div
                                    key={msg._id}
                                    className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`flex flex-col gap-0.5 max-w-[72%] ${
                                            isMine ? 'items-end' : 'items-start'
                                        }`}
                                    >
                                        <div
                                            className={`px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                                                isMine
                                                    ? 'bg-[#0B5CFF] text-white rounded-br-sm'
                                                    : 'bg-[#f1f5f9] text-[#1a1a1a] rounded-bl-sm'
                                            }`}
                                        >
                                            {msg.body}
                                        </div>
                                        <span className="text-[10px] text-[#9caabb] px-1">
                                            {formatMsgTime(msg.createdAt)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={bottomRef} />
                    </div>
                )}
            </div>

            {/* ── Compose area ───────────────────────────────────────────── */}
            <div className="px-4 py-3 border-t border-[#e2e8f0] bg-white flex-shrink-0">
                {error && (
                    <p className="text-xs text-red-500 mb-2">{error}</p>
                )}
                <div className="flex items-end gap-2">
                    <textarea
                        ref={inputRef}
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={`Message ${contact.username}…`}
                        rows={1}
                        className="flex-1 resize-none px-3 py-2.5 border border-[#dfe1e6] rounded-xl bg-[#fafbfc] text-sm text-[#1a1a1a] placeholder-[#9caabb] focus:outline-none focus:border-[#0B5CFF] focus:ring-1 focus:ring-[#0B5CFF] overflow-y-auto"
                        style={{ maxHeight: '96px', lineHeight: '1.5' }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!body.trim() || sending}
                        className="p-2.5 rounded-xl bg-[#0B5CFF] text-white hover:bg-[#0047AB] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                        title="Send message (Enter)"
                    >
                        {sending ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle
                                    className="opacity-25"
                                    cx="12" cy="12" r="10"
                                    stroke="currentColor" strokeWidth="4"
                                />
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                />
                            </svg>
                        ) : (
                            <PaperAirplaneIcon className="w-4 h-4" />
                        )}
                    </button>
                </div>
                <p className="text-[10px] text-[#9caabb] mt-1.5">
                    Enter to send · Shift+Enter for new line
                </p>
            </div>
        </div>
    );
}
