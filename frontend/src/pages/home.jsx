import React, { useState, useEffect, useRef } from 'react';
import withAuth from '../utils/withAuth';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import UserProfile from '../components/UserProfile';
import ActionCards from '../components/ActionCards';
import AgendaList from '../components/AgendaList';
import Calendar from '../components/Calendar';
import InvitationsList from '../components/InvitationsList';
import Insights from '../components/Insights';
import meetingService from '../services/meeting.service';
import invitationService from '../services/invitation.service';
import { useToast } from '../contexts/ToastContext';

function HomeComponent() {
  const navigate = useNavigate();
  const toast = useToast();
  const [meetings, setMeetings] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [createdMeetingSuccess, setCreatedMeetingSuccess] = useState(null);
  const lastCreatedMeetingRef = useRef(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);

      const todayMeetings = await loadTodaysMeetings();
      setMeetings(todayMeetings);

      const toMerge = lastCreatedMeetingRef.current;
      if (toMerge && (toMerge._id || toMerge.id)) {
        const id = toMerge._id || toMerge.id;
        const inApi = todayMeetings.some((m) => (m._id || m.id) === id);
        if (inApi) {
          lastCreatedMeetingRef.current = null;
        } else {
          setMeetings((prev) => {
            const exists = prev.some((m) => (m._id || m.id) === id);
            if (exists) return prev;
            return [...prev, toMerge].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
          });
        }
      }

      const pendingInvitations = await loadInvitations();
      setInvitations(pendingInvitations);

      const dashboardMetrics = await loadMetrics();
      setMetrics(dashboardMetrics);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const loadTodaysMeetings = async () => {
    try {
      const result = await meetingService.getTodaysMeetings();
      if (result.success) {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
        const todayOnly = result.meetings.filter((m) => {
          const t = new Date(m.startTime).getTime();
          return t >= startOfToday.getTime() && t < endOfToday.getTime();
        });
        return todayOnly.sort((a, b) => {
          const dateA = new Date(a.startTime);
          const dateB = new Date(b.startTime);
          return dateA - dateB;
        });
      }
      console.error('Failed to load meetings:', result.error);
      return [];
    } catch (error) {
      console.error('Error loading meetings:', error);
      return [];
    }
  };

  const loadInvitations = async () => {
    try {
      const result = await invitationService.getInvitations('pending');
      if (result.success) {
        return result.invitations;
      }
      return [];
    } catch (error) {
      console.error('Error loading invitations:', error);
      return [];
    }
  };

  const loadMetrics = async () => {
    try {
      const result = await meetingService.getMetrics();
      if (result.success) {
        return result.metrics;
      }
      return {};
    } catch (error) {
      console.error('Error loading metrics:', error);
      return {};
    }
  };

  const handleScheduleMeeting = async (meetingData) => {
    try {
      const result = await meetingService.createMeeting(meetingData);
      if (result.success) {
        const newMeeting = result.meeting;
        if (!newMeeting || (!newMeeting._id && !newMeeting.id)) {
          await loadDashboardData();
          setCreatedMeetingSuccess(newMeeting || { meetingCode: 'Created' });
          return;
        }
        lastCreatedMeetingRef.current = newMeeting;
        setMeetings((prev) => {
          const id = newMeeting._id || newMeeting.id;
          const exists = prev.some((m) => (m._id || m.id) === id);
          const next = exists ? prev : [...prev, newMeeting];
          return next.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
        });
        await loadDashboardData();
        setMeetings((prev) => {
          const id = newMeeting._id || newMeeting.id;
          const exists = prev.some((m) => (m._id || m.id) === id);
          if (exists) return prev;
          return [...prev, newMeeting].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
        });
        setCreatedMeetingSuccess(newMeeting);
      } else {
        const errorMsg = result.error?.includes('404')
          ? 'Backend server not responding. Please ensure the backend is running on port 8000.'
          : result.error;
        toast.error(`Failed to schedule meeting: ${errorMsg}`);
      }
    } catch (error) {
      console.error('Error scheduling meeting:', error);
      const errorMsg = error.message?.includes('404') || error.message?.includes('Network Error')
        ? 'Cannot connect to backend server. Please ensure the backend is running on port 8000.'
        : error.message || 'Please try again.';
      toast.error(`Failed to schedule meeting: ${errorMsg}`);
    }
  };

  const handleDeleteMeeting = async (meeting) => {
    if (!window.confirm(`Delete meeting "${meeting.title}"? This cannot be undone.`)) return;
    try {
      const result = await meetingService.deleteMeeting(meeting._id);
      if (result.success) {
        await loadDashboardData();
        toast.success('Meeting deleted');
      } else {
        toast.error(`Failed to delete meeting: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting meeting:', error);
      toast.error('Failed to delete meeting. Please try again.');
    }
  };

  const handleReschedule = (meeting) => {
    toast.info(`Reschedule coming soon: ${meeting.title}`);
  };

  const handleChangeAttendance = (meeting) => {
    toast.info(`Change attendance coming soon: ${meeting.title}`);
  };

  const handleConnect = (meeting) => {
    if (meeting.meetingCode) {
      navigate(`/${meeting.meetingCode}`);
    } else {
      toast.error('Meeting code not found');
    }
  };

  const getMeetingJoinLink = (code) => {
    if (typeof window === 'undefined' || !code) return '';
    return `${window.location.origin}/${code}`;
  };

  const copyMeetingLink = (code) => {
    const link = getMeetingJoinLink(code);
    if (link && navigator.clipboard) {
      navigator.clipboard.writeText(link).then(() => toast.success('Link copied to clipboard'));
    }
  };

  const handleRSVP = async (invitation) => {
    try {
      const result = await invitationService.respondToInvitation(invitation.id, 'accepted');
      if (result.success) {
        await loadDashboardData();
        toast.success('Invitation accepted');
      } else {
        toast.error(`Failed to RSVP: ${result.error}`);
      }
    } catch (error) {
      console.error('Error responding to invitation:', error);
      toast.error('Failed to RSVP. Please try again.');
    }
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    // TODO: Load meetings for selected date
  };

  if (loading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-8">
          {/* Top Section: Greeting and Action Cards */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <UserProfile />
            </div>
            <ActionCards onScheduleMeeting={handleScheduleMeeting} />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Agenda */}
            <div className="lg:col-span-2">
              <AgendaList
                meetings={meetings}
                onReschedule={handleReschedule}
                onChangeAttendance={handleChangeAttendance}
                onConnect={handleConnect}
                onDelete={handleDeleteMeeting}
                getMeetingJoinLink={getMeetingJoinLink}
                onCopyLink={copyMeetingLink}
              />
            </div>

            {/* Right Column: Calendar, Invitations, Insights */}
            <div className="space-y-6">
              <Calendar
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
                meetings={meetings}
              />
              <InvitationsList
                invitations={invitations}
                onRSVP={handleRSVP}
              />
              <Insights metrics={metrics} />
            </div>
          </div>
        </div>
      </div>

      {/* Meeting created success modal: link + join code */}
      {createdMeetingSuccess && createdMeetingSuccess.meetingCode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Meeting created</h3>
            <p className="text-sm text-gray-600 mb-4">Share the link or joining code with participants. If you set a password, they will be asked for it when they join.</p>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Joining code</label>
                <p className="font-mono text-lg font-semibold text-gray-800">{createdMeetingSuccess.meetingCode}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Meeting link</label>
                <p className="text-sm text-gray-700 break-all">{getMeetingJoinLink(createdMeetingSuccess.meetingCode)}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => copyMeetingLink(createdMeetingSuccess.meetingCode)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                Copy link
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreatedMeetingSuccess(null);
                  loadDashboardData(false);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default withAuth(HomeComponent);
