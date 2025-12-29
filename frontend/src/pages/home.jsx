import React, { useState, useEffect } from 'react';
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

function HomeComponent() {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load today's meetings
      const todayMeetings = await loadTodaysMeetings();
      setMeetings(todayMeetings);

      // Load invitations
      const pendingInvitations = await loadInvitations();
      setInvitations(pendingInvitations);

      // Load metrics
      const dashboardMetrics = await loadMetrics();
      setMetrics(dashboardMetrics);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTodaysMeetings = async () => {
    try {
      const result = await meetingService.getTodaysMeetings();
      if (result.success) {
        // Ensure meetings are sorted by start time
        return result.meetings.sort((a, b) => {
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
      console.log('Scheduling meeting with data:', meetingData);
      const result = await meetingService.createMeeting(meetingData);
      console.log('Meeting creation result:', result);
      if (result.success) {
        // Reload dashboard data to show the new meeting
        await loadDashboardData();
        // Show success message
        alert('Meeting scheduled successfully!');
      } else {
        console.error('Meeting creation failed:', result.error);
        const errorMsg = result.error.includes('404') 
          ? 'Backend server not responding. Please ensure the backend is running on port 8000.'
          : result.error;
        alert(`Failed to schedule meeting: ${errorMsg}`);
      }
    } catch (error) {
      console.error('Error scheduling meeting:', error);
      const errorMsg = error.message?.includes('404') || error.message?.includes('Network Error')
        ? 'Cannot connect to backend server. Please ensure the backend is running on port 8000.'
        : error.message || 'Please try again.';
      alert(`Failed to schedule meeting: ${errorMsg}`);
    }
  };

  const handleReschedule = (meeting) => {
    // TODO: Implement reschedule functionality
    alert(`Reschedule meeting: ${meeting.title}`);
  };

  const handleChangeAttendance = (meeting) => {
    // TODO: Implement change attendance functionality
    alert(`Change attendance for: ${meeting.title}`);
  };

  const handleConnect = (meeting) => {
    // Navigate to the meeting using the meeting code
    if (meeting.meetingCode) {
      navigate(`/${meeting.meetingCode}`);
    } else {
      alert('Meeting code not found');
    }
  };

  const handleRSVP = async (invitation) => {
    try {
      const result = await invitationService.respondToInvitation(invitation.id, 'accepted');
      if (result.success) {
        // Reload invitations
        await loadDashboardData();
      } else {
        alert(`Failed to RSVP: ${result.error}`);
      }
    } catch (error) {
      console.error('Error responding to invitation:', error);
      alert('Failed to RSVP. Please try again.');
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
    </div>
  );
}

export default withAuth(HomeComponent);
