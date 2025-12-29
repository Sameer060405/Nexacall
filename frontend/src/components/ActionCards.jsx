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
              className="flex-1 bg-white rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow border border-gray-200 flex flex-col items-center gap-2"
            >
              <Icon className="w-8 h-8 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">{action.label}</span>
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

