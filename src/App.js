import React, { useState, useEffect } from 'react';
import { useConnectionManager } from './hooks/useConnectionManager';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from './components/ui/alert';
import Login from './components/Login';
import MeetingList from './components/MeetingList';
import MeetingViewer from './components/MeetingViewer';
import Header from './components/Header';
import './App.css';

const API_BASE_URL = 'https://api.stru.ai';

const App = () => {
  const [username, setUsername] = useState(localStorage.getItem('username'));
  const [meetings, setMeetings] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const {
    connected,
    transcripts,
    activeSegments,
    participants,
    wsError,
    reconnect
  } = useConnectionManager(selectedMeeting, username);

  useEffect(() => {
    if (!username) return;

    const fetchMeetings = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`${API_BASE_URL}/api/meetings/user`, {
          headers: { 'X-Username': username }
        });

        if (!response.ok) throw new Error('Failed to fetch meetings');
        
        const data = await response.json();
        setMeetings(currentMeetings => {
          const updatedMeetings = data.map(newMeeting => {
            const existingMeeting = currentMeetings.find(m => m.id === newMeeting.id);
            if (existingMeeting && !hasSignificantChanges(existingMeeting, newMeeting)) {
              return existingMeeting;
            }
            return newMeeting;
          });
          
          return updatedMeetings;
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMeetings();
    const intervalId = setInterval(fetchMeetings, 5000);
    return () => clearInterval(intervalId);
  }, [username]);

  const hasSignificantChanges = (oldMeeting, newMeeting) => {
    return (
      oldMeeting.is_active !== newMeeting.is_active ||
      oldMeeting.end_time !== newMeeting.end_time ||
      JSON.stringify(oldMeeting.participants) !== JSON.stringify(newMeeting.participants)
    );
  };

  const handleLogin = (user) => {
    localStorage.setItem('username', user);
    setUsername(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('username');
    setUsername(null);
    setMeetings([]);
    setSelectedMeeting(null);
  };

  const handleMeetingSelect = (meeting) => {
    setSelectedMeeting(meeting);
    setError(null);
  };

  if (!username) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header 
        username={username} 
        onLogout={handleLogout} 
        connected={connected && selectedMeeting} 
      />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {(error || wsError) && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || wsError}</AlertDescription>
          </Alert>
        )}

        {selectedMeeting ? (
          <MeetingViewer
            meeting={selectedMeeting}
            transcripts={transcripts}
            activeSegments={activeSegments}
            participants={participants}
            connected={connected}
            wsError={wsError}
            reconnect={reconnect}
            onBack={() => setSelectedMeeting(null)}
          />
        ) : (
          <MeetingList
            meetings={meetings}
            loading={loading}
            onSelect={handleMeetingSelect}
            username={username}
            onMeetingsUpdate={setMeetings}
          />
        )}
      </main>
    </div>
  );
};

export default App;