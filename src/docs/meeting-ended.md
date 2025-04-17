
# Meeting End Detection Documentation

## Overview

The system provides multiple mechanisms to detect when a meeting has ended:

1. **WebSocket Event Notification**: The server sends a specific `meeting_ended` event
2. **Meeting Object Status Check**: The `is_active` flag on the meeting object
3. **Manual Ending**: The meeting creator can explicitly end a meeting
4. **End Time Check**: The presence of `end_time` indicates a meeting has ended

## WebSocket Event Notification

The primary mechanism for real-time meeting end detection is the WebSocket `meeting_ended` event:

```javascript
// Server sends a notification via WebSocket
{
  "type": "meeting_ended"
}
```

### Handling Meeting Ended Events

The client processes this event in the WebSocket message handler:

```javascript
// In transcriptHandlers.js
const handleWebSocketMessage = (data) => {
  switch (data.type) {
    // Other cases...
    case 'meeting_ended':
      handleMeetingEnded();
      break;
    // Other cases...
  }
};

const handleMeetingEnded = () => {
  // Update UI state to show meeting has ended
  setMeetingEnded(true);
  
  // Update the meeting object in state
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
```

## Meeting Object Status

Each meeting object contains an `is_active` flag that indicates the meeting's current status:

```javascript
const meeting = {
  id: "meeting_123",
  name: "Team Standup",
  creator: "john.doe",
  start_time: "2023-07-15T14:00:00Z",
  is_active: true,  // Changes to false when meeting ends
  end_time: null    // Updated with timestamp when meeting ends
};
```

### Checking Meeting Status

You can check if a meeting has ended by examining its `is_active` property:

```javascript
function isMeetingActive(meeting) {
  return meeting.is_active === true;
}

function isMeetingEnded(meeting) {
  return !meeting.is_active || meeting.end_time !== null;
}
```

## Manual Meeting Ending

Meeting creators can explicitly end a meeting through the API:

```javascript
// API call to end a meeting
const endMeeting = async (meetingId, username) => {
  const response = await fetch(`${API_BASE_URL}/api/meetings/${meetingId}/end`, {
    method: 'POST',
    headers: {
      'X-Username': username
    }
  });

  if (!response.ok) {
    throw new Error(await response.text() || 'Failed to end meeting');
  }

  return response.json();
};
```

### UI Implementation for Ending Meetings

```javascript
const handleEndMeeting = async (e) => {
  e.stopPropagation();
  setLoading(true);
  setError(null);

  try {
    // Make API call to end the meeting
    const response = await fetch(
      `https://api.stru.ai/api/meetings/${meeting.id}/end`,
      {
        method: 'POST',
        headers: { 'X-Username': username }
      }
    );

    if (!response.ok) throw new Error('Failed to end meeting');

    // Update local state to reflect meeting has ended
    onUpdate(prev => prev.map(m =>
      m.id === meeting.id
        ? { ...m, is_active: false, end_time: new Date().toISOString() }
        : m
    ));
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

## WebSocket Reconnection Logic

The system's reconnection logic considers meeting status when deciding whether to reconnect:

```javascript
ws.onclose = (event) => {
  console.log('WebSocket closed:', event.code, event.reason);
  clearConnection();
  
  // Only attempt to reconnect if the meeting is still active
  if (meeting?.is_active && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
    const delay = Math.min(
      INITIAL_RETRY_DELAY * Math.pow(2, reconnectAttemptsRef.current),
      30000
    );
    
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptsRef.current++;
      connectWebSocket();
    }, delay);
  }
};
```

## UI Indicators for Meeting Status

The UI displays different indicators based on meeting status:

```javascript
{/* Status indicator */}
<div className="flex justify-between text-gray-400">
  <span>Status</span>
  <span className={meeting.is_active ? 'text-green-400' : 'text-gray-300'}>
    {meeting.is_active ? 'Active' : 'Ended'}
  </span>
</div>

{/* Live indicator shown only for active meetings */}
{meeting.is_active && (
  <div className="flex items-center text-green-400 text-xs font-medium 
                  px-2 py-1 rounded-full bg-green-500/10">
    <span className="w-2 h-2 bg-green-400 rounded-full mr-1.5 animate-pulse"></span>
    LIVE
  </div>
)}

{/* Show end time for ended meetings */}
{meeting.end_time && (
  <div className="flex justify-between text-gray-400">
    <span>Ended</span>
    <span className="text-gray-300">
      {formatDateTime(meeting.end_time)}
    </span>
  </div>
)}
```

## Meeting End Lifecycle

1. **Initial State**: 
   ```javascript
   meeting = {
     id: "meeting_123",
     is_active: true,
     end_time: null
   }
   ```

2. **Meeting End Triggered**:
   - Either via API call by the creator
   - Or via server-side decision (timeout, admin action, etc.)

3. **Server Updates Meeting**:
   ```javascript
   meeting = {
     id: "meeting_123",
     is_active: false,
     end_time: "2023-07-15T15:30:00Z"
   }
   ```

4. **WebSocket Notification Sent**:
   ```javascript
   {
     "type": "meeting_ended"
   }
   ```

5. **Client Processes End Event**:
   - Updates UI to show meeting has ended
   - Stops attempting to reconnect WebSocket if disconnected
   - Enables delete option for the meeting creator
   - Disables the "End Meeting" button

## Implementation Example

Here's a complete example of detecting and handling meeting end events:

```javascript
import { useEffect, useState, useRef } from 'react';

function MeetingManager({ meetingId, username }) {
  const [meeting, setMeeting] = useState(null);
  const [isEnded, setIsEnded] = useState(false);
  const wsRef = useRef(null);
  
  // Fetch meeting details
  useEffect(() => {
    async function fetchMeeting() {
      try {
        const response = await fetch(`https://api.stru.ai/api/meetings/${meetingId}`, {
          headers: { 'X-Username': username }
        });
        
        if (response.ok) {
          const meetingData = await response.json();
          setMeeting(meetingData);
          setIsEnded(!meetingData.is_active);
        }
      } catch (error) {
        console.error('Error fetching meeting:', error);
      }
    }
    
    fetchMeeting();
  }, [meetingId, username]);
  
  // Setup WebSocket connection
  useEffect(() => {
    if (!meeting) return;
    
    const ws = new WebSocket(
      `wss://api.stru.ai/ws/meetings/${meetingId}/transcript?user=${username}`
    );
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // Handle meeting ended event
      if (data.type === 'meeting_ended') {
        console.log('Meeting has ended via WebSocket notification');
        setIsEnded(true);
        setMeeting(prev => ({ ...prev, is_active: false, end_time: new Date().toISOString() }));
      }
    };
    
    wsRef.current = ws;
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [meeting, meetingId, username]);
  
  // Function to manually end meeting
  const endMeeting = async () => {
    try {
      const response = await fetch(`https://api.stru.ai/api/meetings/${meetingId}/end`, {
        method: 'POST',
        headers: { 'X-Username': username }
      });
      
      if (response.ok) {
        console.log('Meeting ended successfully via API');
        setIsEnded(true);
        setMeeting(prev => ({ ...prev, is_active: false, end_time: new Date().toISOString() }));
      }
    } catch (error) {
      console.error('Error ending meeting:', error);
    }
  };
  
  return (
    <div>
      <h1>{meeting?.name || 'Loading...'}</h1>
      
      <div className="status-indicator">
        Status: {isEnded ? 'Ended' : 'Active'}
        {!isEnded && <span className="live-indicator">LIVE</span>}
      </div>
      
      {meeting?.creator === username && !isEnded && (
        <button onClick={endMeeting}>End Meeting</button>
      )}
      
      {isEnded && (
        <div className="ended-info">
          <p>This meeting ended {meeting?.end_time ? new Date(meeting.end_time).toLocaleString() : 'recently'}</p>
        </div>
      )}
    </div>
  );
}
```

## Best Practices

1. **Multiple Detection Methods**
   - Always check both `is_active` flag and WebSocket events
   - Handle reconnection logic differently for ended vs. active meetings

2. **UI Clarity**
   - Clearly indicate to users when a meeting has ended
   - Disable actions that are not applicable to ended meetings

3. **Graceful Reconnection**
   - Don't attempt to reconnect to ended meetings
   - If reconnection fails and you're not sure of meeting status, make an API call to check

4. **Meeting Creator Controls**
   - Only show meeting end controls to the meeting creator
   - After a meeting ends, show deletion controls to the creator

5. **Error Handling**
   - Handle cases where the WebSocket disconnects without a meeting_ended event
   - Periodically verify meeting status if long-running connections are expected
