import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  HomeIcon,
  CalendarDaysIcon,
  VideoCameraIcon,
  UserGroupIcon,
  Squares2X2Icon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/solid';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const menuItems = [
    { icon: HomeIcon, label: 'Home', path: '/home' },
    { icon: CalendarDaysIcon, label: 'Calendar', path: '/calendar' },
    { icon: VideoCameraIcon, label: 'Recording', path: '/recording' },
    { icon: UserGroupIcon, label: 'Contacts', path: '/contacts' },
    { icon: Squares2X2Icon, label: 'Whiteboards', path: '/whiteboards' },
  ];

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="h-screen w-[240px] flex-shrink-0 bg-[#0B5CFF] text-white flex flex-col border-r border-[#0047AB]/30">
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center">
            <VideoCameraIcon className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight">NexaCall</span>
        </div>
      </div>

      <nav className="flex-1 p-3">
        <ul className="space-y-0.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <button
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'text-white/90 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-3 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-white/90 hover:bg-white/10 hover:text-white transition-colors"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5 flex-shrink-0" />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
