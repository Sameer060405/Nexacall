import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import withAuth from '../utils/withAuth';
import Sidebar from '../components/Sidebar';
import userService from '../services/user.service';
import contactService from '../services/contact.service';
import friendRequestService from '../services/friendRequest.service';
import presenceService from '../services/presence.service';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
    MagnifyingGlassIcon,
    PhoneIcon,
    StarIcon,
    TrashIcon,
    UserPlusIcon,
    XMarkIcon,
    PlusIcon,
    PencilIcon,
    EnvelopeIcon,
    ExclamationTriangleIcon,
    BellIcon,
    CheckIcon,
} from '@heroicons/react/24/solid';
import { StarIcon as StarOutline } from '@heroicons/react/24/outline';

const TAB_CONNECTIONS = 'connections';
const TAB_REQUESTS    = 'requests';
const TAB_PHONE       = 'phone';

// ── Skeleton card used while loading ─────────────────────────────────────────
function SkeletonCard() {
    return (
        <div className="flex items-center gap-4 px-5 py-4 bg-white rounded-xl border border-[#e2e8f0] animate-pulse">
            <div className="w-11 h-11 rounded-full bg-[#e2e8f0]" />
            <div className="flex-1 space-y-2">
                <div className="h-3 bg-[#e2e8f0] rounded w-36" />
                <div className="h-3 bg-[#e2e8f0] rounded w-24" />
            </div>
            <div className="flex gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#e2e8f0]" />
                <div className="w-8 h-8 rounded-lg bg-[#e2e8f0]" />
            </div>
        </div>
    );
}

// ── Delete confirmation popup ─────────────────────────────────────────────────
function DeleteConfirmModal({ contact, onConfirm, onCancel, loading }) {
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
                <div className="p-6 text-center">
                    <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                        <ExclamationTriangleIcon className="w-7 h-7 text-red-500" />
                    </div>
                    <h3 className="text-base font-semibold text-[#1a1a1a] mb-1">Delete contact?</h3>
                    <p className="text-sm text-[#5e6c84]">
                        <span className="font-medium text-[#1a1a1a]">{contact.name}</span> will be
                        permanently removed from your contacts.
                    </p>
                </div>
                <div className="flex gap-3 px-6 pb-6">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="flex-1 px-4 py-2.5 border border-[#e2e8f0] text-[#5e6c84] rounded-lg text-sm font-medium hover:bg-[#f8fafc] transition-colors disabled:opacity-60"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-60"
                    >
                        {loading ? 'Deleting…' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Add / Edit phone contact modal ────────────────────────────────────────────
function PhoneContactModal({ initial, onSave, onClose, saving }) {
    const isEdit = Boolean(initial?._id);
    const [name, setName]   = useState(initial?.name  || '');
    const [phone, setPhone] = useState(initial?.phone || '');
    const [email, setEmail] = useState(initial?.email || '');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim() || !phone.trim()) return;
        onSave({ name: name.trim(), phone: phone.trim(), email: email.trim() });
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#e2e8f0]">
                    <h3 className="text-base font-semibold text-[#1a1a1a]">
                        {isEdit ? 'Edit Contact' : 'Add Phone Contact'}
                    </h3>
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="p-1.5 rounded-lg text-[#5e6c84] hover:bg-[#f1f5f9] transition-colors disabled:opacity-50"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-[#5e6c84] uppercase tracking-wide mb-1.5">
                            Full Name *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Jane Doe"
                            required
                            autoFocus
                            maxLength={100}
                            className="w-full px-3 py-2.5 border border-[#dfe1e6] rounded-lg bg-[#fafbfc] text-sm text-[#1a1a1a] placeholder-[#9caabb] focus:outline-none focus:border-[#0B5CFF] focus:ring-1 focus:ring-[#0B5CFF] transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-[#5e6c84] uppercase tracking-wide mb-1.5">
                            Phone Number *
                        </label>
                        <div className="relative">
                            <PhoneIcon className="w-4 h-4 text-[#9caabb] absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="+1 212 555 1234"
                                required
                                maxLength={25}
                                className="w-full pl-9 pr-3 py-2.5 border border-[#dfe1e6] rounded-lg bg-[#fafbfc] text-sm text-[#1a1a1a] placeholder-[#9caabb] focus:outline-none focus:border-[#0B5CFF] focus:ring-1 focus:ring-[#0B5CFF] transition-colors"
                            />
                        </div>
                        <p className="text-xs text-[#9caabb] mt-1">
                            Include country code for SMS invites, e.g. +12125551234
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-[#5e6c84] uppercase tracking-wide mb-1.5">
                            Email <span className="font-normal normal-case text-[#9caabb]">(optional)</span>
                        </label>
                        <div className="relative">
                            <EnvelopeIcon className="w-4 h-4 text-[#9caabb] absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="jane@example.com"
                                maxLength={200}
                                className="w-full pl-9 pr-3 py-2.5 border border-[#dfe1e6] rounded-lg bg-[#fafbfc] text-sm text-[#1a1a1a] placeholder-[#9caabb] focus:outline-none focus:border-[#0B5CFF] focus:ring-1 focus:ring-[#0B5CFF] transition-colors"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="flex-1 px-4 py-2.5 border border-[#e2e8f0] text-[#5e6c84] rounded-lg text-sm font-medium hover:bg-[#f8fafc] transition-colors disabled:opacity-60"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !name.trim() || !phone.trim()}
                            className="flex-1 px-4 py-2.5 bg-[#0B5CFF] text-white rounded-lg text-sm font-medium hover:bg-[#0047AB] transition-colors disabled:opacity-50"
                        >
                            {saving ? (isEdit ? 'Saving…' : 'Adding…') : (isEdit ? 'Save Changes' : 'Add Contact')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
function ContactsPage() {
    const navigate = useNavigate();
    const toast    = useToast();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState(TAB_CONNECTIONS);

    // ── NexaCall connections state ────────────────────────────────────────────
    const [contacts, setContacts]         = useState([]);
    const [speedDialIds, setSpeedDialIds] = useState(new Set());
    const [loadingConn, setLoadingConn]   = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [connSearch, setConnSearch]     = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching]       = useState(false);
    // IDs of users we've already sent a pending request to (local state while modal is open)
    const [sentToIds, setSentToIds]       = useState(new Set());
    const debounceRef = useRef(null);

    // ── Friend requests state ─────────────────────────────────────────────────
    const [incomingRequests, setIncomingRequests] = useState([]);
    const [loadingReqs, setLoadingReqs]           = useState(true);
    const [processingReqId, setProcessingReqId]   = useState(null);

    // ── Phone contacts state ──────────────────────────────────────────────────
    const [phoneContacts, setPhoneContacts]   = useState([]);
    const [loadingPhone, setLoadingPhone]     = useState(true);
    const [phoneSearch, setPhoneSearch]       = useState('');
    const [showPhoneModal, setShowPhoneModal] = useState(false);
    const [editingContact, setEditingContact] = useState(null);
    const [deletingContact, setDeletingContact] = useState(null);
    const [saving, setSaving]     = useState(false);
    const [deleting, setDeleting] = useState(false);

    // ── Load connections ──────────────────────────────────────────────────────
    const loadConnections = useCallback(async () => {
        setLoadingConn(true);
        try {
            const [cRes, sdRes] = await Promise.all([
                userService.getContacts(),
                userService.getSpeedDial(),
            ]);
            if (cRes.success) setContacts(cRes.contacts);
            if (sdRes.success) setSpeedDialIds(new Set(sdRes.speedDial.map((c) => c._id)));
        } catch {
            toast.error('Failed to load connections');
        } finally {
            setLoadingConn(false);
        }
    }, [toast]);

    // ── Load incoming friend requests ─────────────────────────────────────────
    const loadIncomingRequests = useCallback(async () => {
        setLoadingReqs(true);
        try {
            const res = await friendRequestService.getIncoming();
            if (res.success) setIncomingRequests(res.requests);
        } catch {
            // silently ignore
        } finally {
            setLoadingReqs(false);
        }
    }, []);

    // ── Load phone contacts ───────────────────────────────────────────────────
    const loadPhoneContacts = useCallback(async () => {
        setLoadingPhone(true);
        try {
            const res = await contactService.getContacts();
            if (res.success) setPhoneContacts(res.contacts);
            else toast.error(res.error);
        } catch {
            toast.error('Failed to load phone contacts');
        } finally {
            setLoadingPhone(false);
        }
    }, [toast]);

    useEffect(() => { loadConnections(); },       [loadConnections]);
    useEffect(() => { loadIncomingRequests(); },  [loadIncomingRequests]);
    useEffect(() => { loadPhoneContacts(); },     [loadPhoneContacts]);

    // ── Real-time friend request events ──────────────────────────────────────
    useEffect(() => {
        const userId = user?._id || user?.id;
        if (!userId) return;
        presenceService.connect(userId);

        const unsubs = [
            presenceService.on('friend-request-received', ({ request }) => {
                setIncomingRequests((prev) => {
                    if (prev.some((r) => String(r._id) === String(request._id))) return prev;
                    return [request, ...prev];
                });
            }),
            presenceService.on('friend-request-accepted', () => {
                // Someone accepted our request — refresh contacts
                loadConnections();
            }),
        ];
        return () => unsubs.forEach((u) => u());
    }, [user, loadConnections]);

    // ── NexaCall user search (in Add Connection modal) ────────────────────────
    const handleConnSearch = useCallback((q) => {
        setConnSearch(q);
        clearTimeout(debounceRef.current);
        if (!q || q.length < 2) { setSearchResults([]); setSearching(false); return; }
        setSearching(true);
        debounceRef.current = setTimeout(async () => {
            const res = await userService.searchUsers(q);
            if (res.success) setSearchResults(res.users);
            setSearching(false);
        }, 350);
    }, []);

    const openAddModal = async () => {
        setShowAddModal(true);
        setConnSearch('');
        setSearchResults([]);
        // Load sent requests to pre-populate "Pending" states
        const res = await friendRequestService.getSent();
        if (res.success) {
            setSentToIds(new Set(
                res.requests
                    .filter((r) => r.status === 'pending')
                    .map((r) => String(r.to?._id || r.to))
            ));
        }
    };

    const handleSendRequest = async (recipientId) => {
        const res = await friendRequestService.sendRequest(recipientId);
        if (res.success) {
            setSentToIds((prev) => new Set([...prev, String(recipientId)]));
            toast.success('Friend request sent!');
        } else {
            toast.error(res.error);
        }
    };

    const handleRemoveConnection = async (userId) => {
        const res = await userService.removeContact(userId);
        if (res.success) {
            setContacts(res.contacts);
            setSpeedDialIds((prev) => { const n = new Set(prev); n.delete(userId); return n; });
            toast.success('Contact removed');
        }
    };

    const toggleSpeedDial = async (userId) => {
        if (speedDialIds.has(userId)) {
            const res = await userService.removeSpeedDial(userId);
            if (res.success) { setSpeedDialIds(new Set(res.speedDial.map((c) => c._id))); toast.success('Removed from speed dial'); }
        } else {
            const res = await userService.addSpeedDial(userId);
            if (res.success) { setSpeedDialIds(new Set(res.speedDial.map((c) => c._id))); toast.success('Added to speed dial'); }
            else toast.error(res.error);
        }
    };

    // ── Accept / reject incoming friend requests ──────────────────────────────
    const handleAcceptRequest = async (req) => {
        setProcessingReqId(req._id);
        const res = await friendRequestService.acceptRequest(req._id);
        setProcessingReqId(null);
        if (res.success) {
            setIncomingRequests((prev) => prev.filter((r) => r._id !== req._id));
            toast.success(`You are now connected with ${req.from?.username || 'them'}!`);
            loadConnections(); // refresh contacts list
        } else {
            toast.error(res.error);
        }
    };

    const handleRejectRequest = async (req) => {
        setProcessingReqId(req._id);
        const res = await friendRequestService.rejectRequest(req._id);
        setProcessingReqId(null);
        if (res.success) {
            setIncomingRequests((prev) => prev.filter((r) => r._id !== req._id));
            toast.success('Request declined.');
        } else {
            toast.error(res.error);
        }
    };

    // ── Phone contact CRUD ────────────────────────────────────────────────────
    const handleSavePhoneContact = async ({ name, phone, email }) => {
        setSaving(true);
        if (editingContact?._id) {
            const res = await contactService.updateContact(editingContact._id, { name, phone, email });
            setSaving(false);
            if (res.success) {
                setPhoneContacts((prev) =>
                    prev.map((c) => (c._id === editingContact._id ? res.contact : c))
                        .sort((a, b) => a.name.localeCompare(b.name))
                );
                setEditingContact(null);
                setShowPhoneModal(false);
                toast.success('Contact updated');
            } else {
                toast.error(res.error);
            }
        } else {
            const res = await contactService.addContact(name, phone, email);
            setSaving(false);
            if (res.success) {
                setPhoneContacts((prev) =>
                    [...prev, res.contact].sort((a, b) => a.name.localeCompare(b.name))
                );
                setShowPhoneModal(false);
                toast.success('Contact added');
            } else {
                toast.error(res.error);
            }
        }
    };

    const handleDeletePhoneContact = async () => {
        if (!deletingContact) return;
        setDeleting(true);
        const res = await contactService.deleteContact(deletingContact._id);
        setDeleting(false);
        if (res.success) {
            setPhoneContacts((prev) => prev.filter((c) => c._id !== deletingContact._id));
            setDeletingContact(null);
            toast.success('Contact deleted');
        } else {
            toast.error(res.error);
        }
    };

    // ── Filtered phone contacts ───────────────────────────────────────────────
    const filteredPhone = phoneContacts.filter((c) => {
        const q = phoneSearch.toLowerCase();
        return (
            c.name.toLowerCase().includes(q) ||
            c.phone.includes(q) ||
            (c.email && c.email.toLowerCase().includes(q))
        );
    });

    const getInitials = (name) => (name || '??').slice(0, 2).toUpperCase();
    const contactIds  = new Set(contacts.map((c) => String(c._id)));

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="flex h-screen bg-[#f8fafc]">
            <Sidebar />
            <div className="flex-1 overflow-y-auto p-6 md:p-8">

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-[#1a1a1a]">Contacts</h1>
                        <p className="text-sm text-[#5e6c84] mt-1">
                            Manage your NexaCall connections and phone contacts.
                        </p>
                    </div>
                    {activeTab === TAB_CONNECTIONS ? (
                        <button
                            onClick={openAddModal}
                            className="flex items-center gap-2 px-4 py-2.5 bg-[#0B5CFF] text-white rounded-lg text-sm font-medium hover:bg-[#0047AB] transition-colors"
                        >
                            <UserPlusIcon className="w-4 h-4" />
                            Add Connection
                        </button>
                    ) : activeTab === TAB_PHONE ? (
                        <button
                            onClick={() => { setEditingContact(null); setShowPhoneModal(true); }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-[#0B5CFF] text-white rounded-lg text-sm font-medium hover:bg-[#0047AB] transition-colors"
                        >
                            <PlusIcon className="w-4 h-4" />
                            Add Contact
                        </button>
                    ) : null}
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mb-6 bg-[#f1f5f9] rounded-xl p-1 w-fit">
                    {[
                        { id: TAB_CONNECTIONS, label: 'Connections',    count: contacts.length },
                        { id: TAB_REQUESTS,    label: 'Requests',       count: incomingRequests.length, badge: incomingRequests.length > 0 },
                        { id: TAB_PHONE,       label: 'Phone Contacts', count: phoneContacts.length },
                    ].map(({ id, label, count, badge }) => (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                activeTab === id
                                    ? 'bg-white text-[#0B5CFF] shadow-sm'
                                    : 'text-[#5e6c84] hover:text-[#1a1a1a]'
                            }`}
                        >
                            {label}
                            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                                badge
                                    ? 'bg-red-500 text-white'
                                    : activeTab === id
                                        ? 'bg-[#0B5CFF]/10 text-[#0B5CFF]'
                                        : 'bg-[#e2e8f0] text-[#5e6c84]'
                            }`}>
                                {count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* ── Connections tab ── */}
                {activeTab === TAB_CONNECTIONS && (
                    loadingConn ? (
                        <div className="grid gap-3">
                            {[1, 2, 3].map((n) => <SkeletonCard key={n} />)}
                        </div>
                    ) : contacts.length === 0 ? (
                        <div className="bg-white rounded-xl border border-[#e2e8f0] p-12 text-center">
                            <div className="w-16 h-16 rounded-full bg-[#f1f5f9] flex items-center justify-center mx-auto mb-4">
                                <UserPlusIcon className="w-7 h-7 text-[#5e6c84]" />
                            </div>
                            <h3 className="text-base font-semibold text-[#1a1a1a] mb-1">No connections yet</h3>
                            <p className="text-sm text-[#5e6c84]">Send a friend request to connect with NexaCall users.</p>
                            <button
                                onClick={openAddModal}
                                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#0B5CFF] text-white rounded-lg text-sm font-medium hover:bg-[#0047AB] transition-colors"
                            >
                                <UserPlusIcon className="w-4 h-4" />
                                Add your first connection
                            </button>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {contacts.map((c) => {
                                const isFav = speedDialIds.has(c._id);
                                return (
                                    <div
                                        key={c._id}
                                        className="flex items-center gap-4 px-5 py-4 bg-white rounded-xl border border-[#e2e8f0] hover:border-[#0B5CFF]/20 transition-colors group"
                                    >
                                        <div className="w-11 h-11 rounded-full bg-[#0B5CFF] flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                                            {getInitials(c.username)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-[#1a1a1a]">{c.username}</p>
                                            <p className="text-xs text-[#5e6c84]">{c.email}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => {
                                                    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
                                                    navigate(`/${code}`);
                                                }}
                                                className="p-2 rounded-lg text-[#0B5CFF] hover:bg-[#0B5CFF]/10 transition-colors"
                                                title="Start call"
                                            >
                                                <PhoneIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => toggleSpeedDial(c._id)}
                                                className={`p-2 rounded-lg transition-colors ${
                                                    isFav
                                                        ? 'text-amber-500 hover:bg-amber-50'
                                                        : 'text-[#5e6c84] hover:bg-[#f1f5f9]'
                                                }`}
                                                title={isFav ? 'Remove from speed dial' : 'Add to speed dial'}
                                            >
                                                {isFav
                                                    ? <StarIcon className="w-4 h-4" />
                                                    : <StarOutline className="w-4 h-4" />
                                                }
                                            </button>
                                            <button
                                                onClick={() => handleRemoveConnection(c._id)}
                                                className="p-2 rounded-lg text-[#5e6c84] hover:bg-red-50 hover:text-red-500 transition-colors"
                                                title="Remove connection"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )
                )}

                {/* ── Requests tab ── */}
                {activeTab === TAB_REQUESTS && (
                    loadingReqs ? (
                        <div className="grid gap-3">
                            {[1, 2].map((n) => <SkeletonCard key={n} />)}
                        </div>
                    ) : incomingRequests.length === 0 ? (
                        <div className="bg-white rounded-xl border border-[#e2e8f0] p-12 text-center">
                            <div className="w-16 h-16 rounded-full bg-[#f1f5f9] flex items-center justify-center mx-auto mb-4">
                                <BellIcon className="w-7 h-7 text-[#5e6c84]" />
                            </div>
                            <h3 className="text-base font-semibold text-[#1a1a1a] mb-1">No pending requests</h3>
                            <p className="text-sm text-[#5e6c84]">When someone sends you a friend request it will appear here.</p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {incomingRequests.map((req) => {
                                const from = req.from || {};
                                const isProcessing = processingReqId === req._id;
                                return (
                                    <div
                                        key={req._id}
                                        className="flex items-center gap-4 px-5 py-4 bg-white rounded-xl border border-[#e2e8f0]"
                                    >
                                        <div className="w-11 h-11 rounded-full bg-[#0B5CFF]/10 flex items-center justify-center text-sm font-bold text-[#0B5CFF] flex-shrink-0">
                                            {getInitials(from.username)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-[#1a1a1a]">{from.username || 'Unknown'}</p>
                                            <p className="text-xs text-[#5e6c84]">{from.email || ''}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleRejectRequest(req)}
                                                disabled={isProcessing}
                                                className="px-3 py-1.5 rounded-lg border border-[#e2e8f0] text-[#5e6c84] text-xs font-medium hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors disabled:opacity-50"
                                            >
                                                Decline
                                            </button>
                                            <button
                                                onClick={() => handleAcceptRequest(req)}
                                                disabled={isProcessing}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B5CFF] text-white text-xs font-medium hover:bg-[#0047AB] transition-colors disabled:opacity-50"
                                            >
                                                {isProcessing ? (
                                                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                    </svg>
                                                ) : (
                                                    <CheckIcon className="w-3.5 h-3.5" />
                                                )}
                                                Accept
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )
                )}

                {/* ── Phone Contacts tab ── */}
                {activeTab === TAB_PHONE && (
                    <div className="space-y-4">
                        {!loadingPhone && phoneContacts.length > 0 && (
                            <div className="relative">
                                <MagnifyingGlassIcon className="w-4 h-4 text-[#9caabb] absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={phoneSearch}
                                    onChange={(e) => setPhoneSearch(e.target.value)}
                                    placeholder="Search by name, phone or email…"
                                    className="w-full pl-9 pr-3 py-2.5 border border-[#dfe1e6] rounded-lg bg-white text-sm text-[#1a1a1a] placeholder-[#9caabb] focus:outline-none focus:border-[#0B5CFF] focus:ring-1 focus:ring-[#0B5CFF] transition-colors"
                                />
                                {phoneSearch && (
                                    <button
                                        onClick={() => setPhoneSearch('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9caabb] hover:text-[#5e6c84]"
                                    >
                                        <XMarkIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        )}

                        {loadingPhone ? (
                            <div className="grid gap-3">
                                {[1, 2, 3].map((n) => <SkeletonCard key={n} />)}
                            </div>
                        ) : phoneContacts.length === 0 ? (
                            <div className="bg-white rounded-xl border border-[#e2e8f0] p-12 text-center">
                                <div className="w-16 h-16 rounded-full bg-[#f1f5f9] flex items-center justify-center mx-auto mb-4">
                                    <PhoneIcon className="w-7 h-7 text-[#5e6c84]" />
                                </div>
                                <h3 className="text-base font-semibold text-[#1a1a1a] mb-1">No phone contacts yet</h3>
                                <p className="text-sm text-[#5e6c84]">Add contacts to send SMS meeting invitations.</p>
                                <button
                                    onClick={() => { setEditingContact(null); setShowPhoneModal(true); }}
                                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#0B5CFF] text-white rounded-lg text-sm font-medium hover:bg-[#0047AB] transition-colors"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    Add first contact
                                </button>
                            </div>
                        ) : filteredPhone.length === 0 ? (
                            <div className="bg-white rounded-xl border border-[#e2e8f0] p-8 text-center">
                                <p className="text-sm text-[#5e6c84]">
                                    No contacts match "<span className="font-medium">{phoneSearch}</span>"
                                </p>
                                <button onClick={() => setPhoneSearch('')} className="mt-2 text-xs text-[#0B5CFF] hover:underline">
                                    Clear search
                                </button>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {filteredPhone.map((c) => (
                                    <div
                                        key={c._id}
                                        className="flex items-center gap-4 px-5 py-4 bg-white rounded-xl border border-[#e2e8f0] hover:border-[#0B5CFF]/20 transition-colors group"
                                    >
                                        <div className="w-11 h-11 rounded-full bg-emerald-500 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                                            {getInitials(c.name)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-[#1a1a1a] truncate">{c.name}</p>
                                            <p className="text-xs text-[#5e6c84]">{c.phone}</p>
                                            {c.email && (
                                                <p className="text-xs text-[#9caabb] truncate">{c.email}</p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => { setEditingContact(c); setShowPhoneModal(true); }}
                                                className="p-2 rounded-lg text-[#5e6c84] hover:bg-[#f1f5f9] transition-colors"
                                                title="Edit contact"
                                            >
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setDeletingContact(c)}
                                                className="p-2 rounded-lg text-[#5e6c84] hover:bg-red-50 hover:text-red-500 transition-colors"
                                                title="Delete contact"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Add Connection Modal (send friend request) ── */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e2e8f0]">
                            <h3 className="text-base font-semibold text-[#1a1a1a]">Add Connection</h3>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-1.5 rounded-lg text-[#5e6c84] hover:bg-[#f1f5f9]"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5">
                            <div className="relative mb-4">
                                <MagnifyingGlassIcon className="w-4 h-4 text-[#9caabb] absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={connSearch}
                                    onChange={(e) => handleConnSearch(e.target.value)}
                                    placeholder="Search by username or email"
                                    autoFocus
                                    className="w-full pl-9 pr-3 py-2.5 border border-[#dfe1e6] rounded-lg bg-[#fafbfc] text-sm text-[#1a1a1a] placeholder-[#9caabb] focus:outline-none focus:border-[#0B5CFF] focus:ring-1 focus:ring-[#0B5CFF]"
                                />
                            </div>
                            <div className="max-h-72 overflow-y-auto">
                                {searching && (
                                    <p className="text-xs text-[#5e6c84] py-4 text-center">Searching…</p>
                                )}
                                {!searching && connSearch.length >= 2 && searchResults.length === 0 && (
                                    <p className="text-xs text-[#5e6c84] py-4 text-center">No users found</p>
                                )}
                                {searchResults.map((u) => {
                                    const uid         = String(u._id);
                                    const isConnected = contactIds.has(uid);
                                    const isPending   = sentToIds.has(uid);
                                    return (
                                        <div
                                            key={u._id}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#f8fafc]"
                                        >
                                            <div className="w-9 h-9 rounded-full bg-[#0B5CFF]/10 flex items-center justify-center text-xs font-bold text-[#0B5CFF] flex-shrink-0">
                                                {getInitials(u.username)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-[#1a1a1a] truncate">{u.username}</p>
                                                <p className="text-xs text-[#5e6c84] truncate">{u.email}</p>
                                            </div>
                                            {isConnected ? (
                                                <span className="text-xs text-emerald-500 font-medium px-2">Connected</span>
                                            ) : isPending ? (
                                                <span className="text-xs text-[#9caabb] font-medium px-2">Pending</span>
                                            ) : (
                                                <button
                                                    onClick={() => handleSendRequest(uid)}
                                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0B5CFF] text-white text-xs font-medium hover:bg-[#0047AB] transition-colors"
                                                >
                                                    <UserPlusIcon className="w-3.5 h-3.5" />
                                                    Add
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                                {!connSearch && (
                                    <p className="text-xs text-[#9caabb] text-center py-6">
                                        Start typing to search NexaCall users
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Add / Edit Phone Contact Modal ── */}
            {showPhoneModal && (
                <PhoneContactModal
                    initial={editingContact}
                    onSave={handleSavePhoneContact}
                    onClose={() => { setShowPhoneModal(false); setEditingContact(null); }}
                    saving={saving}
                />
            )}

            {/* ── Delete Confirmation Modal ── */}
            {deletingContact && (
                <DeleteConfirmModal
                    contact={deletingContact}
                    onConfirm={handleDeletePhoneContact}
                    onCancel={() => setDeletingContact(null)}
                    loading={deleting}
                />
            )}
        </div>
    );
}

export default withAuth(ContactsPage);
