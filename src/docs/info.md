


# Transcript Data Flow Documentation

## Overview

The transcript system operates primarily through WebSocket connections for real-time updates, with the client maintaining two separate data stores:

1. **Transcript History** - A collection of finalized/completed transcript segments
2. **Active Segments** - A collection of in-progress/streaming transcript segments

The system does not use polling intervals for transcript data - it relies entirely on WebSocket events for real-time updates.

## Data Flow Architecture

```
┌─────────────────┐     WebSocket Connection     ┌─────────────────┐
│                 │◄───────────────────────────►│                 │
│                 │                              │                 │
│   Server        │     Initial State Load       │    Client       │
│                 │───────────────────────────►│                 │
│                 │                              │                 │
│                 │     Transcript Updates      │                 │
│                 │───────────────────────────►│                 │
└─────────────────┘                              └─────────────────┘
```

## WebSocket Connection Initialization

When a client connects to a meeting, it establishes a WebSocket connection and receives the initial state:

```javascript
// Connection establishment
const ws = new WebSocket(
  `${WS_BASE_URL}/ws/meetings/${meetingId}/transcript?user=${username}`
);

// Initial state handling
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'initial_state') {
    setTranscriptHistory(data.data.transcript.history || []);
    setActiveSegments(data.data.transcript.active_segments || {});
    setParticipants(data.data.participants.current_participants || []);
  }
  // Other message handling...
};
```

## Message Data Structures

### 1. Initial State Message

When a WebSocket connection is established, the server sends an initial state:

```json
{
  "type": "initial_state",
  "data": {
    "transcript": {
      "history": [
        {
          "id": "segment_123",
          "speaker": "John Doe",
          "text": "Previously completed transcript",
          "timestamp": "2023-07-15T14:32:45.123Z",
          "call_time": "00:15",
          "status": "final"
        },
        // More history segments...
      ],
      "active_segments": {
        "segment_456": {
          "id": "segment_456",
          "speaker": "Jane Smith",
          "text": "Currently in-progress transcription",
          "timestamp": "2023-07-15T14:33:12.789Z",
          "call_time": "00:16",
          "status": "streaming"
        }
        // More active segments...
      }
    },
    "participants": {
      "current_participants": [
        // Participant data...
      ]
    }
  }
}
```

### 2. Transcript Update Message

As the meeting progresses, the server sends transcript updates:

```json
{
  "type": "transcript",  // or "transcript_update" depending on implementation
  "data": {
    "id": "segment_456",
    "speaker": "Jane Smith",
    "text": "Updated transcription text as it's being spoken",
    "timestamp": "2023-07-15T14:33:12.789Z",
    "call_time": "00:16",
    "status": "streaming"  // or "final" when complete
  }
}
```

## Transcript Processing Flow

1. **Client receives a transcript segment update**

2. **Message validation**
   ```javascript
   const isMessageValid = (segment) => {
     // Basic validation
     if (!segment?.id || !segment?.speaker || !segment?.text) {
       return false;
     }
     
     // Allow empty streaming updates
     if (segment.text.trim() === '') {
       return true;
     }
     
     // Deduplication
     const messageKey = `${segment.id}-${segment.text.length}-${segment.speaker}`;
     if (processedMessagesRef.current.has(messageKey)) {
       return false;
     }
     
     // Record this message version
     processedMessagesRef.current.add(messageKey);
     
     // Prevent memory leaks
     if (processedMessagesRef.current.size > 1000) {
       const oldestMessages = Array.from(processedMessagesRef.current).slice(0, 500);
       oldestMessages.forEach(key => processedMessagesRef.current.delete(key));
     }
     
     return true;
   };
   ```

3. **Message processing based on status**
   ```javascript
   // For completed/final segments
   if (data.data.status === 'final' || data.data.is_final) {
     // Add to transcript history
     setTranscriptHistory(prev => {
       // Remove any duplicate with same ID
       const withoutDuplicate = prev.filter(item => item.id !== segment.id);
       return [...withoutDuplicate, segment];
     });
     
     // Remove from active segments
     setActiveSegments(prev => {
       const updated = { ...prev };
       delete updated[segment.id];
       return updated;
     });
   } 
   // For in-progress/streaming segments
   else {
     // Update in the active segments map
     setActiveSegments(prev => ({
       ...prev,
       [segment.id]: segment
     }));
   }
   ```

## Key Data Attributes

### Transcript Segment Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | String | Unique identifier for the transcript segment |
| `speaker` | String | Name or identifier of the speaker |
| `text` | String | The actual transcript text content |
| `timestamp` | ISO String | Server timestamp of when the segment was captured |
| `call_time` | String | Duration format (MM:SS) representing elapsed time in meeting |
| `status` | String | Either "final" (completed) or "streaming" (in-progress) |

### Timestamp Formats

The system uses two distinct time formats:

1. **`timestamp` / `capture_time`**: ISO 8601 format (e.g., `2023-07-15T14:32:45.123Z`)
   - Actual wall-clock time when the segment was captured
   - Used for displaying real-world time

2. **`call_time`**: Duration format `MM:SS` (e.g., `00:15`)
   - Represents elapsed time since meeting start
   - Used for positioning in the meeting timeline

The formatting function combines both when displaying timestamps:

```javascript
const formatTimestamp = (callTime, captureTime) => {
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
    // For ISO timestamp format only
    const captureDateTime = new Date(captureTime);
    return captureDateTime.toLocaleTimeString();
  }
};
```

## Rendering Combined Transcript

The rendering logic combines both completed and in-progress transcripts:

```javascript
const renderTranscripts = () => {
  // Combine and sort all segments
  const allSegments = [
    ...transcripts,
    ...Object.values(activeSegments)
  ].sort((a, b) => {
    // Sort by call time (meeting timeline)
    const timeA = a.call_time.split(':').reduce((acc, time) => acc * 60 + parseInt(time), 0);
    const timeB = b.call_time.split(':').reduce((acc, time) => acc * 60 + parseInt(time), 0);
    
    if (timeA !== timeB) return timeA - timeB;
    
    // Secondary sort by capture time
    return new Date(a.capture_time) - new Date(b.capture_time);
  });

  // Render the sorted segments
  return (
    <div className="transcript-container">
      {allSegments.map(segment => (
        <div key={`${segment.id}-${segment.status}`} 
             className={`transcript-segment ${segment.status !== 'final' ? 'streaming' : ''}`}>
          <div className="segment-header">
            <span className="speaker">{segment.speaker}</span>
            <span className="timestamp">
              {formatTimestamp(segment.call_time, segment.timestamp)}
            </span>
          </div>
          <div className="segment-text">{segment.text}</div>
        </div>
      ))}
    </div>
  );
};
```

## Handling Duplicate Segments

Transcript segments with the same ID may arrive multiple times with updated content. The system handles this by:

1. **For streaming updates**: Replacing the segment in `activeSegments` with the newest version
2. **For finalized segments**: 
   - Removing any older version from `transcriptHistory`
   - Adding the final version to `transcriptHistory`
   - Removing the segment from `activeSegments`

The deduplication logic uses a combination of segment ID, text length, and speaker to identify unique versions:

```javascript
const messageKey = `${segment.id}-${segment.text.length}-${segment.speaker}`;
```

## Auto-Scrolling Behavior

The transcript viewer implements auto-scrolling to follow new messages:

```javascript
// Auto-scroll implementation
useEffect(() => {
  if (autoScroll && transcriptRef.current) {
    const element = transcriptRef.current;
    element.scrollTop = element.scrollHeight;
  }
}, [transcripts, activeSegments, autoScroll]);

// Detect when user scrolls away
const handleScroll = (e) => {
  const element = e.target;
  const isAtBottom = Math.abs(
    element.scrollHeight - element.clientHeight - element.scrollTop
  ) < 50;
  
  setAutoScroll(isAtBottom);
};
```

## Heartbeat Mechanism (No Polling)

Rather than polling for updates, the system uses WebSocket heartbeats to maintain connection:

```javascript
// Send heartbeat every 30 seconds
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
}, HEARTBEAT_INTERVAL); // 30000ms (30 seconds)

// Handle heartbeat response
case 'heartbeat_ack':
  missedHeartbeatsRef.current = 0;
  break;
```

## Implementation Example

Here's a complete example of how to implement the transcript handling:

```javascript
import { useState, useRef, useEffect } from 'react';

function TranscriptManager({ meetingId, username }) {
  // State for transcript data
  const [transcriptHistory, setTranscriptHistory] = useState([]);
  const [activeSegments, setActiveSegments] = useState({});
  const [connected, setConnected] = useState(false);
  
  // Refs for connection management
  const wsRef = useRef(null);
  const processedMessagesRef = useRef(new Set());
  
  // Connection management
  useEffect(() => {
    if (!meetingId || !username) return;
    
    // Create WebSocket connection
    const ws = new WebSocket(
      `wss://api.stru.ai/ws/meetings/${meetingId}/transcript?user=${username}`
    );
    
    ws.onopen = () => {
      console.log('Connected to transcript WebSocket');
      setConnected(true);
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // Handle initial state
      if (data.type === 'initial_state') {
        processedMessagesRef.current.clear();
        setTranscriptHistory(data.data.transcript.history || []);
        setActiveSegments(data.data.transcript.active_segments || {});
        return;
      }
      
      // Handle transcript updates
      if (data.type === 'transcript' || data.type === 'transcript_update') {
        const segment = data.data.segment || data.data;
        const isFinal = data.data.is_final || data.data.status === 'final';
        
        // Validate segment
        if (!isMessageValid(segment)) return;
        
        // Process based on status
        if (isFinal) {
          // Move to history
          setTranscriptHistory(prev => {
            const withoutDuplicate = prev.filter(item => item.id !== segment.id);
            return [...withoutDuplicate, segment];
          });
          
          // Remove from active
          setActiveSegments(prev => {
            const updated = { ...prev };
            delete updated[segment.id];
            return updated;
          });
        } else {
          // Update in active segments
          setActiveSegments(prev => ({
            ...prev,
            [segment.id]: segment
          }));
        }
      }
    };
    
    ws.onclose = () => {
      setConnected(false);
      console.log('Disconnected from transcript WebSocket');
    };
    
    wsRef.current = ws;
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [meetingId, username]);
  
  // Validate and deduplicate messages
  const isMessageValid = (segment) => {
    if (!segment?.id || !segment?.speaker) return false;
    
    // Create unique key for this version
    const messageKey = `${segment.id}-${segment.text?.length || 0}-${segment.speaker}`;
    
    // Check if duplicate
    if (processedMessagesRef.current.has(messageKey)) return false;
    
    // Add to processed messages
    processedMessagesRef.current.add(messageKey);
    
    // Cleanup if needed
    if (processedMessagesRef.current.size > 1000) {
      const oldestMessages = Array.from(processedMessagesRef.current).slice(0, 500);
      oldestMessages.forEach(key => processedMessagesRef.current.delete(key));
    }
    
    return true;
  };
  
  // Render transcript components
  return (
    <div className="transcript-container">
      <div className="status-indicator">
        {connected ? 'Connected' : 'Disconnected'}
      </div>
      
      {/* Render transcript segments */}
      <div className="segments-container">
        {[...transcriptHistory, ...Object.values(activeSegments)]
          .sort((a, b) => {
            // Sort by call_time
            const timeA = a.call_time.split(':').reduce((acc, time) => acc * 60 + parseInt(time), 0);
            const timeB = b.call_time.split(':').reduce((acc, time) => acc * 60 + parseInt(time), 0);
            
            if (timeA !== timeB) return timeA - timeB;
            return new Date(a.timestamp) - new Date(b.timestamp);
          })
          .map(segment => (
            <div 
              key={`${segment.id}-${segment.status || (segment.id in activeSegments ? 'active' : 'final')}`}
              className={`segment ${segment.id in activeSegments ? 'active' : 'final'}`}
            >
              <div className="segment-header">
                <span className="speaker">{segment.speaker}</span>
                <span className="timestamp">
                  {segment.call_time} - {new Date(segment.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="segment-text">{segment.text}</div>
            </div>
          ))
        }
      </div>
    </div>
  );
}
```

## Best Practices and Recommendations

1. **Maintain Separate Data Stores**
   - Keep completed transcripts in `transcriptHistory` array
   - Keep in-progress transcripts in `activeSegments` object (using ID as key)

2. **Handle Duplicates**
   - Use a combination of ID + text length + speaker to identify unique versions
   - Use a Set or similar structure to track processed message versions
   - Limit the size of the tracking structure to prevent memory leaks

3. **Optimize Rendering**
   - Sort all segments by call_time (and secondarily by timestamp)
   - Use stable keys for React components (combination of ID and status)
   - Implement virtualization for very long transcripts

4. **Connection Management**
   - Implement reconnection logic with exponential backoff
   - Use heartbeats rather than polling
   - Clear transcript state on reconnection to prevent duplicates

5. **Time Display**
   - Show both meeting duration (call_time) and real-world time when possible
   - Format timestamps consistently throughout the application
