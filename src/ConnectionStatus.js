import React, { useState, useEffect, useCallback } from 'react';

const ConnectionStatus = ({ websocket, isActive, onReconnect }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [lastPongTime, setLastPongTime] = useState(Date.now());

  const attemptReconnect = useCallback(async () => {
    if (!isActive || isReconnecting) return;
    
    setIsReconnecting(true);
    
    try {
      // Close existing connection if open
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.close();
      }
      
      // Start reconnection
      await onReconnect();
      
      // If not connected within 10 seconds, show actual state
      setTimeout(() => {
        setIsReconnecting(false);
      }, 10000);
      
    } catch (error) {
      setIsReconnecting(false);
      setIsConnected(false);
    }
  }, [isActive, isReconnecting, onReconnect, websocket]);

  useEffect(() => {
    if (!websocket) {
      setIsConnected(false);
      return;
    }

    // Immediately update connection state when websocket changes
    const updateConnectionState = () => {
      const isWsConnected = websocket.readyState === WebSocket.OPEN;
      setIsConnected(isWsConnected);
      if (isWsConnected) {
        setIsReconnecting(false);  // Clear reconnecting as soon as we're connected
      }
    };

    updateConnectionState();

    const handleOpen = () => {
      setIsConnected(true);
      setIsReconnecting(false);  // Clear reconnecting as soon as connection opens
    };

    const handlePong = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "pong") {
        setLastPongTime(Date.now());
        setIsConnected(true);
        setIsReconnecting(false);  // Clear reconnecting on successful pong
      }
    };

    websocket.addEventListener('open', handleOpen);
    websocket.addEventListener('message', handlePong);
    websocket.addEventListener('close', () => setIsConnected(false));
    websocket.addEventListener('error', () => setIsConnected(false));

    // Regular ping check
    const pingInterval = setInterval(() => {
      try {
        if (websocket.readyState === WebSocket.OPEN) {
          websocket.send("ping");
        }
      } catch (e) {
        setIsConnected(false);
      }
    }, 5000);

    return () => {
      websocket.removeEventListener('open', handleOpen);
      websocket.removeEventListener('message', handlePong);
      clearInterval(pingInterval);
    };
  }, [websocket]);

  const getStatusText = () => {
    if (isReconnecting && !isConnected) return "Reconnecting...";
    return isConnected ? "Connected" : "Disconnected";
  };

  if (!isActive) return null;

  return (
    <div 
      className={`connection-status ${isConnected ? 'status-connected' : 'status-disconnected'} ${isReconnecting && !isConnected ? 'reconnecting' : ''}`}
      onClick={attemptReconnect}
      title={isConnected ? 'Connected' : 'Click to reconnect'}
    >
      <span className="connection-pulse"></span>
      {getStatusText()}
    </div>
  );
};

export default ConnectionStatus;