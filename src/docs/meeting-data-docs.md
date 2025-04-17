
# Meeting Data Documentation

## Transcript Data Structure

### Message Structure
Transcript data is delivered through the WebSocket connection in the following structures:

#### Active/Streaming Segment
```json
{
  "type": "transcript_update",
  "data": {
    "segment": {
      "id": "segment_123",
      "speaker": "John Doe",
      "text": "This is an in-progress transcription",
      "timestamp": "2023-07-15T14:32:45.123Z",
      "call_time": "00:15"
    },
    "is_final": false
  }
}
```

#### Final/Completed Segment
```json
{
  "type": "transcript_update",
  "data": {
    "segment": {
      "id": "segment_123",
      "speaker": "John Doe",
      "text": "This is the complete transcription.",
      "timestamp": "2023-07-15T14:32:45.123Z",
      "call_time": "00:15"
    },
    "is_final": true
  }
}
```

#### Initial History Load
```json
{
  "type": "initial_state",
  "data": {
    "transcript": {
      "history": [
        {
          "id": "segment_121",
          "speaker": "John Doe",
          "text": "Previous transcript segment 1",
          "timestamp": "2023-07-15T14:30:12.456Z",
          "call_time": "00:12"
        },
        {
          "id": "segment_122",
          "speaker": "Jane Smith",
          "text": "Previous transcript segment 2",
          "timestamp": "2023-07-15T14:31:23.789Z",
          "call_time": "00:13"
        }
      ],
      "active_segments": {
        "segment_123": {
          "id": "segment_123",
          "speaker": "John Doe",
          "text": "Currently in-progress segment",
          "timestamp": "2023-07-15T14:32:45.123Z",
          "call_time": "00:15"
        }
      }
    }
  }
}
```

## Timestamp and Duration Formats

### Time Formats
The transcript system uses two different time-related fields:

1. **`timestamp`** (ISO 8601 format)
   - Example: `2023-07-15T14:32:45.123Z`
   - Represents the actual time when the transcript segment was captured
   - Used for display and sorting

2. **`call_time`** (Duration format)
   - Example: `00:15`
   - Format: `MM:SS` (minutes:seconds)
   - Represents the elapsed time from the start of the meeting
   - Used to show when in the meeting timeline the segment occurred

### Timestamp Formatting Function
The system formats timestamps for display using this logic:

```javascript
function formatTimestamp(callTime, captureTime) {
  // For duration format (MM:SS)
  if (/^\d{2}:\d{2}$/.test(callTime)) {
    const captureDateTime = new Date(captureTime);
    const formattedCaptureTime = captureDateTime.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    
    // Display as "00:15 - 2:32:45 PM"
    return `${callTime} - ${formattedCaptureTime}`;
  } else {
    // For ISO timestamp format
    const captureDateTime = new Date(captureTime);
    return captureDateTime.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }
}
```

## WebSocket Connection and Data Flow

### Connecting to the WebSocket
```javascript
const ws = new WebSocket(
  `wss://api.stru.ai/ws/meetings/${meetingId}/transcript?user=${username}`
);
```

### Listening for Transcript Updates

#### Setting Up Event Handlers
```javascript
ws.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data);
    
    switch (data.type) {
      case 'initial_state':
        // Handle initial transcript history
        setTranscriptHistory(data.data.transcript.history || []);
        setActiveSegments(data.data.transcript.active_segments || {});
        break;
        
      case 'transcript_update':
        const segment = data.data.segment;
        const isFinal = data.data.is_final;
        
        if (isFinal) {
          // Handle completed transcript segment
          setTranscriptHistory(prev => {
            // Remove any duplicate with same ID
            const withoutDuplicate = prev.filter(item => item.id !== segment.id);
            return [...withoutDuplicate, segment];
          });
          
          // Remove from active segments
          setActiveSegments(prev => {
            const updated = {...prev};
            delete updated[segment.id];
            return updated;
          });
        } else {
          // Handle streaming transcript segment
          setActiveSegments(prev => ({
            ...prev,
            [segment.id]: segment
          }));
        }
        break;
    }
  } catch (error) {
    console.error('Error parsing WebSocket message:', error);
  }
};
```

## Data Storage and Management

### State Management for Transcripts
The system typically maintains two separate data stores:

1. **Transcript History** (completed segments)
   - Array of finalized transcript segments
   - Used for displaying completed transcriptions
   - Example structure:
     ```javascript
     [
       {
         id: "segment_121",
         speaker: "John Doe",
         text: "Previous transcript segment 1",
         timestamp: "2023-07-15T14:30:12.456Z",
         call_time: "00:12"
       },
       // More segments...
     ]
     ```

2. **Active Segments** (in-progress segments)
   - Object mapping segment IDs to segments in progress
   - Used for displaying real-time streaming transcriptions
   - Example structure:
     ```javascript
     {
       "segment_123": {
         id: "segment_123",
         speaker: "John Doe",
         text: "Currently in-progress segment",
         timestamp: "2023-07-15T14:32:45.123Z",
         call_time: "00:15"
       }
       // More active segments...
     }
     ```

### Duplicate Prevention
The system implements duplicate prevention logic:

```javascript
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
```

## Implementation Example

### Complete WebSocket Transcript Handling

```javascript
// Setup state for transcript data
const [transcriptHistory, setTranscriptHistory] = useState([]);
const [activeSegments, setActiveSegments] = useState({});
const processedMessagesRef = useRef(new Set());

// Connect to WebSocket
const connectToMeeting = (meetingId, username) => {
  const ws = new WebSocket(
    `wss://api.stru.ai/ws/meetings/${meetingId}/transcript?user=${username}`
  );
  
  ws.onopen = () => {
    console.log('Connected to meeting transcript');
  };
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'initial_state':
          processedMessagesRef.current.clear();
          setTranscriptHistory(data.data.transcript.history || []);
          setActiveSegments(data.data.transcript.active_segments || {});
          break;
          
        case 'transcript_update':
          const segment = data.data.segment;
          
          // Skip if invalid or duplicate
          if (!isMessageValid(segment)) {
            return;
          }
          
          if (data.data.is_final) {
            setTranscriptHistory(prev => {
              const withoutDuplicate = prev.filter(item => item.id !== segment.id);
              return [...withoutDuplicate, segment];
            });
            
            setActiveSegments(prev => {
              const updated = {...prev};
              delete updated[segment.id];
              return updated;
            });
          } else {
            setActiveSegments(prev => ({
              ...prev,
              [segment.id]: segment
            }));
          }
          break;
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  };
  
  // Handle connection close
  ws.onclose = () => {
    console.log('Disconnected from meeting transcript');
  };
  
  return ws;
};

// Display transcripts
const renderTranscripts = () => {
  // First render completed transcript history
  const historyElements = transcriptHistory.map(segment => (
    <div key={segment.id} className="transcript-segment">
      <div className="transcript-header">
        <span className="speaker">{segment.speaker}</span>
        <span className="timestamp">
          {formatTimestamp(segment.call_time, segment.timestamp)}
        </span>
      </div>
      <div className="transcript-text">{segment.text}</div>
    </div>
  ));
  
  // Then render active/streaming segments
  const activeElements = Object.values(activeSegments).map(segment => (
    <div key={segment.id} className="transcript-segment active">
      <div className="transcript-header">
        <span className="speaker">{segment.speaker}</span>
        <span className="timestamp">
          {formatTimestamp(segment.call_time, segment.timestamp)}
        </span>
      </div>
      <div className="transcript-text">{segment.text}</div>
    </div>
  ));
  
  return (
    <div className="transcript-container">
      {historyElements}
      {activeElements}
    </div>
  );
};
```

## Best Practices

1. **Handling Streaming Data**
   - Always maintain separate stores for complete vs. in-progress segments
   - Move segments from active to history when `is_final` is true
   - Implement duplicate detection using unique identifiers

2. **Timestamp Display**
   - Show both meeting duration time (`call_time`) and actual time (`timestamp`) when available
   - Format timestamps in a user-friendly format (e.g., "00:15 - 2:32:45 PM")
   - Use consistent formatting across the application

3. **Connection Management**
   - Implement reconnection logic with backoff strategy
   - Clear transcript data when connection is re-established
   - Use the `initial_state` message to repopulate transcript history

4. **Performance Optimization**
   - Limit the size of processed message history to prevent memory leaks
   - Implement efficient rendering of transcript segments (e.g., memoization)
   - Consider pagination for very long transcripts
