import React from 'react';
import MeetingCard from './MeetingCard';

const AgendaList = ({ meetings = [], onReschedule, onChangeAttendance, onConnect, onDelete, getMeetingJoinLink, onCopyLink }) => {
  if (meetings.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-[#e2e8f0] p-6">
        <h2 className="text-base font-semibold text-[#1a1a1a] mb-4">Your agenda today</h2>
        <p className="text-[#5e6c84] text-sm text-center py-8">No meetings scheduled for today.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-[#e2e8f0] p-6">
      <h2 className="text-base font-semibold text-[#1a1a1a] mb-4">Your agenda today</h2>
      <div className="space-y-3">
        {meetings.map((meeting, index) => (
          <MeetingCard
            key={meeting._id || meeting.id || index}
            meeting={meeting}
            onReschedule={onReschedule}
            onChangeAttendance={onChangeAttendance}
            onConnect={onConnect}
            onDelete={onDelete}
            getMeetingJoinLink={getMeetingJoinLink}
            onCopyLink={onCopyLink}
          />
        ))}
      </div>
    </div>
  );
};

export default AgendaList;
