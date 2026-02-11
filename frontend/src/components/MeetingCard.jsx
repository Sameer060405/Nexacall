import React from 'react';
import { LinkIcon, TrashIcon } from '@heroicons/react/24/outline';

const MeetingCard = ({ meeting, onReschedule, onChangeAttendance, onConnect, onDelete, getMeetingJoinLink, onCopyLink }) => {
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
  const joinLink = getMeetingJoinLink ? getMeetingJoinLink(meeting.meetingCode) : '';

  return (
    <div className="bg-white rounded-lg p-4 shadow-md border border-gray-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-800 mb-1">{meeting.title || 'Meeting'}</h3>
          <p className="text-sm text-gray-600">
            {formatTimeRange(meeting.startTime, meeting.endTime)}
          </p>
          {meeting.meetingCode && (
            <div className="mt-2 space-y-1">
              <p className="text-xs text-gray-500">
                <span className="font-medium text-gray-600">Joining code:</span> <span className="font-mono">{meeting.meetingCode}</span>
              </p>
              {joinLink && (
                <p className="text-xs text-gray-500 truncate" title={joinLink}>
                  <span className="font-medium text-gray-600">Link:</span> {joinLink}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
          {isScheduledMeeting && onConnect && (
            <button
              onClick={() => onConnect(meeting)}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Connect
            </button>
          )}
          {isScheduledMeeting && onCopyLink && meeting.meetingCode && (
            <button
              onClick={() => onCopyLink(meeting.meetingCode)}
              className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-1"
              title="Copy meeting link"
            >
              <LinkIcon className="w-4 h-4" />
              Copy link
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(meeting)}
              className="px-3 py-2 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-1"
              title="Delete meeting"
            >
              <TrashIcon className="w-4 h-4" />
              Delete
            </button>
          )}
          {!isScheduledMeeting && (
            <>
              {onReschedule && (
                <button
                  onClick={() => onReschedule(meeting)}
                  className="px-3 py-1 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Reschedule
                </button>
              )}
              {onChangeAttendance && (
                <button
                  onClick={() => onChangeAttendance(meeting)}
                  className="px-3 py-1 bg-white text-gray-700 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  Change attendance
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MeetingCard;

