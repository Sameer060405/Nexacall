import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  HomeIcon,
  PhoneIcon,
  CalendarDaysIcon,
  ClockIcon,
  VideoCameraIcon,
  UserGroupIcon,
  Squares2X2Icon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/solid';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();

  const menuItems = [
    { icon: HomeIcon, label: 'Home', path: '/home' },
    { icon: PhoneIcon, label: 'Calls', path: '/calls' },
    { icon: CalendarDaysIcon, label: 'Calendar', path: '/calendar' },
    { icon: ClockIcon, label: 'History', path: '/history' },
    { icon: VideoCameraIcon, label: 'Recording', path: '/recording' },
    { icon: UserGroupIcon, label: 'Contacts', path: '/contacts' },
    { icon: Squares2X2Icon, label: 'Whiteboards', path: '/whiteboards' },
  ];

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : '??';

  return (
    <div className="h-screen w-[240px] flex-shrink-0 bg-[#1e1e2d] text-white flex flex-col">
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[#0B5CFF] flex items-center justify-center">
            <VideoCameraIcon className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight">NexaCall</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-0.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <button
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative ${
                    isActive
                      ? 'bg-[#0B5CFF]/15 text-[#6E9BFF]'
                      : 'text-[#a2a3b7] hover:bg-white/[0.04] hover:text-white'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[#0B5CFF]" />
                  )}
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-3 pb-3 border-t border-white/[0.06] pt-3 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-[#0B5CFF] flex items-center justify-center text-xs font-bold">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.username || 'User'}</p>
            <p className="text-xs text-[#a2a3b7] truncate">{user?.email || ''}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#a2a3b7] hover:bg-white/[0.04] hover:text-white transition-all"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5 flex-shrink-0" />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
