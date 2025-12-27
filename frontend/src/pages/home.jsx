import React, { useState } from 'react';
import withAuth from '../utils/withAuth';
import { useNavigate } from 'react-router-dom';
import { ArrowPathIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/solid'; // Import Heroicons
import { removeToken } from '../utils/auth';
import authService from '../services/auth.service';

function HomeComponent() {
  const navigate = useNavigate();
  const [meetingCode, setMeetingCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleJoinVideoCall = async () => {
    if (!meetingCode.trim()) {
      setError("Please enter a meeting code");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await authService.addToUserHistory(meetingCode.trim());
      if (!result.success) {
        console.error("Failed to add to history:", result.error);
        setError(result.error);
        return;
      }
      navigate(`/${meetingCode.trim()}`);
    } catch (err) {
      console.error("Failed to add to history", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    removeToken();
    navigate("/auth");
  };

  const generateRandomCode = () => {
    const randomString = Math.random().toString(36).substring(2, 8);
    setMeetingCode(randomString);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white flex flex-col">
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center">
          <h2 className="text-white text-2xl">Loading…</h2>
        </div>
      )}

      <div className="navbar bg-base-100 text-base-content shadow-lg">
        <div className="flex-1">
          <h2 className="text-xl font-bold">Connect Through LiveLink</h2>
        </div>
        <div className="flex-none">
          <button className="btn btn-ghost btn-circle" onClick={() => navigate("/history")}>
            <ArrowPathIcon className="h-6 w-6" />
          </button>
          <span className="mr-2">History</span>
          <button className="btn btn-ghost" onClick={handleLogout}>
            <ArrowRightOnRectangleIcon className="h-5 w-5 mr-1" /> Logout
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="card lg:card-side bg-base-100 shadow-xl w-full max-w-4xl">
          <div className="card-body lg:w-1/2 flex justify-center items-center">
            <div className="text-center">
              <h2 className="card-title text-3xl mb-4">Enter Meeting Code</h2>
              <div className="flex flex-col sm:flex-row gap-4 mb-4 justify-center">
                <input
                  type="text"
                  placeholder="Meeting Code"
                  className="input input-bordered w-full max-w-xs"
                  onChange={e => setMeetingCode(e.target.value)}
                  value={meetingCode}
                />
                <button className="btn btn-primary" onClick={handleJoinVideoCall}>
                  Join
                </button>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={generateRandomCode}>
                Generate Random Code
              </button>
              {error && <p className="text-red-500 mt-4">{error}</p>}
            </div>
          </div>
          <figure className="lg:w-1/2">
            <img srcSet='/logo3.png' alt="Meeting" className="w-full h-full object-cover rounded-r-xl" />
          </figure>
        </div>
      </div>
    </div>
  );
}

export default withAuth(HomeComponent);
