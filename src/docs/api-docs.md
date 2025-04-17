# Transcript Viewer API Documentation

## Base URLs

- **API Base URL**:
    - Production: `https://api.stru.ai`
- **WebSocket Base URL**:
    - Production: `wss://api.stru.ai`

## Authentication

The API uses a simple username-based authentication system. All requests require a `X-Username` header.

## REST API Endpoints

### Authentication

### Login

- **Endpoint**: `POST /api/auth/login`
- **Headers**:
    - `Content-Type: application/json`
    - `X-Username: {username}`
- **Body**: `{ "username": "{username}" }`
- **Response**: JSON object containing authentication status

### Logout

- **Endpoint**: `POST /api/auth/logout`
- **Headers**:
    - `Content-Type: application/json`
    - `X-Username: {username}`
- **Body**: `{ "username": "{username}" }`
- **Response**: JSON object confirming logout

### Meetings

### Get User Meetings

- **Endpoint**: `GET /api/meetings/user`
- **Headers**: `X-Username: {username}`
- **Response**: Array of meeting objects associated with the user

### Create Meeting

- **Endpoint**: `POST /api/meetings/create`
- **Headers**:
    - `Content-Type: application/json`
    - `X-Username: {username}`
- **Body**: `{ "name": "{meeting_name}", "creator": "{username}" }`
- **Response**: JSON object containing the created meeting details

### End Meeting

- **Endpoint**: `POST /api/meetings/{meetingId}/end`
- **Headers**: `X-Username: {username}`
- **Response**: JSON object confirming meeting has ended

### Delete Meeting

- **Endpoint**: `DELETE /api/meetings/{meetingId}`
- **Headers**: `X-Username: {username}`
- **Response**: JSON object confirming meeting has been deleted
- **Note**: Cannot delete an active meeting (409 Conflict error)

### Get Meeting Transcript

- **Endpoint**: `GET /api/meetings/{meetingId}/transcript`
- **Headers**: `X-Username: {username}`
- **Response**: JSON object containing the meeting transcript

### Join Meeting

- **Endpoint**: `POST /api/meetings/{meetingId}/participants/add`
- **Headers**:
    - `Content-Type: application/json`
    - `X-Username: {username}`
- **Body**: `{ "username": "{username}", "meeting_id": "{meetingId}" }`
- **Response**: JSON object confirming user has joined the meeting

## WebSocket API

### Transcript WebSocket Connection

- **URL**: `{WS_BASE_URL}/ws/meetings/{meetingId}/transcript?user={username}`
- **Parameters**:
    - `meetingId`: ID of the meeting to connect to
    - `user` (query parameter): Username of the connecting user

### WebSocket Message Types

### Outgoing Messages (Client to Server)

1. **Ping/Heartbeat**
    
    ```json
    { "type": "heartbeat" }
    
    ```
    
2. **Heartbeat Acknowledgment**
    
    ```json
    { "type": "heartbeat_ack" }
    
    ```
    

### Incoming Messages (Server to Client)

1. **Initial State**
    
    ```json
    {
      "type": "initial_state",
      "data": {
        "transcript": {
          "history": [...],
          "active_segments": {...}
        },
        "participants": {
          "current_participants": [...]
        }
      }
    }
    
    ```
    
2. **Transcript Update**
    
    ```json
    {
      "type": "transcript_update",
      "data": {
        "segment": {
          "id": "segment_id",
          "speaker": "speaker_name",
          "text": "transcript text",
          "timestamp": "ISO timestamp"
        },
        "is_final": true/false
      }
    }
    
    ```
    
3. **Participant Update**
    
    ```json
    {
      "type": "participant_update",
      "data": {
        "participants": [...]
      }
    }
    
    ```
    
4. **Meeting Ended**
    
    ```json
    { "type": "meeting_ended" }
    
    ```
    
5. **Heartbeat**
    
    ```json
    { "type": "heartbeat" }
    
    ```
    
6. **Heartbeat Acknowledgment**
    
    ```json
    { "type": "heartbeat_ack" }
    
    ```
    

### Heartbeat Mechanism

The client and server maintain a bidirectional heartbeat system to ensure the connection remains active:

1. **Client-initiated heartbeat**:
    - Client sends a heartbeat message every 30 seconds: `{ "type": "heartbeat" }`
    - Server responds with acknowledgment: `{ "type": "heartbeat_ack" }`
    - If client misses 3 consecutive acknowledgments, it will initiate a reconnection
2. **Server-initiated heartbeat** (for some implementations):
    - Server sends heartbeat message: `{ "type": "heartbeat" }`
    - Client responds with: `{ "type": "heartbeat_ack" }`

### Reconnection Strategy

The client implements an exponential backoff strategy for reconnections:

- Initial retry delay: 1000ms (1 second)
- Maximum reconnection attempts: 5
- Exponential backoff formula: `min(INITIAL_RETRY_DELAY * 2^attempt, MAX_RECONNECT_DELAY)`
- Maximum delay cap: 30 seconds

Automatic reconnection is triggered by:

1. Connection failure
2. Heartbeat failure (3 missed acknowledgments)
3. Tab visibility change (when tab becomes visible)
4. Network status change (when coming back online)

## Client Implementation Examples

### Connecting to the Transcript WebSocket

```jsx
const ws = new WebSocket(
  `wss://api.stru.ai/ws/meetings/${meetingId}/transcript?user=${username}`
);

ws.onopen = () => {
  console.log('Connected to meeting transcript');
  // Start heartbeat interval
  startHeartbeatInterval();
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle different message types
  switch (data.type) {
    case 'initial_state':
      // Handle initial state
      break;
    case 'transcript_update':
      // Handle transcript update
      break;
    // Handle other message types
  }
};

```

### Implementing Heartbeat

```jsx
function startHeartbeatInterval() {
  const interval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "heartbeat" }));
      missedHeartbeats++;

      if (missedHeartbeats > MAX_MISSED_HEARTBEATS) {
        console.log('Too many missed heartbeats, reconnecting...');
        clearInterval(interval);
        reconnect();
      }
    }
  }, 30000); // 30 seconds

  return interval;
}

```

### RESTful API Request Example

```jsx
// Login example
async function login(username) {
  const response = await fetch('<https://api.stru.ai/api/auth/login>', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Username': username
    },
    body: JSON.stringify({ username })
  });

  if (!response.ok) {
    throw new Error(await response.text() || 'Login failed');
  }

  return response.json();
}

```

This documentation covers all the API endpoints, WebSocket functionality, and heartbeat mechanisms implemented in the transcript viewer application.
