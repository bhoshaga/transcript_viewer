import { useState, useEffect, useRef, useCallback } from 'react';
import TranscriptWebSocket from '../utils/websocket';

export function useWebSocket(meetingId, username, addDebugLog) {
  const [wsStatus, setWsStatus] = useState('DISCONNECTED');
  const [messages, setMessages] = useState([]);
  const [activeStreams, setActiveStreams] = useState({});
  const [serverStats, setServerStats] = useState(null);
  const wsRef = useRef(null);

  const handleMessageComplete = useCallback((message) => {
    setMessages(prev => [...prev, message]);
    setActiveStreams(prev => {
      const next = { ...prev };
      if (message.speaker) {
        delete next[message.speaker];
      }
      return next;
    });
  }, []);

  const handleMessageStreaming = useCallback((message) => {
    if (message.speaker && message.content) {
      setActiveStreams(prev => ({
        ...prev,
        [message.speaker]: message
      }));
    }
  }, []);

  const handleHistory = useCallback((history) => {
    setMessages(history);
  }, []);

  useEffect(() => {
    if (!meetingId || !username) return;

    const handlers = {
      onStatusChange: setWsStatus,
      onDebugLog: addDebugLog,
      onStats: setServerStats,
      onMessageComplete: handleMessageComplete,
      onMessageStreaming: handleMessageStreaming,
      onHistory: handleHistory
    };

    wsRef.current = new TranscriptWebSocket(meetingId, username, handlers);
    wsRef.current.connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.disconnect();
      }
    };
  }, [meetingId, username, addDebugLog, handleMessageComplete, handleMessageStreaming, handleHistory]);

  return {
    wsStatus,
    messages,
    activeStreams,
    serverStats
  };
}