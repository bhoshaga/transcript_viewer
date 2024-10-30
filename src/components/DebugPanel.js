import React from 'react';

const DebugPanel = ({ wsStatus, serverStats, debugLogs }) => {
  return (
    <div className="debug-panel">
      <div className="debug-header">
        <h3>Debug Information</h3>
      </div>
      <div className="debug-stats">
        <div>WebSocket: <span className={wsStatus.toLowerCase()}>{wsStatus}</span></div>
        {serverStats && (
          <>
            <div>Participants: {serverStats.participant_count}</div>
            <div>Total Messages: {serverStats.message_count}</div>
            <div>Teams Connections: {serverStats.teams_connections}</div>
            <div>Transcript Viewers: {serverStats.transcript_connections}</div>
          </>
        )}
      </div>
      <div className="debug-logs">
        {debugLogs.map((log, idx) => (
          <div key={idx} className={`log-entry ${log.type}`}>
            <span className="log-timestamp">{log.timestamp}</span>
            <span className="log-message">{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DebugPanel;