import React from 'react';

const InvitationCard = ({ invitation, onRSVP }) => {
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
      <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
        {getInitials(invitation.inviterName)}
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-800">
          <span className="font-semibold">{invitation.inviterName}</span> invited you to{' '}
          <span className="font-semibold">{invitation.meetingTitle}</span>
        </p>
      </div>
      <button
        onClick={() => onRSVP && onRSVP(invitation)}
        className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
      >
        RSVP
      </button>
    </div>
  );
};

export default InvitationCard;

