import React, { useState, useEffect, useCallback } from 'react';
import { UserProvider, useUser } from './contexts/UserContext';
import Login from './components/Login';
import MeetingList from './components/MeetingList';
import TranscriptViewer from './components/TranscriptViewer';
import API from './utils/api';
import './App.css';

function AppContent() {
  const { user } = useUser();
  const [meetings, setMeetings] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadMeetings = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const userMeetings = await API.getUserMeetings(user);
      setMeetings(userMeetings);
      setError(null);
    } catch (err) {
      setError('Failed to load meetings');
      console.error('Error loading meetings:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const handleJoinMeeting = async (meeting) => {
    try {
      await API.joinMeeting(meeting.id, user);
      setSelectedMeeting({ ...meeting, user });
    } catch (err) {
      console.error('Error joining meeting:', err);
    }
  };

  useEffect(() => {
    if (user) {
      loadMeetings();
      const interval = setInterval(loadMeetings, 10000);
      return () => clearInterval(interval);
    }
  }, [user, loadMeetings]);

  if (!user) {
    return <Login />;
  }

  if (selectedMeeting) {
    return (
      <TranscriptViewer 
        meeting={selectedMeeting}
        onExit={() => setSelectedMeeting(null)}
      />
    );
  }

  return (
    <MeetingList
      meetings={meetings}
      onJoinMeeting={handleJoinMeeting}
      isLoading={isLoading}
      error={error}
    />
  );
}

function App() {
  return (
    <UserProvider>
      <div className="app-container">
        <AppContent />
      </div>
    </UserProvider>
  );
}

export default App;