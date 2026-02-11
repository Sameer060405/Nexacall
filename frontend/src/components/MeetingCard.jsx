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
    <div className="bg-white rounded-lg p-4 border border-[#e2e8f0] hover:border-[#dfe1e6] transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[#1a1a1a] text-[0.9375rem] mb-1">{meeting.title || 'Meeting'}</h3>
          <p className="text-sm text-[#5e6c84]">
            {formatTimeRange(meeting.startTime, meeting.endTime)}
          </p>
          {meeting.meetingCode && (
            <div className="mt-2 space-y-1">
              <p className="text-xs text-[#5e6c84]">
                <span className="font-medium text-[#1a1a1a]">Code:</span>{' '}
                <span className="font-mono">{meeting.meetingCode}</span>
              </p>
              {joinLink && (
                <p className="text-xs text-[#5e6c84] truncate" title={joinLink}>
                  <span className="font-medium text-[#1a1a1a]">Link:</span> {joinLink}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
          {isScheduledMeeting && onConnect && (
            <button
              onClick={() => onConnect(meeting)}
              className="px-4 py-2 bg-[#0B5CFF] text-white text-sm font-medium rounded-md hover:bg-[#0047AB] transition-colors"
            >
              Join
            </button>
          )}
          {isScheduledMeeting && onCopyLink && meeting.meetingCode && (
            <button
              onClick={() => onCopyLink(meeting.meetingCode)}
              className="px-3 py-2 text-sm rounded-md border border-[#e2e8f0] text-[#5e6c84] hover:bg-[#f8fafc] flex items-center gap-1.5"
              title="Copy meeting link"
            >
              <LinkIcon className="w-4 h-4" />
              Copy link
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(meeting)}
              className="px-3 py-2 text-sm rounded-md border border-[#fecaca] text-[#dc2626] hover:bg-[#fef2f2] flex items-center gap-1.5"
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
                  className="px-3 py-2 bg-[#0B5CFF] text-white text-sm font-medium rounded-md hover:bg-[#0047AB] transition-colors"
                >
                  Reschedule
                </button>
              )}
              {onChangeAttendance && (
                <button
                  onClick={() => onChangeAttendance(meeting)}
                  className="px-3 py-2 text-sm rounded-md border border-[#e2e8f0] text-[#5e6c84] hover:bg-[#f8fafc] transition-colors"
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
