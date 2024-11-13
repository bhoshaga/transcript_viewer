import React, { useState, useEffect, useRef } from 'react';
import { createMessageHandler, formatTimestamp } from './transcriptHandlers';
import Login from './Login';
import MeetingCard from './MeetingCard';
import ConnectionStatus from './ConnectionStatus';
import './App.css';

// Add this utility function at the top of your file
function isEqual(obj1, obj2) {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
}

const BASE_URL = process.env.REACT_APP_ENV === 'production' 
  ? 'https://api.stru.ai' 
  : 'http://localhost:8000';
const WS_BASE_URL = process.env.REACT_APP_ENV === 'production'
  ? 'wss://api.stru.ai'
  : 'ws://localhost:8000';

const MeetingsViewer = () => {
  const [username, setUsername] = useState(localStorage.getItem('username'));
  const [meetings, setMeetings] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [transcriptHistory, setTranscriptHistory] = useState([]);
  const [activeSegments, setActiveSegments] = useState({});
  const [participants, setParticipants] = useState([]);
  const [connected, setConnected] = useState(false);
  const [meetingEnded, setMeetingEnded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState(null);

  const wsRef = useRef(null);
  const scrollRef = useRef(null);
  const autoScrollRef = useRef(true);
  const processedMessagesRef = useRef(new Set());

  const handleLogin = (newUsername) => {
    setUsername(newUsername);
    setLoading(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('username');
    setUsername(null);
    setMeetings([]);
    setSelectedMeeting(null);
    if (wsRef.current) {
      wsRef.current.close();
    }
  };

  const handleEndMeeting = async (meeting) => {
    try {
      const response = await fetch(`${BASE_URL}/api/meetings/${meeting.id}/end`, {
        method: 'POST',
        headers: {
          'X-Username': username
        }
      });
  
      if (!response.ok) {
        throw new Error('Failed to end meeting');
      }
  
      // Update local meetings state
      setMeetings(prev => prev.map(m => 
        m.id === meeting.id 
          ? { ...m, is_active: false, end_time: new Date().toISOString(), end_reason: "Manually ended by creator" }
          : m
      ));
  
      // If we're viewing this meeting, update the view
      if (selectedMeeting?.id === meeting.id) {
        setSelectedMeeting(prev => ({
          ...prev,
          is_active: false,
          end_time: new Date().toISOString(),
          end_reason: "Manually ended by creator"
        }));
        setMeetingEnded(true);
      }
    } catch (err) {
      console.error('Error ending meeting:', err);
      setError('Failed to end meeting: ' + err.message);
    }
  };

  // Create message handler
  const { handleWebSocketMessage } = createMessageHandler(
    setTranscriptHistory,
    setActiveSegments,
    setParticipants,
    setMeetingEnded,
    setMeetings,
    selectedMeeting,
    processedMessagesRef
  );

  // Fetch available meetings
  useEffect(() => {
    const fetchMeetings = async () => {
      if (!username) return;
      
      setLoading(true);
      try {
        await fetch(`${BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Username': username
          },
          body: JSON.stringify({ username })
        });

        const response = await fetch(`${BASE_URL}/api/meetings/user`, {
          headers: {
            'X-Username': username
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch meetings');
        }

        const data = await response.json();
        setMeetings(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching meetings:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMeetings();
  }, [username]);

  useEffect(() => {
    if (!username) return;
  
    const fetchLatestMeetings = async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/meetings/user`, {
          headers: {
            'X-Username': username
          }
        });
  
        if (!response.ok) {
          throw new Error('Failed to fetch meetings');
        }
  
        const data = await response.json();
        
        // Update meetings while preserving selected meeting details
        setMeetings(currentMeetings => {
          const updatedMeetings = data.map(newMeeting => {
            const existingMeeting = currentMeetings.find(m => m.id === newMeeting.id);
            return existingMeeting ? { ...existingMeeting, ...newMeeting } : newMeeting;
          });
          
          // If we have a selected meeting, update its details too
          if (selectedMeeting) {
            const updatedSelectedMeeting = data.find(m => m.id === selectedMeeting.id);
            if (updatedSelectedMeeting && !isEqual(updatedSelectedMeeting, selectedMeeting)) {
              setSelectedMeeting(updatedSelectedMeeting);
            }
          }
          
          return updatedMeetings;
        });
      } catch (err) {
        console.error('Error fetching latest meetings:', err);
      }
    };
  
    const intervalId = setInterval(fetchLatestMeetings, 4000);
  
    return () => clearInterval(intervalId);
  }, [username, selectedMeeting]);

  // Fetch meeting data when selected
  useEffect(() => {
    const fetchMeetingData = async () => {
      if (!selectedMeeting || !username) return;

      setLoading(true);
      try {
        const transcriptResponse = await fetch(
          `${BASE_URL}/api/meetings/${selectedMeeting.id}/transcript`,
          {
            headers: {
              'X-Username': username
            }
          }
        );
        
        if (!transcriptResponse.ok) {
          throw new Error('Failed to fetch transcript data');
        }
        
        const transcriptData = await transcriptResponse.json();
        processedMessagesRef.current.clear();
        
        setTranscriptHistory(transcriptData.history || []);
        setActiveSegments(transcriptData.active_segments || {});
        setMeetingEnded(!transcriptData.is_active);

        const participantsResponse = await fetch(
          `${BASE_URL}/api/meetings/${selectedMeeting.id}/participants`,
          {
            headers: {
              'X-Username': username
            }
          }
        );
        
        if (!participantsResponse.ok) {
          throw new Error('Failed to fetch participant data');
        }
        
        const participantsData = await participantsResponse.json();
        setParticipants(participantsData.current_participants || []);
        
        setError(null);
      } catch (err) {
        console.error('Error fetching meeting data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMeetingData();
  }, [selectedMeeting, username]);

  // WebSocket connection
  useEffect(() => {
    if (!selectedMeeting || !username) return;
  
    const connectWebSocket = () => {
      const ws = new WebSocket(
        `${WS_BASE_URL}/ws/meetings/${selectedMeeting.id}/transcript?user=${username}`
      );
  
      ws.onopen = () => {
        console.log('Connected to WebSocket');
        setConnected(true);
        setError(null);
      };
  
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      };
  
      ws.onclose = () => {
        console.log('Disconnected from WebSocket');
        setConnected(false);
        if (selectedMeeting?.is_active) {
          setTimeout(connectWebSocket, 5000);
        }
      };
  
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('WebSocket connection error');
      };
  
      wsRef.current = ws;
    };
  
    if (!loading) {
      connectWebSocket();
    }
  
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [selectedMeeting, loading, username, handleWebSocketMessage]); // Added handleWebSocketMessage to dependencies

  // Auto-scroll effect
  useEffect(() => {
    if (scrollRef.current && autoScrollRef.current) {
      const element = scrollRef.current;
      element.scrollTop = element.scrollHeight;
    }
  }, [transcriptHistory, activeSegments]);

  const handleScroll = (e) => {
    const element = e.target;
    const isAtBottom = Math.abs(
      element.scrollHeight - element.clientHeight - element.scrollTop
    ) < 50;
    autoScrollRef.current = isAtBottom;
  };

  const handleDeleteClick = (meeting, event) => {
    if (event) {
      event.stopPropagation();
    }
    setMeetingToDelete(meeting);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!meetingToDelete) return;

    try {
      const response = await fetch(
        `${BASE_URL}/api/meetings/${meetingToDelete.id}`,
        {
          method: 'DELETE',
          headers: {
            'X-Username': username
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete meeting');
      }

      setMeetings(prev => prev.filter(m => m.id !== meetingToDelete.id));
      setShowDeleteConfirm(false);
      setMeetingToDelete(null);
      
      if (selectedMeeting?.id === meetingToDelete.id) {
        setSelectedMeeting(null);
      }
    } catch (err) {
      console.error('Error deleting meeting:', err);
      setError('Failed to delete meeting: ' + err.message);
    }
  };

  const handleBackToMeetings = () => {
    setSelectedMeeting(null);
    setTranscriptHistory([]);
    setActiveSegments({});
    setParticipants([]);
    setMeetingEnded(false);
    processedMessagesRef.current.clear();
    if (wsRef.current) {
      wsRef.current.close();
    }
  };

  if (!username) {
    return <Login onLogin={handleLogin} />;
  }

  if (loading && !selectedMeeting) {
    return (
      <div className="meetings-viewer">
        <div className="loading">Loading meetings...</div>
      </div>
    );
  }

  if (error && !selectedMeeting) {
    return (
      <div className="meetings-viewer">
        <div className="error-message">
          Error: {error}
          <br />
          Please check if the server is running and try again.
        </div>
      </div>
    );
  }

  return (
    <div className="meetings-viewer">
      {!selectedMeeting ? (
        <div className="meetings-list">
          <div className="header">
            <h1>Available Meetings</h1>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
          {meetings.length === 0 ? (
            <div className="no-meetings">No meetings available</div>
          ) : (
            <div className="meetings-grid">
              {meetings.map(meeting => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  username={username}
                  onDelete={handleDeleteClick}
                  onEndMeeting={handleEndMeeting}
                  onClick={() => setSelectedMeeting(meeting)}
                />
              ))}
            </div>
          )}

          {showDeleteConfirm && (
            <div className="modal-overlay">
              <div className="modal">
                <h2>Delete Meeting</h2>
                <p>Are you sure you want to delete this meeting?</p>
                <p className="meeting-name">{meetingToDelete?.name}</p>
                <div className="modal-buttons">
                  <button
                    className="button secondary"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setMeetingToDelete(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="button danger"
                    onClick={handleDeleteConfirm}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="transcript-viewer">
          <div className="header">
            <div className="header-left">
              <button 
                className="back-button"
                onClick={handleBackToMeetings}
              >
                Back to Meetings
              </button>
              <h1>{selectedMeeting.name}</h1>
            </div>
            <ConnectionStatus 
              websocket={wsRef.current}
              isActive={selectedMeeting.is_active} 
              onReconnect={async () => {
                if (wsRef.current) {
                  wsRef.current.close();
                  wsRef.current = null;
                }
                // This will trigger the useEffect to reconnect
                setConnected(false);
              }}
            />
          </div>

          <div className="main-content">
            <div className="participants-panel">
              <h2>Participants ({participants.length})</h2>
              <div className="participants-list">
                {participants.map((participant, index) => (
                  <div key={index} className="participant">
                    {participant}
                  </div>
                ))}
              </div>
            </div>

            <div 
              className="transcript-panel" 
              ref={scrollRef}
              onScroll={handleScroll}
            >
              {loading ? (
                <div className="loading">Loading transcript...</div>
              ) : transcriptHistory.length === 0 && 
                   Object.keys(activeSegments).length === 0 ? (
                <div className="empty-state">
                  No transcript data available yet
                </div>
              ) : (
                <>
                  {transcriptHistory.map((segment, index) => (
                    <div key={`history-${segment.id}`} className="transcript-segment final">
                      <div className="segment-header">
                        <span className="speaker">{segment.speaker}</span>
                        <span className="timestamp">
                          {formatTimestamp(segment.call_time, segment.capture_time)}
                        </span>
                      </div>
                      <div className="segment-content">{segment.text}</div>
                    </div>
                  ))}

                  {Object.values(activeSegments).map((segment) => (
                    <div key={`active-${segment.id}`} className="transcript-segment interim">
                      <div className="segment-header">
                        <span className="speaker">{segment.speaker}</span>
                        <span className="timestamp">
                          {formatTimestamp(segment.call_time, segment.capture_time)}
                        </span>
                      </div>
                      <div className="segment-content">{segment.text}</div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {meetingEnded && (
            <div className="meeting-ended-banner">
              This meeting has ended
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MeetingsViewer;