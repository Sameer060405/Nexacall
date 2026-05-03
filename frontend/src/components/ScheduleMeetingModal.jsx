import React, { useState, useEffect } from 'react';
import { XMarkIcon, VideoCameraIcon } from '@heroicons/react/24/solid';
import userService from '../services/user.service';
import contactService from '../services/contact.service';

const ScheduleMeetingModal = ({ isOpen, onClose, onSchedule }) => {
  // ── NexaCall connections (app-level invitations) ─────────────────────────
  const [contacts, setContacts] = useState([]);
  const [inviteContacts, setInviteContacts] = useState(false);
  const [selectedContactIds, setSelectedContactIds] = useState(new Set());
  const [contactsLoading, setContactsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && inviteContacts) {
      setContactsLoading(true);
      userService.getContacts().then((res) => {
        setContactsLoading(false);
        if (res.success) setContacts(res.contacts);
      });
    }
  }, [isOpen, inviteContacts]);

  const toggleContact = (id) => {
    setSelectedContactIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Phone contacts (SMS invitations) ─────────────────────────────────────
  const [phoneContacts, setPhoneContacts] = useState([]);
  const [invitePhone, setInvitePhone] = useState(false);
  const [selectedPhoneIds, setSelectedPhoneIds] = useState(new Set());
  const [phoneLoading, setPhoneLoading] = useState(false);

  useEffect(() => {
    if (isOpen && invitePhone && phoneContacts.length === 0) {
      setPhoneLoading(true);
      contactService.getContacts().then((res) => {
        setPhoneLoading(false);
        if (res.success) setPhoneContacts(res.contacts);
      });
    }
  }, [isOpen, invitePhone]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePhoneContact = (id) => {
    setSelectedPhoneIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllPhone = () => {
    if (selectedPhoneIds.size === phoneContacts.length) {
      setSelectedPhoneIds(new Set());
    } else {
      setSelectedPhoneIds(new Set(phoneContacts.map((c) => c._id)));
    }
  };

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
    confidential: false,
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

    const selectedPhone = phoneContacts.filter((c) => selectedPhoneIds.has(c._id));

    const meetingData = {
      title: formData.topic || 'Scheduled Meeting',
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      meetingCode: meetingCode,
      password: formData.requirePassword ? formData.password : undefined,
      confidential: formData.confidential,
      hostVideo: formData.hostVideo === 'on',
      participantVideo: formData.participantVideo === 'on',
      audio: formData.audio,
      timeZone: formData.timeZone,
      recurring: formData.recurring,
      inviteeIds: inviteContacts ? Array.from(selectedContactIds) : undefined,
      // Phone contacts for SMS invitations (name + phone, not NexaCall users)
      phoneContacts: invitePhone && selectedPhone.length > 0
        ? selectedPhone.map((c) => ({ name: c.name, phone: c.phone }))
        : undefined,
    };

    onSchedule(meetingData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[#e2e8f0]">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-[#eff6ff] flex items-center justify-center">
              <VideoCameraIcon className="w-5 h-5 text-[#0B5CFF]" />
            </div>
            <h2 className="text-base font-semibold text-[#1a1a1a]">Schedule meeting</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#5e6c84] hover:text-[#1a1a1a] hover:bg-[#f8fafc] rounded-md transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-[#1a1a1a] mb-1">Schedule Meeting</h3>
            <p className="text-sm text-[#5e6c84]">Set date, time, and meeting options.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1a1a1a] mb-2">
              Topic
            </label>
            <input
              type="text"
              value={formData.topic}
              onChange={(e) => handleChange('topic', e.target.value)}
              placeholder="e.g. Team standup"
              className="w-full px-3 py-2 border border-[#dfe1e6] rounded-md bg-[#fafbfc] text-[#1a1a1a] placeholder-[#5e6c84] focus:outline-none focus:border-[#0B5CFF] focus:ring-1 focus:ring-[#0B5CFF]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1a1a1a] mb-2">
                Start
              </label>
              <div className="space-y-2">
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 border border-[#dfe1e6] rounded-md bg-[#fafbfc] focus:outline-none focus:border-[#0B5CFF] focus:ring-1 focus:ring-[#0B5CFF]"
                />
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => handleChange('startTime', e.target.value)}
                  className="w-full px-3 py-2 border border-[#dfe1e6] rounded-md bg-[#fafbfc] focus:outline-none focus:border-[#0B5CFF] focus:ring-1 focus:ring-[#0B5CFF]"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1a1a1a] mb-2">
                Duration
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={formData.durationHours}
                  onChange={(e) => handleChange('durationHours', e.target.value)}
                  className="px-3 py-2 border border-[#dfe1e6] rounded-md bg-[#fafbfc] focus:outline-none focus:border-[#0B5CFF]"
                >
                  {hourOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <select
                  value={formData.durationMinutes}
                  onChange={(e) => handleChange('durationMinutes', e.target.value)}
                  className="px-3 py-2 border border-[#dfe1e6] rounded-md bg-[#fafbfc] focus:outline-none focus:border-[#0B5CFF]"
                >
                  {minuteOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.recurring}
                onChange={(e) => handleChange('recurring', e.target.checked)}
                className="w-4 h-4 text-[#0B5CFF] border-[#dfe1e6] rounded focus:ring-[#0B5CFF]"
              />
              <span className="text-sm text-[#1a1a1a]">Recurring meeting</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#5e6c84]">Time zone</span>
              <select
                value={formData.timeZone}
                onChange={(e) => handleChange('timeZone', e.target.value)}
                className="px-3 py-2 border border-[#dfe1e6] rounded-md bg-[#fafbfc] focus:outline-none focus:border-[#0B5CFF] text-sm"
              >
                {timeZones.map(tz => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[#1a1a1a] mb-3">Meeting ID</h4>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="meetingIdType"
                  value="auto"
                  checked={formData.meetingIdType === 'auto'}
                  onChange={(e) => handleChange('meetingIdType', e.target.value)}
                  className="w-4 h-4 text-[#0B5CFF] border-[#dfe1e6] focus:ring-[#0B5CFF]"
                />
                <span className="text-sm text-[#1a1a1a]">Generate automatically</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="meetingIdType"
                  value="personal"
                  checked={formData.meetingIdType === 'personal'}
                  onChange={(e) => handleChange('meetingIdType', e.target.value)}
                  className="w-4 h-4 text-[#0B5CFF] border-[#dfe1e6] focus:ring-[#0B5CFF]"
                />
                <span className="text-sm text-[#1a1a1a]">Personal meeting ID</span>
              </label>
              {formData.meetingIdType === 'personal' && (
                <div className="flex items-center gap-2 ml-6">
                  <input
                    type="text"
                    value={formData.personalMeetingId}
                    onChange={(e) => handleChange('personalMeetingId', e.target.value)}
                    placeholder="Enter or generate code"
                    className="flex-1 px-3 py-2 border border-[#dfe1e6] rounded-md bg-[#fafbfc] focus:outline-none focus:border-[#0B5CFF] focus:ring-1 focus:ring-[#0B5CFF] text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateCode}
                    className="px-4 py-2 bg-[#f8fafc] text-[#5e6c84] border border-[#e2e8f0] rounded-md hover:bg-[#f1f5f9] transition-colors text-sm font-medium"
                  >
                    Generate
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[#1a1a1a] mb-3">Password</h4>
            <label className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={formData.requirePassword}
                onChange={(e) => handleChange('requirePassword', e.target.checked)}
                className="w-4 h-4 text-[#0B5CFF] border-[#dfe1e6] rounded focus:ring-[#0B5CFF]"
              />
              <span className="text-sm text-[#1a1a1a]">Require meeting password</span>
            </label>
            {formData.requirePassword && (
              <input
                type="text"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder="Enter password"
                className="w-full px-3 py-2 border border-[#dfe1e6] rounded-md bg-[#fafbfc] focus:outline-none focus:border-[#0B5CFF] focus:ring-1 focus:ring-[#0B5CFF] text-sm"
              />
            )}
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[#1a1a1a] mb-3">Security</h4>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#1a1a1a]">Confidential meeting</p>
                <p className="text-xs text-[#5e6c84]">Participants must be logged in to join</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={formData.confidential}
                onClick={() => handleChange('confidential', !formData.confidential)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#0B5CFF] focus:ring-offset-2 ${formData.confidential ? 'bg-[#0B5CFF]' : 'bg-[#dfe1e6]'}`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formData.confidential ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[#1a1a1a] mb-3">Video</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[#5e6c84] mb-2">Host</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="hostVideo" value="on" checked={formData.hostVideo === 'on'} onChange={(e) => handleChange('hostVideo', e.target.value)} className="w-4 h-4 text-[#0B5CFF] border-[#dfe1e6] focus:ring-[#0B5CFF]" />
                    <span className="text-sm text-[#1a1a1a]">On</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="hostVideo" value="off" checked={formData.hostVideo === 'off'} onChange={(e) => handleChange('hostVideo', e.target.value)} className="w-4 h-4 text-[#0B5CFF] border-[#dfe1e6] focus:ring-[#0B5CFF]" />
                    <span className="text-sm text-[#1a1a1a]">Off</span>
                  </label>
                </div>
              </div>
              <div>
                <p className="text-xs text-[#5e6c84] mb-2">Participants</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="participantVideo" value="on" checked={formData.participantVideo === 'on'} onChange={(e) => handleChange('participantVideo', e.target.value)} className="w-4 h-4 text-[#0B5CFF] border-[#dfe1e6] focus:ring-[#0B5CFF]" />
                    <span className="text-sm text-[#1a1a1a]">On</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="participantVideo" value="off" checked={formData.participantVideo === 'off'} onChange={(e) => handleChange('participantVideo', e.target.value)} className="w-4 h-4 text-[#0B5CFF] border-[#dfe1e6] focus:ring-[#0B5CFF]" />
                    <span className="text-sm text-[#1a1a1a]">Off</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[#1a1a1a] mb-3">Audio</h4>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input type="radio" name="audio" value="telephone" checked={formData.audio === 'telephone'} onChange={(e) => handleChange('audio', e.target.value)} className="w-4 h-4 text-[#0B5CFF] border-[#dfe1e6] focus:ring-[#0B5CFF]" />
                <span className="text-sm text-[#1a1a1a]">Telephone</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="audio" value="computer" checked={formData.audio === 'computer'} onChange={(e) => handleChange('audio', e.target.value)} className="w-4 h-4 text-[#0B5CFF] border-[#dfe1e6] focus:ring-[#0B5CFF]" />
                <span className="text-sm text-[#1a1a1a]">Computer audio</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="audio" value="both" checked={formData.audio === 'both'} onChange={(e) => handleChange('audio', e.target.value)} className="w-4 h-4 text-[#0B5CFF] border-[#dfe1e6] focus:ring-[#0B5CFF]" />
                <span className="text-sm text-[#1a1a1a]">Telephone and computer audio</span>
              </label>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[#1a1a1a] mb-3">Invite contacts</h4>
            <label className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={inviteContacts}
                onChange={(e) => {
                  setInviteContacts(e.target.checked);
                  if (!e.target.checked) setSelectedContactIds(new Set());
                }}
                className="w-4 h-4 text-[#0B5CFF] border-[#dfe1e6] rounded focus:ring-[#0B5CFF]"
              />
              <span className="text-sm text-[#1a1a1a]">Invite contacts to this meeting</span>
            </label>
            {inviteContacts && (
              <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-3 max-h-40 overflow-y-auto">
                {contactsLoading ? (
                  <p className="text-xs text-[#5e6c84] py-2">Loading contacts...</p>
                ) : contacts.length === 0 ? (
                  <p className="text-xs text-[#5e6c84] py-2">No contacts. Add contacts from the Contacts page.</p>
                ) : (
                  <div className="space-y-2">
                    {contacts.map((c) => (
                      <label key={c._id} className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-white/60 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedContactIds.has(c._id)}
                          onChange={() => toggleContact(c._id)}
                          className="w-4 h-4 text-[#0B5CFF] border-[#dfe1e6] rounded focus:ring-[#0B5CFF]"
                        />
                        <div className="w-8 h-8 rounded-full bg-[#0B5CFF]/10 flex items-center justify-center text-xs font-bold text-[#0B5CFF]">
                          {(c.username || '??').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#1a1a1a]">{c.username}</p>
                          <p className="text-xs text-[#5e6c84]">{c.email}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                {inviteContacts && selectedContactIds.size > 0 && (
                  <p className="text-xs text-[#5e6c84] mt-2 pt-2 border-t border-[#e2e8f0]">
                    {selectedContactIds.size} contact{selectedContactIds.size !== 1 ? 's' : ''} selected
                  </p>
                )}
              </div>
            )}
          </div>

          {/* SMS Invites — phone contacts */}
          <div>
            <h4 className="text-sm font-semibold text-[#1a1a1a] mb-3">SMS invitations</h4>
            <label className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={invitePhone}
                onChange={(e) => {
                  setInvitePhone(e.target.checked);
                  if (!e.target.checked) setSelectedPhoneIds(new Set());
                }}
                className="w-4 h-4 text-[#0B5CFF] border-[#dfe1e6] rounded focus:ring-[#0B5CFF]"
              />
              <span className="text-sm text-[#1a1a1a]">Send SMS to phone contacts</span>
            </label>
            {invitePhone && (
              <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-3 max-h-48 overflow-y-auto">
                {phoneLoading ? (
                  <p className="text-xs text-[#5e6c84] py-2">Loading contacts...</p>
                ) : phoneContacts.length === 0 ? (
                  <p className="text-xs text-[#5e6c84] py-2">No phone contacts. Add them from the Contacts page.</p>
                ) : (
                  <>
                    {/* Select All row */}
                    <label className="flex items-center gap-3 py-1.5 px-2 mb-1 rounded hover:bg-white/60 cursor-pointer border-b border-[#e2e8f0]">
                      <input
                        type="checkbox"
                        checked={selectedPhoneIds.size === phoneContacts.length && phoneContacts.length > 0}
                        onChange={selectAllPhone}
                        className="w-4 h-4 text-[#0B5CFF] border-[#dfe1e6] rounded focus:ring-[#0B5CFF]"
                      />
                      <span className="text-sm font-medium text-[#1a1a1a]">Select all</span>
                    </label>

                    <div className="space-y-1">
                      {phoneContacts.map((c) => (
                        <label key={c._id} className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-white/60 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedPhoneIds.has(c._id)}
                            onChange={() => togglePhoneContact(c._id)}
                            className="w-4 h-4 text-[#0B5CFF] border-[#dfe1e6] rounded focus:ring-[#0B5CFF]"
                          />
                          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-700 flex-shrink-0">
                            {(c.name || '??').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#1a1a1a] truncate">{c.name}</p>
                            <p className="text-xs text-[#5e6c84] truncate">{c.phone}</p>
                          </div>
                        </label>
                      ))}
                    </div>

                    {selectedPhoneIds.size > 0 && (
                      <p className="text-xs text-emerald-600 mt-2 pt-2 border-t border-[#e2e8f0]">
                        SMS will be sent to {selectedPhoneIds.size} contact{selectedPhoneIds.size !== 1 ? 's' : ''}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[#1a1a1a] mb-3">Calendar</h4>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input type="radio" name="calendar" value="outlook" checked={formData.calendar === 'outlook'} onChange={(e) => handleChange('calendar', e.target.value)} className="w-4 h-4 text-[#0B5CFF] border-[#dfe1e6] focus:ring-[#0B5CFF]" />
                <span className="text-sm text-[#1a1a1a]">Outlook</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="calendar" value="google" checked={formData.calendar === 'google'} onChange={(e) => handleChange('calendar', e.target.value)} className="w-4 h-4 text-[#0B5CFF] border-[#dfe1e6] focus:ring-[#0B5CFF]" />
                <span className="text-sm text-[#1a1a1a]">Google Calendar</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="calendar" value="other" checked={formData.calendar === 'other'} onChange={(e) => handleChange('calendar', e.target.value)} className="w-4 h-4 text-[#0B5CFF] border-[#dfe1e6] focus:ring-[#0B5CFF]" />
                <span className="text-sm text-[#1a1a1a]">Other</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#e2e8f0]">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 border border-[#e2e8f0] rounded-md text-[#5e6c84] hover:bg-[#f8fafc] transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#0B5CFF] text-white rounded-md hover:bg-[#0047AB] transition-colors text-sm font-medium"
            >
              Schedule meeting
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScheduleMeetingModal;

