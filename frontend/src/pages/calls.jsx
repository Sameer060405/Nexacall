import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import withAuth from '../utils/withAuth';
import Sidebar from '../components/Sidebar';
import userService from '../services/user.service';
import authService from '../services/auth.service';
import { useToast } from '../contexts/ToastContext';
import {
  MagnifyingGlassIcon,
  PhoneIcon,
  UserPlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/solid';
import { LinkIcon } from '@heroicons/react/24/outline';

function CallsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [history, setHistory] = useState([]);
  const [speedDial, setSpeedDial] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const [histRes, sdRes, cRes] = await Promise.all([
          authService.getHistoryOfUser(),
          userService.getSpeedDial(),
          userService.getContacts(),
        ]);
        if (histRes.success !== false) setHistory(Array.isArray(histRes.history) ? histRes.history : Array.isArray(histRes) ? histRes : []);
        if (sdRes.success) setSpeedDial(sdRes.speedDial);
        if (cRes.success) setContacts(cRes.contacts);
      } catch {
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  const handleSearch = useCallback((q) => {
    setSearchQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q || q.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const res = await userService.searchUsers(q);
      if (res.success) setSearchResults(res.users);
      setSearching(false);
    }, 350);
  }, []);

  const callUser = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    navigate(`/${code}`);
  };

  const addToSpeedDial = async (userId) => {
    const res = await userService.addSpeedDial(userId);
    if (res.success) {
      setSpeedDial(res.speedDial);
      toast.success('Added to speed dial');
    } else {
      toast.error(res.error);
    }
  };

  const removeFromSpeedDial = async (userId) => {
    const res = await userService.removeSpeedDial(userId);
    if (res.success) {
      setSpeedDial(res.speedDial);
      toast.success('Removed from speed dial');
    }
  };

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const copyLink = (code) => {
    const link = `${window.location.origin}/${code}`;
    navigator.clipboard?.writeText(link).then(() => toast.success('Link copied'));
  };

  const getInitials = (name) => (name || '??').slice(0, 2).toUpperCase();

  const speedDialIds = new Set(speedDial.map((c) => c._id));
  const contactsNotInSD = contacts.filter((c) => !speedDialIds.has(c._id));

  if (loading) {
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
      <div className="flex-1 overflow-hidden flex">
        {/* Left panel - search / call */}
        <div className="w-80 border-r border-[#e2e8f0] flex flex-col bg-white">
          <div className="p-4 border-b border-[#e2e8f0]">
            <h2 className="text-lg font-semibold text-[#1a1a1a] mb-3">Calls</h2>
            <div className="relative">
              <MagnifyingGlassIcon className="w-4 h-4 text-[#5e6c84] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Type a name"
                className="w-full pl-9 pr-3 py-2.5 border border-[#dfe1e6] rounded-lg bg-[#fafbfc] text-sm text-[#1a1a1a] placeholder-[#5e6c84] focus:outline-none focus:border-[#0B5CFF] focus:ring-1 focus:ring-[#0B5CFF]"
              />
            </div>
            <button
              onClick={callUser}
              className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0B5CFF] text-white rounded-lg text-sm font-medium hover:bg-[#0047AB] transition-colors"
            >
              <PhoneIcon className="w-4 h-4" />
              Call
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {searching && (
              <p className="text-xs text-[#5e6c84] px-4 py-3">Searching...</p>
            )}
            {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
              <p className="text-xs text-[#5e6c84] px-4 py-3">No users found</p>
            )}
            {searchResults.map((u) => (
              <div
                key={u._id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-[#f8fafc] transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-[#0B5CFF]/10 flex items-center justify-center text-xs font-bold text-[#0B5CFF]">
                  {getInitials(u.username)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1a1a1a] truncate">{u.username}</p>
                  <p className="text-xs text-[#5e6c84] truncate">{u.email}</p>
                </div>
                <button
                  onClick={callUser}
                  className="p-2 rounded-lg text-[#0B5CFF] hover:bg-[#0B5CFF]/10 transition-colors"
                  title="Call"
                >
                  <PhoneIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
            {!searchQuery && (
              <div className="px-4 py-6 text-center">
                <PhoneIcon className="w-10 h-10 text-[#dfe1e6] mx-auto mb-2" />
                <p className="text-sm text-[#5e6c84]">Search for users to call</p>
              </div>
            )}
          </div>
        </div>

        {/* Center - History */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="p-6 border-b border-[#e2e8f0]">
            <h3 className="text-base font-semibold text-[#1a1a1a]">History</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {history.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-[#5e6c84]">When you make or receive a call, we'll list it here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {[...history].reverse().map((m, idx) => (
                  <div
                    key={`${m.meetingCode}-${idx}`}
                    className="flex items-center gap-4 px-4 py-3 bg-white rounded-xl border border-[#e2e8f0] hover:border-[#0B5CFF]/20 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#eff6ff] flex items-center justify-center">
                      <PhoneIcon className="w-4 h-4 text-[#0B5CFF]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1a1a1a] font-mono">{m.meetingCode}</p>
                      <p className="text-xs text-[#5e6c84]">{formatDate(m.date)}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => copyLink(m.meetingCode)}
                        className="p-2 rounded-lg text-[#5e6c84] hover:bg-[#f1f5f9] transition-colors"
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
        </div>

        {/* Right panel - Speed Dial */}
        <div className="w-72 border-l border-[#e2e8f0] flex flex-col bg-white">
          <div className="p-4 border-b border-[#e2e8f0] flex items-center justify-between">
            <h3 className="text-base font-semibold text-[#1a1a1a]">Speed dial</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {speedDial.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-[#f1f5f9] flex items-center justify-center mx-auto mb-3">
                  <UserPlusIcon className="w-7 h-7 text-[#5e6c84]" />
                </div>
                <p className="text-sm text-[#5e6c84] mb-1">Add people to speed dial for quick access.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {speedDial.map((c) => (
                  <div
                    key={c._id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#f8fafc] transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#0B5CFF] flex items-center justify-center text-xs font-bold text-white">
                      {getInitials(c.username)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1a1a1a] truncate">{c.username}</p>
                    </div>
                    <button
                      onClick={callUser}
                      className="p-1.5 rounded-lg text-[#0B5CFF] hover:bg-[#0B5CFF]/10 transition-colors opacity-0 group-hover:opacity-100"
                      title="Call"
                    >
                      <PhoneIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeFromSpeedDial(c._id)}
                      className="p-1.5 rounded-lg text-[#5e6c84] hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      title="Remove"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowAddPicker(true)}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-[#dfe1e6] rounded-xl text-sm text-[#5e6c84] hover:border-[#0B5CFF] hover:text-[#0B5CFF] transition-colors"
            >
              <UserPlusIcon className="w-4 h-4" />
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Add to speed dial picker modal */}
      {showAddPicker && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-[#e2e8f0]">
              <h3 className="text-base font-semibold text-[#1a1a1a]">Add to speed dial</h3>
              <button onClick={() => setShowAddPicker(false)} className="p-1.5 rounded-lg text-[#5e6c84] hover:bg-[#f1f5f9]">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 max-h-72 overflow-y-auto">
              {contactsNotInSD.length === 0 ? (
                <p className="text-sm text-[#5e6c84] text-center py-4">
                  {contacts.length === 0
                    ? 'No contacts yet. Add contacts first from the Contacts page.'
                    : 'All contacts are already in speed dial.'}
                </p>
              ) : (
                <div className="space-y-1">
                  {contactsNotInSD.map((c) => (
                    <div key={c._id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#f8fafc]">
                      <div className="w-8 h-8 rounded-full bg-[#0B5CFF]/10 flex items-center justify-center text-xs font-bold text-[#0B5CFF]">
                        {getInitials(c.username)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1a1a1a] truncate">{c.username}</p>
                      </div>
                      <button
                        onClick={async () => {
                          await addToSpeedDial(c._id);
                        }}
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
    </div>
  );
}

export default withAuth(CallsPage);
