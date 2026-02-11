import React, { useState } from 'react';

const Calendar = ({ selectedDate, onDateSelect, meetings = [] }) => {
  const [currentDate, setCurrentDate] = useState(selectedDate || new Date());

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    return days;
  };

  const navigateMonth = (direction) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date) => {
    if (!date || !selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const hasMeeting = (date) => {
    if (!date) return false;
    return meetings.some(meeting => {
      const meetingDate = new Date(meeting.date || meeting.startTime);
      return (
        date.getDate() === meetingDate.getDate() &&
        date.getMonth() === meetingDate.getMonth() &&
        date.getFullYear() === meetingDate.getFullYear()
      );
    });
  };

  const days = getDaysInMonth(currentDate);

  return (
    <div className="bg-white rounded-lg border border-[#e2e8f0] p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigateMonth(-1)}
          className="p-1.5 text-[#5e6c84] hover:text-[#1a1a1a] hover:bg-[#f8fafc] rounded-md transition-colors"
        >
          ←
        </button>
        <h3 className="text-sm font-semibold text-[#1a1a1a]">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h3>
        <button
          onClick={() => navigateMonth(1)}
          className="p-1.5 text-[#5e6c84] hover:text-[#1a1a1a] hover:bg-[#f8fafc] rounded-md transition-colors"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(day => (
          <div key={day} className="text-center text-xs font-medium text-[#5e6c84] py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((date, index) => {
          if (!date) {
            return <div key={index} className="aspect-square" />;
          }

          const isTodayDate = isToday(date);
          const isSelectedDate = isSelected(date);
          const hasMeetingOnDate = hasMeeting(date);

          return (
            <button
              key={index}
              onClick={() => onDateSelect && onDateSelect(date)}
              className={`aspect-square rounded-md text-sm font-medium transition-colors ${
                isSelectedDate
                  ? 'bg-[#0B5CFF] text-white'
                  : isTodayDate
                  ? 'bg-[#eff6ff] text-[#0B5CFF]'
                  : 'hover:bg-[#f8fafc] text-[#1a1a1a]'
              } ${hasMeetingOnDate && !isSelectedDate ? 'ring-2 ring-[#0B5CFF]/30' : ''}`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Calendar;
