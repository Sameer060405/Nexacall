import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import withAuth from '../utils/withAuth';
import Sidebar from '../components/Sidebar';
import userService from '../services/user.service';
import contactService from '../services/contact.service';
import { useToast } from '../contexts/ToastContext';
import {
  MagnifyingGlassIcon,
  PhoneIcon,
  StarIcon,
  TrashIcon,
  UserPlusIcon,
  XMarkIcon,
  PlusIcon,
} from '@heroicons/react/24/solid';
import { StarIcon as StarOutline } from '@heroicons/react/24/outline';

// ─── Tab IDs ────────────────────────────────────────────────────────────────
const TAB_CONNECTIONS = 'connections';
const TAB_PHONE = 'phone';

function ContactsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState(TAB_CONNECTIONS);

  // ── Connections state (NexaCall users) ────────────────────────────────────
  const [contacts, setContacts] = useState([]);
  const [speedDialIds, setSpeedDialIds] = useState(new Set());
  const [loadingConn, setLoadingConn] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  // ── Phone contacts state ──────────────────────────────────────────────────
  const [phoneContacts, setPhoneContacts] = useState([]);
  const [loadingPhone, setLoadingPhone] = useState(true);
  const [showPhoneForm, setShowPhoneForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [saving, setSaving] = useState(false);

  // ── Load NexaCall contacts ────────────────────────────────────────────────
  const loadConnections = useCallback(async () => {
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

  // ── Load phone contacts ───────────────────────────────────────────────────
  const loadPhoneContacts = useCallback(async () => {
    try {
      const res = await contactService.getContacts();
      if (res.success) setPhoneContacts(res.contacts);
    } catch {
      toast.error('Failed to load phone contacts');
    } finally {
      setLoadingPhone(false);
    }
  }, [toast]);

  useEffect(() => { loadConnections(); }, [loadConnections]);
  useEffect(() => { loadPhoneContacts(); }, [loadPhoneContacts]);

  // ── Search (connections modal) ────────────────────────────────────────────
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

  const handleAddConnection = async (userId) => {
    const res = await userService.addContact(userId);
    if (res.success) { setContacts(res.contacts); toast.success('Contact added'); }
    else toast.error(res.error);
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

  const callUser = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    navigate(`/${code}`);
  };

  // ── Phone contacts CRUD ───────────────────────────────────────────────────
  const handleAddPhoneContact = async (e) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;
    setSaving(true);
    const res = await contactService.addContact(newName.trim(), newPhone.trim());
    setSaving(false);
    if (res.success) {
      setPhoneContacts((prev) => [...prev, res.contact].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName('');
      setNewPhone('');
      setShowPhoneForm(false);
      toast.success('Contact added');
    } else {
      toast.error(res.error);
    }
  };

  const handleDeletePhoneContact = async (id) => {
    const res = await contactService.deleteContact(id);
    if (res.success) {
      setPhoneContacts((prev) => prev.filter((c) => c._id !== id));
      toast.success('Contact deleted');
    } else {
      toast.error(res.error);
    }
  };

  const getInitials = (name) => (name || '??').slice(0, 2).toUpperCase();
  const contactIds = new Set(contacts.map((c) => c._id));

  if (loadingConn && loadingPhone) {
    return (
      <div className="flex h-screen bg-[#f8fafc]">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-[#5e6c84]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f8fafc]">
      <Sidebar />
      <div className="flex-1 overflow-y-auto p-6 md:p-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1a1a1a]">Contacts</h1>
            <p className="text-sm text-[#5e6c84] mt-1">Manage your connections and phone contacts.</p>
          </div>
          {activeTab === TAB_CONNECTIONS ? (
            <button
              onClick={() => { setShowAddModal(true); setSearchQuery(''); setSearchResults([]); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#0B5CFF] text-white rounded-lg text-sm font-medium hover:bg-[#0047AB] transition-colors"
            >
              <UserPlusIcon className="w-4 h-4" />
              Add Connection
            </button>
          ) : (
            <button
              onClick={() => setShowPhoneForm((v) => !v)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#0B5CFF] text-white rounded-lg text-sm font-medium hover:bg-[#0047AB] transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Add Contact
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-[#f1f5f9] rounded-xl p-1 w-fit">
          {[
            { id: TAB_CONNECTIONS, label: 'Connections' },
            { id: TAB_PHONE, label: 'Phone Contacts' },
          ].map(({ id, label }) => (
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
                activeTab === id ? 'bg-[#0B5CFF]/10 text-[#0B5CFF]' : 'bg-[#e2e8f0] text-[#5e6c84]'
              }`}>
                {id === TAB_CONNECTIONS ? contacts.length : phoneContacts.length}
              </span>
            </button>
          ))}
        </div>

        {/* ── Connections tab ── */}
        {activeTab === TAB_CONNECTIONS && (
          contacts.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#e2e8f0] p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-[#f1f5f9] flex items-center justify-center mx-auto mb-4">
                <UserPlusIcon className="w-7 h-7 text-[#5e6c84]" />
              </div>
              <h3 className="text-base font-semibold text-[#1a1a1a] mb-1">No connections yet</h3>
              <p className="text-sm text-[#5e6c84]">Add NexaCall users to call them directly.</p>
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
                    <div className="w-11 h-11 rounded-full bg-[#0B5CFF] flex items-center justify-center text-sm font-bold text-white">
                      {getInitials(c.username)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1a1a1a]">{c.username}</p>
                      <p className="text-xs text-[#5e6c84]">{c.email}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={callUser} className="p-2 rounded-lg text-[#0B5CFF] hover:bg-[#0B5CFF]/10 transition-colors" title="Call">
                        <PhoneIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleSpeedDial(c._id)}
                        className={`p-2 rounded-lg transition-colors ${isFav ? 'text-amber-500 hover:bg-amber-50' : 'text-[#5e6c84] hover:bg-[#f1f5f9]'}`}
                        title={isFav ? 'Remove from speed dial' : 'Add to speed dial'}
                      >
                        {isFav ? <StarIcon className="w-4 h-4" /> : <StarOutline className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleRemoveConnection(c._id)}
                        className="p-2 rounded-lg text-[#5e6c84] hover:bg-red-50 hover:text-red-500 transition-colors"
                        title="Remove"
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

        {/* ── Phone Contacts tab ── */}
        {activeTab === TAB_PHONE && (
          <div className="space-y-4">
            {/* Inline add form */}
            {showPhoneForm && (
              <form
                onSubmit={handleAddPhoneContact}
                className="bg-white rounded-xl border border-[#0B5CFF]/30 p-4 flex flex-col sm:flex-row gap-3"
              >
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Full name"
                  required
                  className="flex-1 px-3 py-2 border border-[#dfe1e6] rounded-lg bg-[#fafbfc] text-sm text-[#1a1a1a] placeholder-[#5e6c84] focus:outline-none focus:border-[#0B5CFF] focus:ring-1 focus:ring-[#0B5CFF]"
                />
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="Phone number (e.g. +1 555 000 0000)"
                  required
                  className="flex-1 px-3 py-2 border border-[#dfe1e6] rounded-lg bg-[#fafbfc] text-sm text-[#1a1a1a] placeholder-[#5e6c84] focus:outline-none focus:border-[#0B5CFF] focus:ring-1 focus:ring-[#0B5CFF]"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-[#0B5CFF] text-white rounded-lg text-sm font-medium hover:bg-[#0047AB] disabled:opacity-60 transition-colors"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowPhoneForm(false); setNewName(''); setNewPhone(''); }}
                    className="px-4 py-2 border border-[#e2e8f0] text-[#5e6c84] rounded-lg text-sm font-medium hover:bg-[#f8fafc] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {phoneContacts.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#e2e8f0] p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-[#f1f5f9] flex items-center justify-center mx-auto mb-4">
                  <PhoneIcon className="w-7 h-7 text-[#5e6c84]" />
                </div>
                <h3 className="text-base font-semibold text-[#1a1a1a] mb-1">No phone contacts yet</h3>
                <p className="text-sm text-[#5e6c84]">Add contacts to send SMS invitations when you schedule meetings.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {phoneContacts.map((c) => (
                  <div
                    key={c._id}
                    className="flex items-center gap-4 px-5 py-4 bg-white rounded-xl border border-[#e2e8f0] hover:border-[#0B5CFF]/20 transition-colors"
                  >
                    <div className="w-11 h-11 rounded-full bg-emerald-500 flex items-center justify-center text-sm font-bold text-white">
                      {getInitials(c.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1a1a1a]">{c.name}</p>
                      <p className="text-xs text-[#5e6c84]">{c.phone}</p>
                    </div>
                    <button
                      onClick={() => handleDeletePhoneContact(c._id)}
                      className="p-2 rounded-lg text-[#5e6c84] hover:bg-red-50 hover:text-red-500 transition-colors"
                      title="Delete contact"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Add Connection Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-[#e2e8f0]">
              <h3 className="text-base font-semibold text-[#1a1a1a]">Add Connection</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg text-[#5e6c84] hover:bg-[#f1f5f9]">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <div className="relative mb-4">
                <MagnifyingGlassIcon className="w-4 h-4 text-[#5e6c84] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search by username or email"
                  className="w-full pl-9 pr-3 py-2.5 border border-[#dfe1e6] rounded-lg bg-[#fafbfc] text-sm text-[#1a1a1a] placeholder-[#5e6c84] focus:outline-none focus:border-[#0B5CFF] focus:ring-1 focus:ring-[#0B5CFF]"
                  autoFocus
                />
              </div>
              <div className="max-h-72 overflow-y-auto">
                {searching && <p className="text-xs text-[#5e6c84] py-3 text-center">Searching...</p>}
                {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                  <p className="text-xs text-[#5e6c84] py-3 text-center">No users found</p>
                )}
                {searchResults.map((u) => {
                  const alreadyAdded = contactIds.has(u._id);
                  return (
                    <div key={u._id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#f8fafc]">
                      <div className="w-9 h-9 rounded-full bg-[#0B5CFF]/10 flex items-center justify-center text-xs font-bold text-[#0B5CFF]">
                        {getInitials(u.username)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1a1a1a] truncate">{u.username}</p>
                        <p className="text-xs text-[#5e6c84] truncate">{u.email}</p>
                      </div>
                      {alreadyAdded ? (
                        <span className="text-xs text-[#5e6c84] px-3 py-1.5">Added</span>
                      ) : (
                        <button
                          onClick={() => handleAddConnection(u._id)}
                          className="px-3 py-1.5 rounded-lg bg-[#0B5CFF] text-white text-xs font-medium hover:bg-[#0047AB] transition-colors"
                        >
                          Add
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default withAuth(ContactsPage);
