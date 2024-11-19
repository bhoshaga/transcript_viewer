import { useState, useEffect, useRef, useCallback } from 'react';
import { WS_BASE_URL } from '../config';

export const useConnectionManager = (meeting, username) => {
  const [connected, setConnected] = useState(false);
  const [transcripts, setTranscripts] = useState([]);
  const [activeSegments, setActiveSegments] = useState({});
  const [participants, setParticipants] = useState([]);
  const [wsError, setWsError] = useState(null);

  const wsRef = useRef(null);
  const missedHeartbeatsRef = useRef(0);
  const heartbeatIntervalRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const isConnectingRef = useRef(false);

  const MAX_RECONNECT_ATTEMPTS = 5;
  const HEARTBEAT_INTERVAL = 30000;
  const MAX_MISSED_HEARTBEATS = 3;
  const INITIAL_RETRY_DELAY = 1000;

  const clearConnection = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (err) {
        console.error('Error closing WebSocket:', err);
      }
      wsRef.current = null;
    }
    setConnected(false);
    isConnectingRef.current = false;
  }, []);

  const connectWebSocket = useCallback(async () => {
    if (!meeting || !username || wsRef.current || isConnectingRef.current) return;

    try {
      isConnectingRef.current = true;
      setWsError(null);

      const ws = new WebSocket(
        `${WS_BASE_URL}/ws/meetings/${meeting.id}/transcript?user=${username}`
      );

      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);
        setWsError(null);
        missedHeartbeatsRef.current = 0;
        reconnectAttemptsRef.current = 0;
        isConnectingRef.current = false;

        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "heartbeat" }));
            missedHeartbeatsRef.current++;

            if (missedHeartbeatsRef.current > MAX_MISSED_HEARTBEATS) {
              console.log('Too many missed heartbeats, reconnecting...');
              clearConnection();
              connectWebSocket();
            }
          }
        }, HEARTBEAT_INTERVAL);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          switch (data.type) {
            case 'initial_state':
              setTranscripts(data.data.transcript.history || []);
              setActiveSegments(data.data.transcript.active_segments || {});
              setParticipants(data.data.participants.current_participants || []);
              break;
            case 'transcript':
              if (data.data.status === 'final') {
                setTranscripts(prev => [...prev, data.data]);
                setActiveSegments(prev => {
                  const updated = { ...prev };
                  delete updated[data.data.id];
                  return updated;
                });
              } else {
                setActiveSegments(prev => ({
                  ...prev,
                  [data.data.id]: data.data
                }));
              }
              break;
            case 'participant_update':
              setParticipants(data.data.participants);
              break;
            case 'heartbeat_ack':
              missedHeartbeatsRef.current = 0;
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        clearConnection();
        
        if (meeting?.is_active && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(
            INITIAL_RETRY_DELAY * Math.pow(2, reconnectAttemptsRef.current),
            30000
          );
          console.log(`Reconnecting in ${delay}ms... (attempt ${reconnectAttemptsRef.current + 1})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connectWebSocket();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWsError('Connection error occurred. Attempting to reconnect...');
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to establish WebSocket connection:', error);
      setWsError('Failed to establish connection. Retrying...');
      clearConnection();
      
      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++;
          connectWebSocket();
        }, INITIAL_RETRY_DELAY);
      }
    }
  }, [meeting, username, clearConnection]);

  useEffect(() => {
    if (meeting && username) {
      connectWebSocket();
    }
    return () => {
        clearConnection();
      };
    }, [meeting, username, connectWebSocket, clearConnection]);
  
    // Add a manual reconnect function for UI use
    const reconnect = useCallback(() => {
      clearConnection();
      reconnectAttemptsRef.current = 0;
      connectWebSocket();
    }, [clearConnection, connectWebSocket]);
  
    // Add auto-reconnect on visibility change
    useEffect(() => {
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && meeting?.is_active && !connected) {
          console.log('Tab became visible, attempting reconnect...');
          reconnect();
        }
      };
  
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }, [meeting, connected, reconnect]);
  
    // Add auto-reconnect on network status change
    useEffect(() => {
      const handleOnline = () => {
        if (meeting?.is_active && !connected) {
          console.log('Network connection restored, attempting reconnect...');
          reconnect();
        }
      };
  
      window.addEventListener('online', handleOnline);
      return () => {
        window.removeEventListener('online', handleOnline);
      };
    }, [meeting, connected, reconnect]);
  
    return {
      connected,
      transcripts,
      activeSegments,
      participants,
      wsError,
      reconnect
    };
  };
  
  export default useConnectionManager;