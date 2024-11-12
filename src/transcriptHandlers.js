// transcriptHandlers.js

export const createMessageHandler = (
    setTranscriptHistory,
    setActiveSegments,
    setParticipants,
    setMeetingEnded,
    setMeetings,
    selectedMeeting,
    processedMessagesRef
  ) => {
    const isMessageValid = (segment) => {
      if (!segment?.id || !segment?.speaker || !segment?.text) {
        return false;
      }
  
      // Allow empty/partial messages through (real-time updates)
      if (segment.text.trim() === '') {
        return true;
      }
  
      // Create a unique key for this version of the message
      const messageKey = `${segment.id}-${segment.text.length}-${segment.speaker}`;
      
      // If this exact message was already processed, skip it
      if (processedMessagesRef.current.has(messageKey)) {
        return false;
      }
  
      // Add to processed messages
      processedMessagesRef.current.add(messageKey);
      
      // Cleanup old messages if needed
      if (processedMessagesRef.current.size > 1000) {
        const oldestMessages = Array.from(processedMessagesRef.current).slice(0, 500);
        oldestMessages.forEach(key => processedMessagesRef.current.delete(key));
      }
  
      return true;
    };
  
    const handleTranscriptUpdate = (data) => {
      const segment = data.data.segment;
      
      if (!isMessageValid(segment)) {
        return;
      }
  
      if (data.data.is_final) {
        setTranscriptHistory(prev => {
          // Update or add the segment
          const withoutDuplicate = prev.filter(item => item.id !== segment.id);
          return [...withoutDuplicate, segment];
        });
        
        setActiveSegments(prev => {
          const updated = { ...prev };
          delete updated[segment.id];
          return updated;
        });
      } else {
        setActiveSegments(prev => ({
          ...prev,
          [segment.id]: segment
        }));
      }
    };
  
    const handleParticipantUpdate = (data) => {
      setParticipants(data.data.participants);
    };
  
    const handleMeetingEnded = () => {
      setMeetingEnded(true);
      if (selectedMeeting) {
        setMeetings(prev => 
          prev.map(m => 
            m.id === selectedMeeting.id 
              ? { ...m, is_active: false }
              : m
          )
        );
      }
    };
  
    const handleInitialState = (data) => {
      processedMessagesRef.current.clear();
      setTranscriptHistory(data.data.transcript.history || []);
      setActiveSegments(data.data.transcript.active_segments || {});
      setParticipants(data.data.participants.current_participants || []);
    };
  
    const handleWebSocketMessage = (data) => {
      switch (data.type) {
        case 'transcript_update':
          handleTranscriptUpdate(data);
          break;
        case 'participant_update':
          handleParticipantUpdate(data);
          break;
        case 'meeting_ended':
          handleMeetingEnded();
          break;
        case 'initial_state':
          handleInitialState(data);
          break;
        default:
          console.log('Unknown message type:', data.type);
      }
    };
  
    return { handleWebSocketMessage };
  };
  
  export const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };