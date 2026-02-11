import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const UserProfile = () => {
  const { user } = useAuth();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getInitials = (username) => {
    if (!username) return 'U';
    return username.charAt(0).toUpperCase();
  };

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-full bg-[#0B5CFF] flex items-center justify-center text-white font-semibold text-base">
          {getInitials(user?.username)}
        </div>
        <div>
          <h2 className="text-xl font-semibold text-[#1a1a1a] tracking-tight">
            {getGreeting()}, {user?.username || 'User'}
          </h2>
          <p className="text-sm text-[#5e6c84]">Your dashboard</p>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
