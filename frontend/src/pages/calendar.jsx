import React from 'react';
import withAuth from '../utils/withAuth';
import Sidebar from '../components/Sidebar';
import Calendar from '../components/Calendar';

function CalendarPage() {
  const [selectedDate, setSelectedDate] = React.useState(new Date());

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 overflow-y-auto p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Calendar</h1>
        <div className="max-w-4xl">
          <Calendar
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            meetings={[]}
          />
        </div>
      </div>
    </div>
  );
}

export default withAuth(CalendarPage);

