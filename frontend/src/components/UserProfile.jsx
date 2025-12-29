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
    <div className="flex items-center gap-4">
      <div className="flex flex-col">
        <h2 className="text-2xl font-semibold text-gray-800">
          {getGreeting()}, {user?.username || 'User'}!
        </h2>
      </div>
      <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
        {getInitials(user?.username)}
      </div>
    </div>
  );
};

export default UserProfile;

