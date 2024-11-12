// ConnectionStatus.js
import React, { useState, useEffect, useCallback } from 'react';

const ConnectionStatus = ({ websocket, isActive, onReconnect }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [lastPongTime, setLastPongTime] = useState(Date.now());

  const attemptReconnect = useCallback(async () => {
    if (!isActive || isReconnecting) return;
    setIsReconnecting(true);
    await onReconnect();
    setIsReconnecting(false);
  }, [isActive, isReconnecting, onReconnect]);

  const checkConnection = useCallback(() => {
    if (!websocket) return;

    const timeSinceLastPong = Date.now() - lastPongTime;
    if (timeSinceLastPong > 15000) {
      setIsConnected(false);
      attemptReconnect();
    }

    try {
      websocket.send("ping");
      // When sending ping, briefly show checking state via CSS animation
      const element = document.querySelector('.connection-pulse');
      if (element) {
        element.classList.add('checking');
        setTimeout(() => element.classList.remove('checking'), 500);
      }
    } catch (e) {
      setIsConnected(false);
    }
  }, [websocket, lastPongTime, attemptReconnect]);

  useEffect(() => {
    if (!websocket) {
      setIsConnected(false);
      return;
    }

    setIsConnected(true);

    const handlePong = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "pong") {
        setLastPongTime(Date.now());
        setIsConnected(true);
      }
    };

    websocket.addEventListener('message', handlePong);
    websocket.addEventListener('close', () => setIsConnected(false));
    websocket.addEventListener('error', () => setIsConnected(false));

    const checkInterval = setInterval(checkConnection, 5000);

    return () => {
      websocket.removeEventListener('message', handlePong);
      clearInterval(checkInterval);
    };
  }, [websocket, checkConnection]);

  if (!isActive) return null;

  return (
    <div 
      className={`connection-status ${isConnected ? 'status-connected' : 'status-disconnected'} ${isReconnecting ? 'reconnecting' : ''}`}
      onClick={attemptReconnect}
      title={isConnected ? 'Connected' : 'Click to reconnect'}
    >
      <span className="connection-pulse"></span>
      {isReconnecting ? 'Reconnecting...' : (isConnected ? 'Connected' : 'Disconnected')}
    </div>
  );
};

export default ConnectionStatus;