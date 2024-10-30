import React, { useState, useCallback } from 'react';
import MessageList from './MessageList';
import DebugPanel from './DebugPanel';
import { useWebSocket } from '../hooks/useWebSocket';
import { useDebugLogs } from '../hooks/useDebugLogs';

const TranscriptViewer = ({ meeting, onExit }) => {
  const [autoScroll, setAutoScroll] = useState(true);
  const { logs: debugLogs, addLog: addDebugLog } = useDebugLogs();
  
  const { 
    wsStatus, 
    messages, 
    activeStreams, 
    serverStats 
  } = useWebSocket(meeting.id, meeting.user, addDebugLog);

  const handleScroll = useCallback((event) => {
    const { scrollTop, scrollHeight, clientHeight } = event.target;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isAtBottom);
  }, []);

  return (
    <div className="transcript-viewer">
      <div className="transcript-container">
        <div className="transcript-main">
          <div className="transcript-header">
            <div className="meeting-info">
              <h2>{meeting.displayName}</h2>
              <div className="meeting-meta">
                <span>ID: {meeting.id}</span>
                <span>Created by: {meeting.creator}</span>
                <span className={`connection-status ${wsStatus.toLowerCase()}`}>
                  {wsStatus}
                </span>
              </div>
            </div>
            <button 
              className="control-button"
              onClick={onExit}
            >
              Leave Meeting
            </button>
          </div>

          <MessageList
            messages={messages}
            activeStreams={activeStreams}
            autoScroll={autoScroll}
            onScroll={handleScroll}
          />

          <div className="transcript-controls">
            <label className="auto-scroll-toggle">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
              />
              Auto-scroll to new messages
            </label>
            <span className="message-count">
              Messages: {messages.length}
            </span>
          </div>
        </div>

        <DebugPanel
          wsStatus={wsStatus}
          serverStats={serverStats}
          debugLogs={debugLogs}
        />
      </div>
    </div>
  );
};

export default TranscriptViewer;