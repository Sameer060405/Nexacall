import React from 'react';
import MeetingCard from './MeetingCard';

const AgendaList = ({ meetings = [], onReschedule, onChangeAttendance, onConnect, onDelete, getMeetingJoinLink, onCopyLink }) => {
  if (meetings.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Your agenda today:</h2>
        <p className="text-gray-500 text-center py-8">No meetings scheduled for today.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Your agenda today:</h2>
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

