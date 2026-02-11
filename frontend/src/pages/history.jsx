import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import withAuth from '../utils/withAuth';
import authService from '../services/auth.service';
import Sidebar from '../components/Sidebar';
import { useToast } from '../contexts/ToastContext';
import { LinkIcon } from '@heroicons/react/24/outline';

function History() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const result = await authService.getHistoryOfUser();
        if (mounted) {
          if (result.success) {
            setMeetings(Array.isArray(result.history) ? result.history : []);
          } else {
            toast.error(result.error || 'Failed to fetch history');
          }
        }
      } catch {
        if (mounted) toast.error('Failed to fetch history');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [toast]);

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  const copyJoinLink = (code) => {
    const link = typeof window !== 'undefined' ? `${window.location.origin}/${code}` : '';
    if (link && navigator.clipboard) {
      navigator.clipboard.writeText(link).then(() => toast.success('Link copied to clipboard'));
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">Loading history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 overflow-y-auto p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Meeting History</h1>
        <p className="text-gray-500 mb-6">Past meetings you’ve joined. Rejoin or copy the link to share.</p>

        {meetings.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-500">No meetings in your history yet.</p>
            <p className="text-sm text-gray-400 mt-1">Meetings you join will appear here.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {meetings.map((m, idx) => (
              <div
                key={`${m.meetingCode}-${idx}`}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <p className="font-mono font-semibold text-gray-800">Code: {m.meetingCode}</p>
                  <p className="text-sm text-gray-500 mt-1">Joined: {formatDate(m.date)}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => copyJoinLink(m.meetingCode)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors"
                  >
                    <LinkIcon className="w-4 h-4" />
                    Copy link
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/${m.meetingCode}`)}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium transition-colors"
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
  );
}

export default withAuth(History);