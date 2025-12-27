// src/pages/history.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import withAuth from '../utils/withAuth';
import authService from '../services/auth.service';
import { HomeIcon } from '@heroicons/react/24/solid';

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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button className="btn btn-ghost btn-circle" onClick={() => navigate('/home')}>
            <HomeIcon className="h-6 w-6" />
          </button>
          <h1 className="text-3xl font-bold">Meeting History</h1>
        </div>

        {meetings.length === 0 ? (
          <p className="text-gray-400 text-center mt-8">No meetings found.</p>
        ) : (
          <div className="grid gap-4">
            {meetings.map((m, idx) => (
              <div key={`${m.meetingCode}-${idx}`} className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h2 className="card-title text-lg text-gray-300">Code: {m.meetingCode}</h2>
                  <p className="text-gray-400">Date: {formatDate(m.date)}</p>
                  <div className="card-actions justify-end">
                    <button className="btn btn-primary" onClick={() => navigate(`/${m.meetingCode}`)}>
                      Rejoin
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showSnackbar && (
          <div className="toast toast-center toast-bottom">
            <div className="alert alert-error">
              <span>{snackbarMessage}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default withAuth(History);
