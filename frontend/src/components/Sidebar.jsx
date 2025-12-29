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
    <div className="h-screen w-64 bg-purple-600 text-white flex flex-col">
      {/* Logo Section */}
      <div className="p-6 border-b border-purple-500">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <VideoCameraIcon className="w-5 h-5 text-purple-600" />
          </div>
          <span className="text-xl font-bold">Video Buddy</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <button
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-purple-700 text-white'
                      : 'text-purple-100 hover:bg-purple-700 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-purple-500">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-purple-100 hover:bg-purple-700 hover:text-white transition-colors"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;

