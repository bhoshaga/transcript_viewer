import React from 'react';
import { formatRelative, parseISO } from 'date-fns';
import { enUS } from 'date-fns/locale';

const TranscriptSegment = ({ segment, isFinal }) => {
  // Format call duration (mm:ss or hh:mm:ss format)
  const formatCallTime = (callTime) => {
    if (!callTime) return 'Invalid time';
    // Validate format: mm:ss or hh:mm:ss
    const isValidFormat = /^([0-9]{2}:){1,2}[0-9]{2}$/.test(callTime);
    return isValidFormat ? callTime : 'Invalid time';
  };

  // Format capture time to PST/PDT
  const formatCaptureTime = (captureTime) => {
    if (!captureTime) return '';
    try {
      const date = new Date(captureTime);
      // Convert to PST/PDT
      const pstDate = new Date(date.toLocaleString('en-US', {
        timeZone: 'America/Los_Angeles'
      }));
      
      // Format time as HH:mm:ss AM/PM
      const timeString = pstDate.toLocaleString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZone: 'America/Los_Angeles'
      });
      
      // For debugging
      console.log('Original capture time:', captureTime);
      console.log('Formatted PST time:', timeString);
      
      return timeString;
    } catch (error) {
      console.error('Error formatting capture time:', error);
      return 'Invalid time';
    }
  };

  return (
    <div 
      className={`
        p-4 rounded-lg border mb-4 transition-all duration-200
        ${isFinal 
          ? 'bg-gray-800/50 border-gray-700' 
          : 'bg-blue-500/5 border-blue-500/20'
        }
      `}
    >
      <div className="flex justify-between items-center mb-2">
        <span className="font-medium text-gray-300">
          {segment.speaker}
        </span>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-400" title="Call Duration">
            {formatCallTime(segment.call_time)}
          </span>
          <span className="text-gray-500">•</span>
          <span className="text-gray-400" title="Capture Time (PST)">
            {formatCaptureTime(segment.capture_time)}
          </span>
          {!isFinal && (
            <span className="text-blue-400 text-xs ml-2 animate-pulse">
              processing...
            </span>
          )}
        </div>
      </div>
      <p className="text-gray-100 whitespace-pre-wrap break-words">
        {segment.text}
      </p>
    </div>
  );
};

export default React.memo(TranscriptSegment);