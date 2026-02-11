import React, { useState, useEffect } from 'react';
import withAuth from '../utils/withAuth';
import Sidebar from '../components/Sidebar';
import recordingService from '../services/recording.service';

function RecordingPage() {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState(null);
  const [playUrl, setPlayUrl] = useState(null);
  const [error, setError] = useState(null);
  const [loadingAction, setLoadingAction] = useState(null);

  useEffect(() => {
    loadRecordings();
    return () => {
      if (playUrl) URL.revokeObjectURL(playUrl);
    };
  }, []);

  const loadRecordings = async () => {
    setLoading(true);
    try {
      const res = await recordingService.getRecordings();
      if (res.success && res.recordings) {
        setRecordings(res.recordings);
      }
    } catch (err) {
      console.error('Failed to load recordings:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    try {
      return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch (_) {
      try {
        return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      } catch (_2) {
        return d.toISOString().slice(0, 16).replace('T', ' ');
      }
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const handlePlay = async (rec) => {
    if (playingId === rec._id && playUrl) {
      setPlayingId(null);
      URL.revokeObjectURL(playUrl);
      setPlayUrl(null);
      return;
    }
    setError(null);
    if (playUrl) {
      URL.revokeObjectURL(playUrl);
      setPlayUrl(null);
    }
    setLoadingAction(rec._id);
    try {
      const blob = await recordingService.getRecordingStreamBlob(rec._id);
      const url = URL.createObjectURL(blob);
      setPlayUrl(url);
      setPlayingId(rec._id);
    } catch (e) {
      setError(e.message || 'Failed to load recording.');
      console.error(e);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDownload = async (rec) => {
    setError(null);
    setLoadingAction(rec._id);
    try {
      const blob = await recordingService.getRecordingStreamBlob(rec._id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(rec.title || 'recording').replace(/[^a-zA-Z0-9._-]/g, '_')}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 200);
    } catch (e) {
      setError(e.message || 'Failed to download recording.');
      console.error(e);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="flex h-screen bg-[#f8fafc]">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 md:p-8">
          <h1 className="text-xl font-semibold text-[#1a1a1a] mb-1">Recordings</h1>
          <p className="text-sm text-[#5e6c84] mb-6">
            Recordings from your meetings. Start a recording during a call from the Record button.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex justify-between items-center">
              <span>{error}</span>
              <button type="button" onClick={() => setError(null)} className="text-red-500 hover:text-red-700">Dismiss</button>
            </div>
          )}

          {loading ? (
            <p className="text-sm text-[#5e6c84]">Loading...</p>
          ) : recordings.length === 0 ? (
            <div className="bg-white rounded-lg border border-[#e2e8f0] p-8 text-center">
              <p className="text-[#5e6c84]">No recordings yet.</p>
              <p className="text-sm text-[#5e6c84] mt-1">
                Join a meeting and use the Record button to capture the call. Recordings will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recordings.map((rec) => (
                <div
                  key={rec._id}
                  className="bg-white rounded-lg border border-[#e2e8f0] p-4 flex flex-col sm:flex-row sm:items-center gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-[#1a1a1a] truncate">{rec.title || 'Meeting recording'}</h3>
                    <p className="text-sm text-[#5e6c84] mt-0.5">
                      {rec.meetingCode && <span>Meeting: {rec.meetingCode} · </span>}
                      {formatDate(rec.createdAt)} · {formatDuration(rec.durationSeconds)}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handlePlay(rec)}
                      disabled={loadingAction !== null}
                      className="px-4 py-2 bg-[#0B5CFF] text-white text-sm font-medium rounded-md hover:bg-[#0047AB] transition-colors disabled:opacity-50"
                    >
                      {loadingAction === rec._id ? 'Loading…' : playingId === rec._id ? 'Close' : 'Play'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload(rec)}
                      disabled={loadingAction !== null}
                      className="px-4 py-2 border border-[#e2e8f0] text-[#5e6c84] text-sm font-medium rounded-md hover:bg-[#f8fafc] transition-colors disabled:opacity-50"
                    >
                      {loadingAction === rec._id ? 'Downloading…' : 'Download'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {playUrl && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
              <div className="bg-[#1a1a1a] rounded-lg overflow-hidden max-w-4xl w-full shadow-xl">
                <div className="flex justify-between items-center px-4 py-2 border-b border-white/10">
                  <span className="text-white text-sm font-medium">Recording</span>
                  <button
                    type="button"
                    onClick={() => {
                      setPlayingId(null);
                      URL.revokeObjectURL(playUrl);
                      setPlayUrl(null);
                    }}
                    className="text-white/80 hover:text-white text-sm"
                  >
                    Close
                  </button>
                </div>
                <video
                  src={playUrl}
                  controls
                  autoPlay
                  className="w-full max-h-[80vh]"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default withAuth(RecordingPage);
