import React from 'react';
import InvitationCard from './InvitationCard';

const InvitationsList = ({ invitations = [], onRSVP }) => {
  if (invitations.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Invitations</h3>
        <p className="text-gray-500 text-sm text-center py-4">No pending invitations.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">Invitations</h3>
      <div className="space-y-2">
        {invitations.map((invitation, index) => (
          <InvitationCard
            key={invitation.id || index}
            invitation={invitation}
            onRSVP={onRSVP}
          />
        ))}
      </div>
    </div>
  );
};

export default InvitationsList;

