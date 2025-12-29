import React from 'react';
import withAuth from '../utils/withAuth';
import Sidebar from '../components/Sidebar';

function ContactsPage() {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 overflow-y-auto p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Contacts</h1>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-600">Contacts feature coming soon!</p>
        </div>
      </div>
    </div>
  );
}

export default withAuth(ContactsPage);

