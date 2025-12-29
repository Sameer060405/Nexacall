import React from 'react';

const MeetingCard = ({ meeting, onReschedule, onChangeAttendance, onConnect }) => {
  const formatTime = (timeString) => {
    if (!timeString) return '';
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const formatTimeRange = (start, end) => {
    const startTime = formatTime(start);
    const endTime = formatTime(end);
    return `${startTime} - ${endTime}`;
  };

  const isScheduledMeeting = meeting.meetingCode && meeting.status === 'scheduled';

  return (
    <div className="bg-white rounded-lg p-4 shadow-md border border-gray-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-800 mb-1">{meeting.title || 'Meeting'}</h3>
          <p className="text-sm text-gray-600">
            {formatTimeRange(meeting.startTime, meeting.endTime)}
          </p>
          {meeting.meetingCode && (
            <p className="text-xs text-gray-500 mt-1">Code: {meeting.meetingCode}</p>
          )}
        </div>
        <div className="flex gap-2">
          {isScheduledMeeting && onConnect ? (
            <button
              onClick={() => onConnect(meeting)}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Connect
            </button>
          ) : (
            <>
              <button
                onClick={() => onReschedule && onReschedule(meeting)}
                className="px-3 py-1 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
              >
                Reschedule
              </button>
              <button
                onClick={() => onChangeAttendance && onChangeAttendance(meeting)}
                className="px-3 py-1 bg-white text-gray-700 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Change attendance
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MeetingCard;

