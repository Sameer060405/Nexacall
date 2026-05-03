import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserGroupIcon, PlusCircleIcon, CalendarDaysIcon } from '@heroicons/react/24/solid';
import ScheduleMeetingModal from './ScheduleMeetingModal';

const ActionCards = ({ onScheduleMeeting }) => {
  const navigate = useNavigate();
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  const actions = [
    {
      icon: UserGroupIcon,
      label: 'Start a meeting',
      description: 'Create an instant meeting',
      iconBg: 'bg-[#0B5CFF]/10',
      iconColor: 'text-[#0B5CFF]',
      borderHover: 'hover:border-[#0B5CFF]/30',
      onClick: () => {
        const code = Math.random().toString(36).substring(2, 8);
        navigate(`/${code}`);
      },
    },
    {
      icon: PlusCircleIcon,
      label: 'Join a meeting',
      description: 'Enter a meeting code',
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-600',
      borderHover: 'hover:border-emerald-500/30',
      onClick: () => {
        const code = prompt('Enter meeting code:');
        if (code) navigate(`/${code}`);
      },
    },
    {
      icon: CalendarDaysIcon,
      label: 'Schedule a meeting',
      description: 'Plan a future meeting',
      iconBg: 'bg-violet-500/10',
      iconColor: 'text-violet-600',
      borderHover: 'hover:border-violet-500/30',
      onClick: () => setIsScheduleModalOpen(true),
    },
  ];

  const handleSchedule = async (meetingData) => {
    if (onScheduleMeeting) await onScheduleMeeting(meetingData);
    setIsScheduleModalOpen(false);
  };

  return (
    <>
      <div className="flex gap-4">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <button
              key={index}
              onClick={action.onClick}
              className={`flex-1 bg-white rounded-xl p-5 border border-[#e2e8f0] ${action.borderHover} hover:shadow-md transition-all flex flex-col items-center gap-3 min-w-0`}
            >
              <div className={`w-12 h-12 rounded-xl ${action.iconBg} flex items-center justify-center`}>
                <Icon className={`w-6 h-6 ${action.iconColor}`} />
              </div>
              <div className="text-center">
                <span className="text-sm font-semibold text-[#1a1a1a] block">{action.label}</span>
                <span className="text-xs text-[#5e6c84] mt-0.5 block">{action.description}</span>
              </div>
            </button>
          );
        })}
      </div>
      <ScheduleMeetingModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onSchedule={handleSchedule}
      />
    </>
  );
};

export default ActionCards;
