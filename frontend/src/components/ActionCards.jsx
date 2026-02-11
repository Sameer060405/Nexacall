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
      onClick: () => {
        const code = Math.random().toString(36).substring(2, 8);
        navigate(`/${code}`);
      },
    },
    {
      icon: PlusCircleIcon,
      label: 'Join a meeting',
      onClick: () => {
        const code = prompt('Enter meeting code:');
        if (code) {
          navigate(`/${code}`);
        }
      },
    },
    {
      icon: CalendarDaysIcon,
      label: 'Schedule a meeting',
      onClick: () => {
        setIsScheduleModalOpen(true);
      },
    },
  ];

  const handleSchedule = async (meetingData) => {
    if (onScheduleMeeting) {
      await onScheduleMeeting(meetingData);
    }
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
              className="flex-1 bg-white rounded-lg p-5 border border-[#e2e8f0] hover:border-[#0B5CFF]/30 hover:shadow-sm transition-all flex flex-col items-center gap-3 min-w-0"
            >
              <div className="w-12 h-12 rounded-lg bg-[#eff6ff] flex items-center justify-center">
                <Icon className="w-6 h-6 text-[#0B5CFF]" />
              </div>
              <span className="text-sm font-medium text-[#1a1a1a]">{action.label}</span>
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
