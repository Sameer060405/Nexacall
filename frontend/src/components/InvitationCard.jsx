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
    <div className="flex items-center gap-3 p-3 bg-[#fafbfc] rounded-lg border border-[#e2e8f0]">
      <div className="w-10 h-10 rounded-full bg-[#0B5CFF] flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
        {getInitials(invitation.inviterName)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#1a1a1a]">
          <span className="font-semibold">{invitation.inviterName}</span> invited you to{' '}
          <span className="font-semibold">{invitation.meetingTitle}</span>
        </p>
      </div>
      <button
        onClick={() => onRSVP && onRSVP(invitation)}
        className="px-4 py-2 bg-[#0B5CFF] text-white text-sm font-medium rounded-md hover:bg-[#0047AB] transition-colors flex-shrink-0"
      >
        Accept
      </button>
    </div>
  );
};

export default InvitationCard;
