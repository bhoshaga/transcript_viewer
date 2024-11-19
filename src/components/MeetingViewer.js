import React, { useRef, useEffect, useState } from 'react';
import { ChevronLeft, Users, Clock, ArrowDownToLine } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import ConnectionStatus from './ConnectionStatus';
import TranscriptSegment from './TranscriptSegment';
import { formatDistance } from 'date-fns';

const MeetingViewer = ({ 
  meeting, 
  transcripts = [], 
  activeSegments = {}, 
  participants = [], 
  onBack,
  connected,
  wsError,
  reconnect  // Changed from onReconnect to reconnect
}) => {
  const [autoScroll, setAutoScroll] = useState(true);
  const transcriptRef = useRef(null);
  const [showParticipants, setShowParticipants] = useState(true);

  useEffect(() => {
    if (autoScroll && transcriptRef.current) {
      const element = transcriptRef.current;
      element.scrollTop = element.scrollHeight;
    }
  }, [transcripts, activeSegments, autoScroll]);

  const handleScroll = (e) => {
    const element = e.target;
    const isAtBottom = Math.abs(
      element.scrollHeight - element.clientHeight - element.scrollTop
    ) < 50;
    
    if (isAtBottom !== autoScroll) {
      setAutoScroll(isAtBottom);
    }
  };

  const getMeetingStatus = () => {
    try {
      if (meeting.is_active) {
        return formatDistance(new Date(meeting.start_time), new Date(), { addSuffix: true });
      } else {
        return `Ended ${formatDistance(new Date(meeting.end_time), new Date(), { addSuffix: true })}`;
      }
    } catch (error) {
      console.error('Error formatting meeting status:', error);
      return meeting.is_active ? 'Active' : 'Ended';
    }
  };

  const renderHeader = () => (
    <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800">
      <div className="p-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center text-gray-400 hover:text-gray-200 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Back
          </button>
          <div>
            <h2 className="text-xl font-semibold text-gray-100">
              {meeting.name}
            </h2>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {getMeetingStatus()}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {participants.length} participant{participants.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {meeting.is_active && (
            <ConnectionStatus 
              connected={connected}
              onReconnect={reconnect}  // Updated to use reconnect
              isActive={meeting.is_active}
            />
          )}
          <button
            onClick={() => setShowParticipants(!showParticipants)}
            className="px-3 py-1.5 text-sm font-medium rounded-lg
                     bg-gray-800 text-gray-300 hover:bg-gray-700
                     transition-colors md:hidden"
          >
            {showParticipants ? 'Hide' : 'Show'} Participants
          </button>
        </div>
      </div>

      {/* Moved error alert inside header with better styling */}
      {wsError && (
        <Alert 
          variant="destructive" 
          className="mx-4 mb-4 bg-red-500/10 border-red-500/20 text-red-200"
        >
          <AlertDescription>{wsError}</AlertDescription>
        </Alert>
      )}
    </div>
  );

  const renderParticipantsList = () => (
    <div 
      className={`
        border-r border-gray-800 bg-gray-900/50 
        transition-all duration-200 ease-in-out
        ${showParticipants ? 'w-72' : 'w-0'}
        hidden md:block
      `}
    >
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-200 mb-4">
          Participants ({participants.length})
        </h3>
        <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-14rem)]">
          {participants.map((participant, index) => (
            <div 
              key={index}
              className="p-2 rounded-lg bg-gray-800/50 text-gray-300 text-sm"
            >
              {participant}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTranscripts = () => {
    const allSegments = [
      ...transcripts,
      ...Object.values(activeSegments)
    ].sort((a, b) => {
      const timeA = a.call_time.split(':').reduce((acc, time) => acc * 60 + parseInt(time), 0);
      const timeB = b.call_time.split(':').reduce((acc, time) => acc * 60 + parseInt(time), 0);
      
      if (timeA !== timeB) return timeA - timeB;
      return new Date(a.capture_time) - new Date(b.capture_time);
    });

    return (
      <div 
        ref={transcriptRef}
        onScroll={handleScroll}
        className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar bg-gray-900/50 max-w-[calc(100%-18rem)]"
      >
        {allSegments.map(segment => (
          <TranscriptSegment
            key={`${segment.id}-${segment.status}`}
            segment={segment}
            isFinal={segment.status === 'final'}
          />
        ))}

        {allSegments.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No transcripts available for this meeting
          </div>
        )}

        {!autoScroll && allSegments.length > 0 && (
          <button
            onClick={() => {
              setAutoScroll(true);
              transcriptRef.current?.scrollTo({
                top: transcriptRef.current.scrollHeight,
                behavior: 'smooth'
              });
            }}
            className="fixed bottom-4 right-4 bg-blue-500/10 text-blue-400 
                     px-4 py-2 rounded-lg flex items-center gap-2 
                     hover:bg-blue-500/20 transition-colors"
          >
            <ArrowDownToLine className="w-4 h-4" />
            Resume auto-scroll
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden h-[calc(100vh-7rem)]">
      {renderHeader()}
      <div className="flex h-[calc(100vh-14rem)]">
        {renderParticipantsList()}
        {renderTranscripts()}
      </div>
    </div>
  );
};

export default React.memo(MeetingViewer, (prevProps, nextProps) => {
  return (
    prevProps.meeting.id === nextProps.meeting.id &&
    prevProps.connected === nextProps.connected &&
    prevProps.transcripts.length === nextProps.transcripts.length &&
    Object.keys(prevProps.activeSegments).length === Object.keys(nextProps.activeSegments).length &&
    prevProps.participants.length === nextProps.participants.length &&
    prevProps.wsError === nextProps.wsError
  );
});