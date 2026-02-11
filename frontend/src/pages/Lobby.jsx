import React, { useState } from 'react';
import {
  VideoCameraIcon,
  VideoCameraSlashIcon,
  MicrophoneIcon,
  NoSymbolIcon,
  ArrowRightEndOnRectangleIcon,
} from '@heroicons/react/24/solid';
import { UserCircleIcon } from '@heroicons/react/24/outline';

export default function Lobby({
  username,
  setUsername,
  connect,
  localVideoref,
  meetingCode,
  videoAvailable = true,
  audioAvailable = true,
}) {
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const canJoin = username && username.trim().length > 0;

  const handleJoin = () => {
    connect({ video: camOn, audio: micOn });
  };

  return (
    <div className="min-h-screen bg-[#202124] flex flex-col">
      {/* Top bar - meeting code / ready */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
            <VideoCameraIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-medium text-white">
              {meetingCode ? `Meeting: ${meetingCode}` : 'Ready to join?'}
            </h1>
            <p className="text-xs text-gray-400">
              {meetingCode ? 'Enter your name and join' : 'Set up your camera and mic'}
            </p>
          </div>
        </div>
      </header>

      {/* Main content - centered preview + controls */}
      <div className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12 p-6 min-h-0">
        {/* Video preview - large, Meet-style */}
        <div className="w-full max-w-2xl flex flex-col items-center">
          <div className="relative w-full aspect-video max-h-[50vh] rounded-2xl overflow-hidden bg-gray-900 border border-white/10 shadow-2xl ring-1 ring-black/20">
            <video
              ref={localVideoref}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover -scale-x-100"
            />
            {/* Name overlay on preview (when entered) */}
            {username?.trim() && (
              <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-sm font-medium text-white">
                {username.trim()}
              </div>
            )}
            {/* Camera off placeholder */}
            {!camOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <UserCircleIcon className="w-24 h-24 text-gray-500" />
              </div>
            )}
          </div>

          {/* Pre-join device toggles - below preview like Meet */}
          <div className="flex items-center justify-center gap-3 mt-6">
            {videoAvailable && (
              <button
                type="button"
                onClick={() => setCamOn((v) => !v)}
                className={`flex flex-col items-center justify-center w-14 h-14 rounded-full transition-colors ${
                  camOn
                    ? 'bg-white/15 hover:bg-white/25 text-white'
                    : 'bg-red-500/90 hover:bg-red-500 text-white'
                }`}
                title={camOn ? 'Turn off camera' : 'Turn on camera'}
              >
                {camOn ? (
                  <VideoCameraIcon className="w-6 h-6" />
                ) : (
                  <VideoCameraSlashIcon className="w-6 h-6" />
                )}
                <span className="text-[10px] mt-0.5 font-medium">Camera</span>
              </button>
            )}
            {audioAvailable && (
              <button
                type="button"
                onClick={() => setMicOn((v) => !v)}
                className={`flex flex-col items-center justify-center w-14 h-14 rounded-full transition-colors ${
                  micOn
                    ? 'bg-white/15 hover:bg-white/25 text-white'
                    : 'bg-red-500/90 hover:bg-red-500 text-white'
                }`}
                title={micOn ? 'Mute microphone' : 'Unmute microphone'}
              >
                {micOn ? (
                  <MicrophoneIcon className="w-6 h-6" />
                ) : (
                  <NoSymbolIcon className="w-6 h-6" />
                )}
                <span className="text-[10px] mt-0.5 font-medium">Mic</span>
              </button>
            )}
          </div>
        </div>

        {/* Right panel - name + join (Teams/Meet style) */}
        <div className="w-full max-w-sm flex flex-col gap-6">
          <div className="bg-white/5 rounded-2xl border border-white/10 p-6 backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-white mb-1">Your name</h2>
            <p className="text-sm text-gray-400 mb-4">
              This is how you’ll appear to others in the meeting.
            </p>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              autoFocus
            />
          </div>

          <button
            type="button"
            onClick={handleJoin}
            disabled={!canJoin}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold text-base text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-blue-600/20"
          >
            <ArrowRightEndOnRectangleIcon className="w-5 h-5" />
            Join now
          </button>

          <p className="text-xs text-gray-500 text-center">
            By joining, you agree to be respectful and follow the meeting host’s guidelines.
          </p>
        </div>
      </div>
    </div>
  );
}
