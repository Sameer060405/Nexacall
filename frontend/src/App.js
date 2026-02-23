import './App.css';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import LandingPage from './pages/landing';
import Authentication from './pages/authentication';
import { AuthProvider } from './contexts/AuthContext';
import VideoMeetComponent from './pages/VideoMeet';
import HomeComponent from './pages/home';
import History from './pages/history';
import CalendarPage from './pages/calendar';
import RecordingPage from './pages/recording';
import ContactsPage from './pages/contacts';
import WhiteboardsPage from './pages/whiteboards';

function App() {
  return (
    <div className="App">

      <Router>

        <AuthProvider>


          <Routes>

            <Route path='/' element={<LandingPage />} />

            <Route path='/auth' element={<Authentication />} />

            <Route path='/home' element={<HomeComponent />} />
            <Route path='/history' element={<History />} />
            <Route path='/calendar' element={<CalendarPage />} />
            <Route path='/recording' element={<RecordingPage />} />
            <Route path='/contacts' element={<ContactsPage />} />
            <Route path='/whiteboards' element={<WhiteboardsPage />} />
            
            <Route path='/meeting/:code' element={<VideoMeetComponent />} />
            <Route path='/:url' element={<VideoMeetComponent />} />
          </Routes>
        </AuthProvider>

      </Router>
    </div>
  );
}

export default App;
