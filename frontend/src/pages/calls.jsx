import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import withAuth from '../utils/withAuth';
import Sidebar from '../components/Sidebar';
import userService from '../services/user.service';
import authService from '../services/auth.service';
import contactService from '../services/contact.service';
import presenceService from '../services/presence.service';
import DirectMessagePanel from '../components/DirectMessagePanel';
import { useToast } from '../contexts/ToastContext';
import { useCall } from '../contexts/CallContext';
import {
    MagnifyingGlassIcon,
    PhoneIcon,
    UserPlusIcon,
    XMarkIcon,
    VideoCameraIcon,
    PaperAirplaneIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
    ChatBubbleLeftEllipsisIcon,
} from '@heroicons/react/24/solid';
import { LinkIcon, PhoneIcon as PhoneOutline } from '@heroicons/react/24/outline';

// ── Online status dot ─────────────────────────────────────────────────────────
function StatusDot({ online }) {
    return (
        <span
            className={`inline-block w-2.5 h-2.5 rounded-full border-2 border-white flex-shrink-0 ${
                online ? 'bg-emerald-500' : 'bg-[#d1d5db]'
            }`}
            title={online ? 'Online' : 'Offline'}
        />
    );
}

// ── Offline invite confirmation modal ─────────────────────────────────────────
function OfflineInviteModal({ contact, onSend, onCancel, sending }) {
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
                <div className="p-6">
                    <div className="w-14 h-14 rounded-full bg-[#eff6ff] flex items-center justify-center mx-auto mb-4">
                        <PhoneOutline className="w-7 h-7 text-[#0B5CFF]" />
                    </div>
                    <h3 className="text-base font-semibold text-[#1a1a1a] text-center mb-1">
                        {contact.username || contact.name} is offline
                    </h3>
                    <p className="text-sm text-[#5e6c84] text-center">
                        Send them an SMS meeting invitation so they can join when ready?
                    </p>
                    {contact.phone && (
                        <p className="text-xs text-[#9caabb] text-center mt-1">
                            SMS to {contact.phone}
                        </p>
                    )}
                </div>
                <div className="flex gap-3 px-6 pb-6">
                    <button
                        onClick={onCancel}
                        disabled={sending}
                        className="flex-1 px-4 py-2.5 border border-[#e2e8f0] text-[#5e6c84] rounded-lg text-sm font-medium hover:bg-[#f8fafc] transition-colors disabled:opacity-60"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onSend}
                        disabled={sending}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0B5CFF] text-white rounded-lg text-sm font-medium hover:bg-[#0047AB] transition-colors disabled:opacity-60"
                    >
                        {sending ? (
                            <>
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Sending…
                            </>
                        ) : (
                            <>
                                <PaperAirplaneIcon className="w-4 h-4" />
                                Send Invite
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Invite result modal (success / failure with manual link) ──────────────────
function InviteResultModal({ result, onClose }) {
    const success = result?.success;
    const link    = result?.meetingLink;

    const copyLink = () => {
        if (link) navigator.clipboard?.writeText(link);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
                <div className="p-6 text-center">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${
                        success ? 'bg-emerald-50' : 'bg-amber-50'
                    }`}>
                        {success
                            ? <CheckCircleIcon  className="w-7 h-7 text-emerald-500" />
                            : <ExclamationCircleIcon className="w-7 h-7 text-amber-500" />
                        }
                    </div>
                    <h3 className="text-base font-semibold text-[#1a1a1a] mb-1">
                        {success ? 'Invitation sent!' : 'SMS could not be delivered'}
                    </h3>
                    <p className="text-sm text-[#5e6c84]">
                        {success
                            ? result.message || 'The contact will receive an SMS with the meeting link.'
                            : result.error || 'Something went wrong. Share the link below manually.'
                        }
                    </p>

                    {/* Meeting link (always show so caller can share manually) */}
                    {link && (
                        <div className="mt-4 flex items-center gap-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg px-3 py-2 text-left">
                            <span className="flex-1 text-xs text-[#5e6c84] font-mono truncate">{link}</span>
                            <button
                                onClick={copyLink}
                                className="p-1.5 rounded text-[#0B5CFF] hover:bg-[#0B5CFF]/10 transition-colors flex-shrink-0"
                                title="Copy link"
                            >
                                <LinkIcon className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
                <div className="px-6 pb-6 flex gap-3">
                    {link && (
                        <button
                            onClick={() => window.open(link, '_blank')}
                            className="flex-1 px-4 py-2.5 border border-[#0B5CFF] text-[#0B5CFF] rounded-lg text-sm font-medium hover:bg-[#0B5CFF]/5 transition-colors"
                        >
                            Join meeting
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 bg-[#0B5CFF] text-white rounded-lg text-sm font-medium hover:bg-[#0047AB] transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
function CallsPage() {
    const navigate      = useNavigate();
    const toast         = useToast();
    const { initiateCall } = useCall();

    // ── Data state ────────────────────────────────────────────────────────────
    const [history,      setHistory]      = useState([]);
    const [speedDial,    setSpeedDial]    = useState([]);
    const [connections,  setConnections]  = useState([]); // NexaCall user contacts
    const [phoneContacts, setPhoneContacts] = useState([]);
    const [loading,      setLoading]      = useState(true);

    // ── Search state ──────────────────────────────────────────────────────────
    const [leftTab,      setLeftTab]      = useState('connections'); // 'connections' | 'phone'
    const [searchQuery,  setSearchQuery]  = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching,    setSearching]    = useState(false);
    const debounceRef = useRef(null);

    // ── Presence state ────────────────────────────────────────────────────────
    const [onlineUsers, setOnlineUsers] = useState(new Set());

    // ── Messaging state ───────────────────────────────────────────────────────
    // activeChat: the NexaCall user whose DM thread is open (null = show history)
    const [activeChat,    setActiveChat]    = useState(null);
    const [currentUserId, setCurrentUserId] = useState(null);

    // ── Call flow modals ──────────────────────────────────────────────────────
    // offlineTarget: the contact we want to invite (NexaCall user or phone contact)
    const [offlineTarget,  setOfflineTarget]  = useState(null);
    const [sendingInvite,  setSendingInvite]  = useState(false);
    const [inviteResult,   setInviteResult]   = useState(null); // shown after send
    const [showAddPicker,  setShowAddPicker]  = useState(false);

    // ── Bootstrap data ────────────────────────────────────────────────────────
    useEffect(() => {
        (async () => {
            try {
                const [histRes, sdRes, cRes, phRes] = await Promise.all([
                    authService.getHistoryOfUser(),
                    userService.getSpeedDial(),
                    userService.getContacts(),
                    contactService.getContacts(),
                ]);
                if (histRes.success !== false)
                    setHistory(Array.isArray(histRes.history) ? histRes.history : []);
                if (sdRes.success)  setSpeedDial(sdRes.speedDial);
                if (cRes.success)   setConnections(cRes.contacts);
                if (phRes.success)  setPhoneContacts(phRes.contacts);
            } catch {
                toast.error('Failed to load data');
            } finally {
                setLoading(false);
            }
        })();
    }, [toast]);

    // ── Presence subscription ─────────────────────────────────────────────────
    useEffect(() => {
        const token = localStorage.getItem('jwt_token');
        if (!token) return;

        // Decode userId from JWT (header.payload.sig — payload is base64)
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const userId  = payload.id || payload._id;
            if (userId) {
                setCurrentUserId(String(userId));
                presenceService.connect(userId);
                const unsub = presenceService.subscribe(setOnlineUsers);
                return () => { unsub(); };
            }
        } catch {
            // JWT decode failed — presence won't work but the page still loads
        }
    }, []);

    // ── NexaCall user search ──────────────────────────────────────────────────
    const handleSearch = useCallback((q) => {
        setSearchQuery(q);
        clearTimeout(debounceRef.current);
        if (!q || q.length < 2) { setSearchResults([]); setSearching(false); return; }
        setSearching(true);
        debounceRef.current = setTimeout(async () => {
            const res = await userService.searchUsers(q);
            if (res.success) setSearchResults(res.users);
            setSearching(false);
        }, 350);
    }, []);

    // ── Speed dial ────────────────────────────────────────────────────────────
    const addToSpeedDial = async (userId) => {
        const res = await userService.addSpeedDial(userId);
        if (res.success) { setSpeedDial(res.speedDial); toast.success('Added to speed dial'); }
        else toast.error(res.error);
    };

    const removeFromSpeedDial = async (userId) => {
        const res = await userService.removeSpeedDial(userId);
        if (res.success) { setSpeedDial(res.speedDial); toast.success('Removed from speed dial'); }
    };

    // ── Smart call: NexaCall user ─────────────────────────────────────────────
    // Online → emit call-invite via CallContext and show outgoing call overlay.
    // Offline → show OfflineInviteModal for SMS invite.
    const handleCallUser = (user, callType = 'video') => {
        const started = initiateCall(user, callType);
        if (!started) {
            setOfflineTarget({ ...user, _isNexaUser: true });
        }
    };

    // ── Smart call: phone contact ─────────────────────────────────────────────
    const callPhoneContact = (contact) => {
        setOfflineTarget({ ...contact, _isPhoneContact: true });
    };

    // ── Send SMS invite ───────────────────────────────────────────────────────
    const handleSendInvite = async () => {
        if (!offlineTarget) return;
        setSendingInvite(true);

        let result;
        if (offlineTarget._isPhoneContact) {
            // Phone contact → use contact.sendInvite (has contactId)
            result = await contactService.sendInvite(offlineTarget._id);
        } else {
            // NexaCall user → generate a meeting link manually (no SMS without phone)
            const code = Math.random().toString(36).substring(2, 8).toUpperCase();
            const link = `${window.location.origin}/${code}`;
            result = {
                success: true,
                meetingCode: code,
                meetingLink: link,
                message: 'Share this link with your contact to start the meeting.',
            };
        }

        setSendingInvite(false);
        setOfflineTarget(null);
        setInviteResult(result);
    };

    // ── Helpers ───────────────────────────────────────────────────────────────
    const formatDate = (dateString) => {
        const d = new Date(dateString);
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const copyLink = (code) => {
        const link = `${window.location.origin}/${code}`;
        navigator.clipboard?.writeText(link).then(() => toast.success('Link copied'));
    };

    const getInitials = (name) => (name || '??').slice(0, 2).toUpperCase();

    const speedDialIds        = new Set(speedDial.map((c) => c._id));
    const connectionsNotInSD  = connections.filter((c) => !speedDialIds.has(c._id));

    // ── Filtered lists ────────────────────────────────────────────────────────
    const q = searchQuery.toLowerCase();
    const filteredConnections = connections.filter(
        (c) => c.username?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)
    );
    const filteredPhone = phoneContacts.filter(
        (c) => c.name?.toLowerCase().includes(q) || c.phone?.includes(q)
    );

    if (loading) {
        return (
            <div className="flex h-screen bg-[#f8fafc]">
                <Sidebar />
                <div className="flex-1 flex items-center justify-center">
                    <p className="text-sm text-[#5e6c84]">Loading…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-[#f8fafc]">
            <Sidebar />
            <div className="flex-1 overflow-hidden flex">

                {/* ── Left panel: contacts list ── */}
                <div className="w-80 border-r border-[#e2e8f0] flex flex-col bg-white">
                    <div className="p-4 border-b border-[#e2e8f0]">
                        <h2 className="text-lg font-semibold text-[#1a1a1a] mb-3">Calls</h2>

                        {/* Search */}
                        <div className="relative mb-3">
                            <MagnifyingGlassIcon className="w-4 h-4 text-[#9caabb] absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); handleSearch(e.target.value); }}
                                placeholder="Search contacts…"
                                className="w-full pl-9 pr-3 py-2.5 border border-[#dfe1e6] rounded-lg bg-[#fafbfc] text-sm text-[#1a1a1a] placeholder-[#9caabb] focus:outline-none focus:border-[#0B5CFF] focus:ring-1 focus:ring-[#0B5CFF]"
                            />
                        </div>

                        {/* Tab switcher */}
                        <div className="flex gap-1 bg-[#f1f5f9] rounded-lg p-0.5">
                            {[
                                { id: 'connections', label: 'NexaCall', count: connections.length },
                                { id: 'phone',       label: 'Phone',    count: phoneContacts.length },
                            ].map(({ id, label, count }) => (
                                <button
                                    key={id}
                                    onClick={() => setLeftTab(id)}
                                    className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                                        leftTab === id
                                            ? 'bg-white text-[#0B5CFF] shadow-sm'
                                            : 'text-[#5e6c84] hover:text-[#1a1a1a]'
                                    }`}
                                >
                                    {label}
                                    <span className={`ml-1 text-xs ${leftTab === id ? 'text-[#0B5CFF]' : 'text-[#9caabb]'}`}>
                                        {count}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Contact list */}
                    <div className="flex-1 overflow-y-auto">

                        {/* ── NexaCall connections ── */}
                        {leftTab === 'connections' && (
                            <>
                                {/* Search results from user search */}
                                {searchQuery.length >= 2 && (
                                    <>
                                        {searching && (
                                            <p className="text-xs text-[#9caabb] px-4 py-3">Searching…</p>
                                        )}
                                        {!searching && searchResults.length === 0 && (
                                            <p className="text-xs text-[#9caabb] px-4 py-3">No users found</p>
                                        )}
                                        {searchResults.map((u) => (
                                            <div
                                                key={u._id}
                                                className="flex items-center gap-3 px-4 py-3 hover:bg-[#f8fafc] transition-colors"
                                            >
                                                <div className="relative">
                                                    <div className="w-9 h-9 rounded-full bg-[#0B5CFF]/10 flex items-center justify-center text-xs font-bold text-[#0B5CFF]">
                                                        {getInitials(u.username)}
                                                    </div>
                                                    <span className="absolute -bottom-0.5 -right-0.5">
                                                        <StatusDot online={onlineUsers.has(String(u._id))} />
                                                    </span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-[#1a1a1a] truncate">{u.username}</p>
                                                    <p className="text-xs text-[#9caabb]">
                                                        {onlineUsers.has(String(u._id)) ? 'Online' : 'Offline'}
                                                    </p>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => setActiveChat(u)}
                                                        className="p-1.5 rounded-lg text-[#5e6c84] hover:bg-[#f1f5f9] transition-colors"
                                                        title="Send message"
                                                    >
                                                        <ChatBubbleLeftEllipsisIcon className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleCallUser(u, 'audio')}
                                                        className="p-1.5 rounded-lg text-[#0B5CFF] hover:bg-[#0B5CFF]/10 transition-colors"
                                                        title="Audio call"
                                                    >
                                                        <PhoneIcon className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleCallUser(u, 'video')}
                                                        className="p-1.5 rounded-lg text-[#0B5CFF] hover:bg-[#0B5CFF]/10 transition-colors"
                                                        title="Video call"
                                                    >
                                                        <VideoCameraIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                )}

                                {/* My connections */}
                                {!searchQuery && (
                                    filteredConnections.length === 0 ? (
                                        <div className="px-4 py-10 text-center">
                                            <PhoneIcon className="w-10 h-10 text-[#e2e8f0] mx-auto mb-2" />
                                            <p className="text-sm text-[#9caabb]">
                                                No connections yet. Add them in Contacts.
                                            </p>
                                        </div>
                                    ) : (
                                        filteredConnections.map((u) => {
                                            const online = onlineUsers.has(String(u._id));
                                            return (
                                                <div
                                                    key={u._id}
                                                    className="flex items-center gap-3 px-4 py-3 hover:bg-[#f8fafc] transition-colors group"
                                                >
                                                    <div className="relative flex-shrink-0">
                                                        <div className="w-9 h-9 rounded-full bg-[#0B5CFF] flex items-center justify-center text-xs font-bold text-white">
                                                            {getInitials(u.username)}
                                                        </div>
                                                        <span className="absolute -bottom-0.5 -right-0.5">
                                                            <StatusDot online={online} />
                                                        </span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-[#1a1a1a] truncate">{u.username}</p>
                                                        <p className={`text-xs ${online ? 'text-emerald-500' : 'text-[#9caabb]'}`}>
                                                            {online ? 'Online — ready to call' : 'Offline'}
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => setActiveChat(u)}
                                                            className="p-1.5 rounded-lg text-[#5e6c84] hover:bg-[#f1f5f9] transition-colors"
                                                            title="Send message"
                                                        >
                                                            <ChatBubbleLeftEllipsisIcon className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleCallUser(u, 'audio')}
                                                            className="p-1.5 rounded-lg text-[#0B5CFF] hover:bg-[#0B5CFF]/10 transition-colors"
                                                            title="Audio call"
                                                        >
                                                            <PhoneIcon className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleCallUser(u, 'video')}
                                                            className="p-1.5 rounded-lg text-[#0B5CFF] hover:bg-[#0B5CFF]/10 transition-colors"
                                                            title="Video call"
                                                        >
                                                            <VideoCameraIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )
                                )}
                            </>
                        )}

                        {/* ── Phone contacts ── */}
                        {leftTab === 'phone' && (
                            filteredPhone.length === 0 ? (
                                <div className="px-4 py-10 text-center">
                                    <PhoneIcon className="w-10 h-10 text-[#e2e8f0] mx-auto mb-2" />
                                    <p className="text-sm text-[#9caabb]">
                                        {searchQuery
                                            ? 'No matches'
                                            : 'No phone contacts yet. Add them in Contacts.'}
                                    </p>
                                </div>
                            ) : (
                                filteredPhone.map((c) => (
                                    <div
                                        key={c._id}
                                        className="flex items-center gap-3 px-4 py-3 hover:bg-[#f8fafc] transition-colors group"
                                    >
                                        <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                                            {getInitials(c.name)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-[#1a1a1a] truncate">{c.name}</p>
                                            <p className="text-xs text-[#9caabb] truncate">{c.phone}</p>
                                        </div>
                                        {/* Phone contacts can only receive SMS invites */}
                                        <button
                                            onClick={() => callPhoneContact(c)}
                                            className="p-1.5 rounded-lg text-[#0B5CFF] hover:bg-[#0B5CFF]/10 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Send meeting invite"
                                        >
                                            <PaperAirplaneIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )
                        )}
                    </div>
                </div>

                {/* ── Center: Call History OR Direct Message thread ── */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    {activeChat ? (
                        // Show the DM panel when a contact is selected
                        <DirectMessagePanel
                            contact={activeChat}
                            currentUserId={currentUserId}
                            online={onlineUsers.has(String(activeChat._id))}
                            onBack={() => setActiveChat(null)}
                        />
                    ) : (
                        // Default: call history
                        <>
                            <div className="p-6 border-b border-[#e2e8f0] bg-white">
                                <h3 className="text-base font-semibold text-[#1a1a1a]">History</h3>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6">
                                {history.length === 0 ? (
                                    <div className="text-center py-16">
                                        <PhoneIcon className="w-12 h-12 text-[#e2e8f0] mx-auto mb-3" />
                                        <p className="text-sm text-[#9caabb]">
                                            When you make or receive a call, it'll appear here.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {[...history].reverse().map((m, idx) => (
                                            <div
                                                key={`${m.meetingCode}-${idx}`}
                                                className="flex items-center gap-4 px-4 py-3 bg-white rounded-xl border border-[#e2e8f0] hover:border-[#0B5CFF]/20 transition-colors"
                                            >
                                                <div className="w-9 h-9 rounded-full bg-[#eff6ff] flex items-center justify-center flex-shrink-0">
                                                    <PhoneIcon className="w-4 h-4 text-[#0B5CFF]" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-[#1a1a1a] font-mono">{m.meetingCode}</p>
                                                    <p className="text-xs text-[#9caabb]">{formatDate(m.date)}</p>
                                                </div>
                                                <div className="flex gap-1.5">
                                                    <button
                                                        onClick={() => copyLink(m.meetingCode)}
                                                        className="p-2 rounded-lg text-[#9caabb] hover:bg-[#f1f5f9] transition-colors"
                                                        title="Copy link"
                                                    >
                                                        <LinkIcon className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => navigate(`/${m.meetingCode}`)}
                                                        className="px-3 py-1.5 rounded-lg bg-[#0B5CFF] text-white text-xs font-medium hover:bg-[#0047AB] transition-colors"
                                                    >
                                                        Rejoin
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* ── Right panel: Speed dial ── */}
                <div className="w-72 border-l border-[#e2e8f0] flex flex-col bg-white">
                    <div className="p-4 border-b border-[#e2e8f0]">
                        <h3 className="text-base font-semibold text-[#1a1a1a]">Speed dial</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                        {speedDial.length === 0 ? (
                            <div className="text-center py-8">
                                <div className="w-14 h-14 rounded-full bg-[#f1f5f9] flex items-center justify-center mx-auto mb-3">
                                    <UserPlusIcon className="w-6 h-6 text-[#9caabb]" />
                                </div>
                                <p className="text-sm text-[#9caabb]">
                                    Star contacts to add them to speed dial.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {speedDial.map((c) => {
                                    const online = onlineUsers.has(String(c._id));
                                    return (
                                        <div
                                            key={c._id}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#f8fafc] transition-colors group"
                                        >
                                            <div className="relative flex-shrink-0">
                                                <div className="w-9 h-9 rounded-full bg-[#0B5CFF] flex items-center justify-center text-xs font-bold text-white">
                                                    {getInitials(c.username)}
                                                </div>
                                                <span className="absolute -bottom-0.5 -right-0.5">
                                                    <StatusDot online={online} />
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-[#1a1a1a] truncate">{c.username}</p>
                                                <p className={`text-xs ${online ? 'text-emerald-500' : 'text-[#9caabb]'}`}>
                                                    {online ? 'Online' : 'Offline'}
                                                </p>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleCallUser(c, 'video')}
                                                    className="p-1.5 rounded-lg text-[#0B5CFF] hover:bg-[#0B5CFF]/10 transition-colors"
                                                    title="Call"
                                                >
                                                    <PhoneIcon className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => removeFromSpeedDial(c._id)}
                                                    className="p-1.5 rounded-lg text-[#9caabb] hover:bg-red-50 hover:text-red-400 transition-colors"
                                                    title="Remove"
                                                >
                                                    <XMarkIcon className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <button
                            onClick={() => setShowAddPicker(true)}
                            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-[#dfe1e6] rounded-xl text-sm text-[#9caabb] hover:border-[#0B5CFF] hover:text-[#0B5CFF] transition-colors"
                        >
                            <UserPlusIcon className="w-4 h-4" />
                            Add to speed dial
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Add to speed dial picker ── */}
            {showAddPicker && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
                        <div className="flex items-center justify-between p-4 border-b border-[#e2e8f0]">
                            <h3 className="text-base font-semibold text-[#1a1a1a]">Add to speed dial</h3>
                            <button
                                onClick={() => setShowAddPicker(false)}
                                className="p-1.5 rounded-lg text-[#5e6c84] hover:bg-[#f1f5f9]"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 max-h-72 overflow-y-auto">
                            {connectionsNotInSD.length === 0 ? (
                                <p className="text-sm text-[#9caabb] text-center py-4">
                                    {connections.length === 0
                                        ? 'No connections yet. Add them from the Contacts page.'
                                        : 'All connections are already in speed dial.'}
                                </p>
                            ) : (
                                <div className="space-y-1">
                                    {connectionsNotInSD.map((c) => (
                                        <div
                                            key={c._id}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#f8fafc]"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-[#0B5CFF]/10 flex items-center justify-center text-xs font-bold text-[#0B5CFF] flex-shrink-0">
                                                {getInitials(c.username)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-[#1a1a1a] truncate">{c.username}</p>
                                            </div>
                                            <button
                                                onClick={async () => { await addToSpeedDial(c._id); }}
                                                className="px-3 py-1.5 rounded-lg bg-[#0B5CFF] text-white text-xs font-medium hover:bg-[#0047AB] transition-colors"
                                            >
                                                Add
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Offline invite confirmation ── */}
            {offlineTarget && (
                <OfflineInviteModal
                    contact={offlineTarget}
                    onSend={handleSendInvite}
                    onCancel={() => setOfflineTarget(null)}
                    sending={sendingInvite}
                />
            )}

            {/* ── Invite result (success / manual link) ── */}
            {inviteResult && (
                <InviteResultModal
                    result={inviteResult}
                    onClose={() => setInviteResult(null)}
                />
            )}
        </div>
    );
}

export default withAuth(CallsPage);
