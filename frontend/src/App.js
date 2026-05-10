import React from 'react';
import './App.css';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import LandingPage from './pages/landing';
import Authentication from './pages/authentication';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { CallProvider } from './contexts/CallContext';
import IncomingCallModal, { OutgoingCallOverlay } from './components/IncomingCallModal';
import VideoMeetComponent from './pages/VideoMeet';
import HomeComponent from './pages/home';
import History from './pages/history';
import CalendarPage from './pages/calendar';
import RecordingPage from './pages/recording';
import ContactsPage from './pages/contacts';
import CallsPage from './pages/calls';
import WhiteboardsPage from './pages/whiteboards';

// Catches any unhandled render/lifecycle error inside VideoMeet so the entire
// app doesn't go blank — instead shows a "something went wrong" fallback.
class VideoCallErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[VideoCall] Crash caught by error boundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100vh',
          background: '#1C1E2B', color: 'white', gap: '16px', fontFamily: 'sans-serif'
        }}>
          <p style={{ fontSize: '18px', fontWeight: 600 }}>The call ran into a problem.</p>
          <p style={{ color: '#9ca3af', fontSize: '13px' }}>{this.state.error?.message}</p>
          <button
            onClick={() => { window.location.href = '/home'; }}
            style={{
              marginTop: '8px', padding: '10px 24px', borderRadius: '10px',
              background: '#3b82f6', color: 'white', border: 'none',
              cursor: 'pointer', fontSize: '14px', fontWeight: 600
            }}
          >
            Go back home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <div className="App">
      <Router>
        <AuthProvider>
          <ToastProvider>
            <CallProvider>
            <IncomingCallModal />
            <OutgoingCallOverlay />
            <Routes>
              <Route path='/' element={<LandingPage />} />
              <Route path='/auth' element={<Authentication />} />
              <Route path='/home' element={<HomeComponent />} />
              <Route path='/history' element={<History />} />
              <Route path='/calendar' element={<CalendarPage />} />
              <Route path='/recording' element={<RecordingPage />} />
              <Route path='/calls' element={<CallsPage />} />
              <Route path='/contacts' element={<ContactsPage />} />
              <Route path='/whiteboards' element={<WhiteboardsPage />} />

              <Route path='/meeting/:code' element={
                <VideoCallErrorBoundary>
                  <VideoMeetComponent />
                </VideoCallErrorBoundary>
              } />
              <Route path='/:url' element={
                <VideoCallErrorBoundary>
                  <VideoMeetComponent />
                </VideoCallErrorBoundary>
              } />
            </Routes>
            </CallProvider>
          </ToastProvider>
        </AuthProvider>
      </Router>
    </div>
  );
}

export default App;
