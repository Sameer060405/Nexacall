// src/pages/history.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import withAuth from '../utils/withAuth';
import authService from '../services/auth.service';
import Sidebar from '../components/Sidebar';

function History() {
  const [meetings, setMeetings] = useState([]);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const result = await authService.getHistoryOfUser();
        if (mounted) {
          if (result.success) {
            setMeetings(Array.isArray(result.history) ? result.history : []);
          } else {
            setSnackbarMessage(result.error || 'Failed to fetch history');
            setShowSnackbar(true);
          }
        }
      } catch {
        if (mounted) {
          setSnackbarMessage('Failed to fetch history');
          setShowSnackbar(true);
        }
      }
    })();
    return () => { mounted = false; };
  }, []);

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth()+1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 overflow-y-auto p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Meeting History</h1>

        {meetings.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-500 text-center">No meetings found.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {meetings.map((m, idx) => (
              <div key={`${m.meetingCode}-${idx}`} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">Code: {m.meetingCode}</h2>
                    <p className="text-gray-600">Date: {formatDate(m.date)}</p>
                  </div>
                  <button
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    onClick={() => navigate(`/${m.meetingCode}`)}
                  >
                    Rejoin
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showSnackbar && (
          <div className="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg">
            <span>{snackbarMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default withAuth(History);
