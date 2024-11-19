import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

const ConnectionStatus = ({ connected, onReconnect, isActive }) => {
  if (!isActive) return null;

  return (
    <div 
      className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center transition-colors duration-200 ${
        connected 
          ? 'bg-green-500/10 text-green-500' 
          : 'bg-red-500/10 text-red-500 cursor-pointer hover:bg-red-500/20'
      }`}
      onClick={!connected ? onReconnect : undefined}
      role={!connected ? 'button' : 'status'}
      tabIndex={!connected ? 0 : undefined}
    >
      <span 
        className={`w-2 h-2 rounded-full mr-2 ${
          connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
        }`} 
      />
      {connected ? (
        'Connected'
      ) : (
        <div className="flex items-center">
          <span className="mr-1">Disconnected</span>
          <RefreshCw className="w-3 h-3 animate-spin" />
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;