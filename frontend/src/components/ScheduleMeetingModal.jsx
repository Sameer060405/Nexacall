import React, { useState } from 'react';
import { XMarkIcon, VideoCameraIcon } from '@heroicons/react/24/solid';

const ScheduleMeetingModal = ({ isOpen, onClose, onSchedule }) => {
  const [formData, setFormData] = useState({
    topic: '',
    startDate: new Date().toISOString().split('T')[0],
    startTime: '11:00',
    durationHours: '0',
    durationMinutes: '30',
    recurring: false,
    timeZone: 'Asia/Kolkata',
    meetingIdType: 'auto',
    personalMeetingId: '',
    requirePassword: true,
    password: '',
    hostVideo: 'off',
    participantVideo: 'off',
    audio: 'both',
    calendar: 'outlook',
  });

  const timeZones = [
    { value: 'Asia/Kolkata', label: 'Mumbai, Kolkata, New Delhi' },
    { value: 'Asia/Shanghai', label: 'Beijing, Shanghai' },
    { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
    { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
    { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
    { value: 'Europe/London', label: 'London' },
    { value: 'Europe/Paris', label: 'Paris' },
    { value: 'Asia/Tokyo', label: 'Tokyo' },
    { value: 'Asia/Dubai', label: 'Dubai' },
    { value: 'Australia/Sydney', label: 'Sydney' },
  ];

  const hourOptions = Array.from({ length: 24 }, (_, i) => ({
    value: i.toString(),
    label: `${i} hour${i !== 1 ? 's' : ''}`,
  }));

  const minuteOptions = [
    { value: '0', label: '0 minutes' },
    { value: '15', label: '15 minutes' },
    { value: '30', label: '30 minutes' },
    { value: '45', label: '45 minutes' },
  ];

  const generateRandomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleGenerateCode = () => {
    const code = generateRandomCode();
    handleChange('personalMeetingId', code);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Calculate end time
    const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
    const durationMs = (parseInt(formData.durationHours) * 60 + parseInt(formData.durationMinutes)) * 60 * 1000;
    const endDateTime = new Date(startDateTime.getTime() + durationMs);

    // Generate meeting code if auto, otherwise use personal
    const meetingCode = formData.meetingIdType === 'auto' 
      ? generateRandomCode() 
      : formData.personalMeetingId;

    const meetingData = {
      title: formData.topic || 'Scheduled Meeting',
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      meetingCode: meetingCode,
      password: formData.requirePassword ? formData.password : undefined,
      hostVideo: formData.hostVideo === 'on',
      participantVideo: formData.participantVideo === 'on',
      audio: formData.audio,
      timeZone: formData.timeZone,
      recurring: formData.recurring,
    };

    onSchedule(meetingData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <VideoCameraIcon className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-800">Schedule meeting</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Schedule Meeting</h1>
          </div>

          {/* Topic */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Topic
            </label>
            <input
              type="text"
              value={formData.topic}
              onChange={(e) => handleChange('topic', e.target.value)}
              placeholder="Filmora Team Zoom Meeting"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Start Time and Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start:
              </label>
              <div className="space-y-2">
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => handleChange('startTime', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={formData.durationHours}
                  onChange={(e) => handleChange('durationHours', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {hourOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <select
                  value={formData.durationMinutes}
                  onChange={(e) => handleChange('durationMinutes', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {minuteOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Recurring Meeting & Time Zone */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.recurring}
                onChange={(e) => handleChange('recurring', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Recurring meeting</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">Time Zone:</span>
              <select
                value={formData.timeZone}
                onChange={(e) => handleChange('timeZone', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {timeZones.map(tz => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Meeting ID */}
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Meeting ID</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="meetingIdType"
                  value="auto"
                  checked={formData.meetingIdType === 'auto'}
                  onChange={(e) => handleChange('meetingIdType', e.target.value)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Generate Automatically</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="meetingIdType"
                  value="personal"
                  checked={formData.meetingIdType === 'personal'}
                  onChange={(e) => handleChange('meetingIdType', e.target.value)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Personal Meeting ID</span>
              </label>
              {formData.meetingIdType === 'personal' && (
                <div className="flex items-center gap-2 ml-6">
                  <input
                    type="text"
                    value={formData.personalMeetingId}
                    onChange={(e) => handleChange('personalMeetingId', e.target.value)}
                    placeholder="Enter or generate code"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateCode}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                  >
                    Generate
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Password */}
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Password</h3>
            <label className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={formData.requirePassword}
                onChange={(e) => handleChange('requirePassword', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Require meeting password</span>
            </label>
            {formData.requirePassword && (
              <input
                type="text"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder="010895"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            )}
          </div>

          {/* Video */}
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Video</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-600 mb-2">Host</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="hostVideo"
                      value="on"
                      checked={formData.hostVideo === 'on'}
                      onChange={(e) => handleChange('hostVideo', e.target.value)}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">On</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="hostVideo"
                      value="off"
                      checked={formData.hostVideo === 'off'}
                      onChange={(e) => handleChange('hostVideo', e.target.value)}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Off</span>
                  </label>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-2">Participants</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="participantVideo"
                      value="on"
                      checked={formData.participantVideo === 'on'}
                      onChange={(e) => handleChange('participantVideo', e.target.value)}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">On</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="participantVideo"
                      value="off"
                      checked={formData.participantVideo === 'off'}
                      onChange={(e) => handleChange('participantVideo', e.target.value)}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Off</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Audio */}
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Audio</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="audio"
                  value="telephone"
                  checked={formData.audio === 'telephone'}
                  onChange={(e) => handleChange('audio', e.target.value)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Telephone</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="audio"
                  value="computer"
                  checked={formData.audio === 'computer'}
                  onChange={(e) => handleChange('audio', e.target.value)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Computer Audio</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="audio"
                  value="both"
                  checked={formData.audio === 'both'}
                  onChange={(e) => handleChange('audio', e.target.value)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Telephone and Computer Audio</span>
              </label>
            </div>
          </div>

          {/* Calendar */}
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Calendar</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="calendar"
                  value="outlook"
                  checked={formData.calendar === 'outlook'}
                  onChange={(e) => handleChange('calendar', e.target.value)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Outlook</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="calendar"
                  value="google"
                  checked={formData.calendar === 'google'}
                  onChange={(e) => handleChange('calendar', e.target.value)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Google Calendar</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="calendar"
                  value="other"
                  checked={formData.calendar === 'other'}
                  onChange={(e) => handleChange('calendar', e.target.value)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Other Calendars</span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScheduleMeetingModal;

