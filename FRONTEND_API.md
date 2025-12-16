# Stru Meet Frontend API Guide

Complete API reference for frontend developers building on top of Stru Meet.

## Base URLs

| Environment | HTTP | WebSocket |
|-------------|------|-----------|
| Local Dev | `http://127.0.0.1:8000` | `ws://127.0.0.1:8000` |
| Production | `https://your-api.com` | `wss://your-api.com` |

## Authentication

All requests require a Firebase JWT token in the Authorization header:

```
Authorization: Bearer <firebase-id-token>
```

---

### Firebase Auth Implementation (Frontend)

#### 1. Install Firebase SDK

```bash
npm install firebase
```

#### 2. Initialize Firebase

```typescript
// src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  // ... other config
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
```

#### 3. Sign In with Google

```typescript
// src/lib/auth.ts
import { auth } from './firebase';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';

const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const idToken = await result.user.getIdToken();
    return { user: result.user, token: idToken };
  } catch (error) {
    console.error('Sign in failed:', error);
    throw error;
  }
}

export async function logout() {
  await signOut(auth);
}
```

#### 4. Auth Context (React)

```typescript
// src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Get fresh token (auto-refreshes if expired)
        const idToken = await user.getIdToken();
        setToken(idToken);
      } else {
        setToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Refresh token periodically (tokens expire after 1 hour)
  useEffect(() => {
    if (!user) return;

    const refreshToken = async () => {
      const newToken = await user.getIdToken(true); // force refresh
      setToken(newToken);
    };

    // Refresh every 55 minutes
    const interval = setInterval(refreshToken, 55 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, token, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

#### 5. API Client with Auth

```typescript
// src/lib/api.ts
import { useAuth } from '../contexts/AuthContext';

const API_URL = 'http://127.0.0.1:8000/api/2/graphql';

export async function graphqlRequest(
  token: string,
  operationName: string,
  query: string,
  variables: Record<string, any> = {}
) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      operationName,
      query,
      variables,
    }),
  });

  const json = await response.json();
  if (json.errors) {
    throw new Error(json.errors[0].message);
  }
  return json.data;
}

// React hook for API calls
export function useApi() {
  const { token } = useAuth();

  return {
    query: (operationName: string, query: string, variables?: Record<string, any>) =>
      graphqlRequest(token!, operationName, query, variables),
  };
}
```

#### 6. WebSocket with Auth (Subscriptions)

```typescript
// src/lib/websocket.ts
import { createClient } from 'graphql-ws';

export function createAuthenticatedWsClient(token: string) {
  return createClient({
    url: 'ws://127.0.0.1:8000/api/2/graphql',
    connectionParams: {
      authorization: token,
    },
    // Reconnect on connection lost
    retryAttempts: 5,
    shouldRetry: () => true,
  });
}

// Usage with subscriptions
export function subscribeToAgentRun(
  client: ReturnType<typeof createClient>,
  agentRunId: string,
  onData: (data: any) => void
) {
  return client.subscribe(
    {
      query: `
        subscription AgentRunUpdates($agentRunId: ID!) {
          agentRun(agentRunId: $agentRunId) {
            id
            status
            updatedAt
            hasUsedAICredit
            conversationHistory {
              __typename
              ... on AgentConversationHistoryItemUser {
                id
                role
                status
                timestamp
                content
              }
              ... on AgentConversationHistoryItemAssistant {
                id
                role
                status
                timestamp
                content
                quickReplies
              }
            }
          }
        }
      `,
      variables: { agentRunId },
    },
    {
      next: (data) => onData(data.data),
      error: (err) => console.error('Subscription error:', err),
      complete: () => console.log('Subscription complete'),
    }
  );
}
```

#### 7. Protected Routes

```typescript
// src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
}
```

---

### Backend Token Verification

| Mode | Environment Variable | Behavior |
|------|---------------------|----------|
| **Development** | `DEV_MODE=true` (default) | Decodes any JWT, no verification |
| **Production** | `DEV_MODE=false` | Verifies with Firebase Admin SDK |

**Development mode (`DEV_MODE=true`):**
- Just decodes the JWT payload
- No signature verification
- Accepts any user_id

**Production mode (`DEV_MODE=false`):**
1. Frontend calls `user.getIdToken()` to get Firebase ID token
2. Sends token in `Authorization: Bearer <token>` header
3. Backend calls `firebase_auth.verify_id_token(token)`
4. If valid, extracts `uid`, `email`, `name`
5. If invalid/expired, returns 401 Unauthorized

**To enable production mode:**
```bash
export DEV_MODE=false
python server/main.py
```

---

### Test Token (Development Only)

When `DEV_MODE=true` (default), the backend accepts this test token for local development:

```
eyJhbGciOiAibm9uZSIsICJ0eXAiOiAiSldUIn0.eyJ1c2VyX2lkIjogIkhZR2J3VWEwc3JmTnFiZ2RGVmdZcnVkZWxpNTMiLCAic3ViIjogIkhZR2J3VWEwc3JmTnFiZ2RGVmdZcnVkZWxpNTMiLCAiZW1haWwiOiAiYmhvc2hhZ2FAZ21haWwuY29tIiwgIm5hbWUiOiAiQmhvc2hhZ2EgTWl0cnJhbiIsICJwaWN0dXJlIjogImh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL2RlZmF1bHQtdXNlciJ9.test_signature
```

**Test user:**
```json
{
  "user_id": "HYGbwUa0srfNqbgdFVgYrudeli53",
  "email": "bhoshaga@gmail.com",
  "name": "Bhoshaga Mitrran"
}
```

**curl example:**
```bash
export TOKEN="eyJhbGciOiAibm9uZSIsICJ0eXAiOiAiSldUIn0.eyJ1c2VyX2lkIjogIkhZR2J3VWEwc3JmTnFiZ2RGVmdZcnVkZWxpNTMiLCAic3ViIjogIkhZR2J3VWEwc3JmTnFiZ2RGVmdZcnVkZWxpNTMiLCAiZW1haWwiOiAiYmhvc2hhZ2FAZ21haWwuY29tIiwgIm5hbWUiOiAiQmhvc2hhZ2EgTWl0cnJhbiIsICJwaWN0dXJlIjogImh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL2RlZmF1bHQtdXNlciJ9.test_signature"

curl -X POST http://127.0.0.1:8000/api/2/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"query":"{ meetings(type: MyMeetings, filter: {}) { meetings { id title } } }"}'
```

> **Warning:** Test tokens are NOT verified. Never use `DEV_MODE=true` in production!

---

## GraphQL Endpoint

**URL**: `/api/2/graphql`

**Method**: POST (queries/mutations) or WebSocket (subscriptions)

**Headers**:
```
Content-Type: application/json
Authorization: Bearer <token>
```

---

# Meetings

## Get Meeting (without transcript)

```graphql
query GetMeeting($meetingId: ID!) {
  meeting(id: $meetingId) {
    id
    title
    platform
    created
    modified
    participants {
      name
      analytics { textLength }
    }
    labels { id name color }
    permissions { canEdit canDelete canShare }
  }
}
```

**Variables**:
```json
{ "meetingId": "a5ea703731bb38fe443a" }
```

**Response**:
```json
{
  "data": {
    "meeting": {
      "id": "a5ea703731bb38fe443a",
      "title": "Team Standup",
      "platform": "GOOGLE_MEET",
      "created": 1765848765845,
      "modified": 1765848836246,
      "participants": [
        { "name": "John Doe", "analytics": { "textLength": 1234 } }
      ],
      "labels": [],
      "permissions": {
        "canEdit": true,
        "canDelete": true,
        "canShare": true
      }
    }
  }
}
```

---

## Get Meeting with Transcript

Uses the same `meeting(id:)` resolver as GetMeeting. Transcript is included when requested.

```graphql
query meetingWithTranscript($meetingId: ID!) {
  meeting(id: $meetingId) {
    id
    title
    platform
    transcript {
      id
      blocks {
        messageId
        speakerName
        transcript
        timestamp
        tags
        isPinned
        isDeleted
      }
    }
  }
}
```

**Variables**:
```json
{ "meetingId": "a5ea703731bb38fe443a" }
```

**Debug with curl**:

Request body (save as `request.json`):
```json
{
  "operationName": "meetingWithTranscript",
  "variables": { "meetingId": "3903e170a18c20c44326" },
  "query": "query meetingWithTranscript($meetingId: ID!) { meeting(id: $meetingId) { id title transcript { id blocks { speakerName transcript timestamp } } } }"
}
```

```bash
curl -s -X POST http://127.0.0.1:8000/api/2/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d @request.json
```

**Response**:
```json
{
  "data": {
    "meeting": {
      "id": "a5ea703731bb38fe443a",
      "title": "Team Standup",
      "platform": "GOOGLE_MEET",
      "transcript": {
        "id": "ghx-uqur-jaa",
        "blocks": [
          {
            "messageId": "u1/@spaces/xxx/devices/403",
            "speakerName": "John Doe",
            "transcript": "Hello everyone, let's get started.",
            "timestamp": 1765848770748,
            "tags": [],
            "isPinned": false,
            "isDeleted": false
          }
        ]
      }
    }
  }
}
```

---

## List User Meetings

```graphql
query ListMeetings(
  $type: MeetingType!
  $spaceId: ID
  $offset: Int
  $filter: SearchFilterInput!
  $sortBy: SortBy
  $includeAiOutputs: Boolean
) {
  meetings(
    type: $type
    spaceId: $spaceId
    offset: $offset
    filter: $filter
    sortBy: $sortBy
    includeAiOutputs: $includeAiOutputs
  ) {
    type
    spaceId
    offset
    hasMore
    meetings {
      id
      title
      platform
      participants { name analytics { textLength } }
      access
      accessType
      duration
      speechDuration
      created
      modified
      hasEnded
      hasAiOutputs
    }
  }
}
```

**Variables**:
```json
{
  "type": "MyMeetings",
  "spaceId": null,
  "offset": 0,
  "filter": { "query": null },
  "sortBy": "CREATED_NEWEST_FIRST",
  "includeAiOutputs": true
}
```

**Enums**:

`MeetingType`:
- `MyMeetings` - User's own meetings
- `SharedWithMe` - Meetings shared with user

`SortBy`:
- `CREATED_NEWEST_FIRST`
- `CREATED_OLDEST_FIRST`
- `MODIFIED_NEWEST_FIRST`
- `MODIFIED_OLDEST_FIRST`

**Response**:
```json
{
  "data": {
    "meetings": {
      "type": "MyMeetings",
      "spaceId": null,
      "offset": 0,
      "hasMore": false,
      "meetings": [
        {
          "id": "a5ea703731bb38fe443a",
          "title": "Team Standup",
          "platform": "GOOGLE_MEET",
          "participants": [
            { "name": "John Doe", "analytics": { "textLength": 1234 } }
          ],
          "access": "ADMIN",
          "accessType": "OWNER",
          "duration": 3600,
          "speechDuration": 2400,
          "created": 1765848765845,
          "modified": 1765848836246,
          "hasEnded": true,
          "hasAiOutputs": false
        }
      ]
    }
  }
}
```

---

## Archive Meeting (Soft Delete)

```graphql
mutation ArchiveMeeting($input: ArchiveMeetingInput!) {
  archiveMeeting(input: $input) {
    success
  }
}
```

**Variables**:
```json
{
  "input": {
    "id": "a5ea703731bb38fe443a"
  }
}
```

**Response**:
```json
{
  "data": {
    "archiveMeeting": {
      "success": true
    }
  }
}
```

---

## Update Meeting

```graphql
mutation UpdateMeeting($input: UpdateMeetingInput!) {
  updateMeeting(input: $input) {
    success
    errors { message statusCode }
  }
}
```

**Variables**:
```json
{
  "input": {
    "id": "a5ea703731bb38fe443a",
    "title": "New Meeting Title",
    "rawTranscript": {
      "id": "meeting-code",
      "blocks": [...]
    }
  }
}
```

**Response**:
```json
{
  "data": {
    "updateMeeting": {
      "success": true,
      "errors": []
    }
  }
}
```

---

# Sharing

## Share Meeting

```graphql
mutation ShareMeeting($input: ShareMeetingInput!) {
  shareMeeting(input: $input) {
    success
    shareId
  }
}
```

**Variables**:
```json
{
  "input": {
    "meetingId": "a5ea703731bb38fe443a",
    "sharedWithEmail": "colleague@company.com",
    "accessLevel": "VIEW"
  }
}
```

**Access Levels**:
- `VIEW` - Can view meeting and transcript
- `EDIT` - Can edit transcript, add tags, tasks
- `ADMIN` - Can share with others, delete

**Response**:
```json
{
  "data": {
    "shareMeeting": {
      "success": true,
      "shareId": "share_abc123"
    }
  }
}
```

---

## Get Meeting Shares

```graphql
query GetMeetingShares($meetingId: ID!) {
  getMeetingShares(meetingId: $meetingId) {
    id
    sharedWithEmail
    sharedWithUserId
    displayName
    photoUrl
    accessLevel
    sharedAt
  }
}
```

**Variables**:
```json
{ "meetingId": "a5ea703731bb38fe443a" }
```

**Response**:
```json
{
  "data": {
    "getMeetingShares": [
      {
        "id": "share_abc123",
        "sharedWithEmail": "colleague@company.com",
        "sharedWithUserId": "user_xyz",
        "displayName": "Jane Smith",
        "photoUrl": "https://...",
        "accessLevel": "VIEW",
        "sharedAt": 1765848765845
      }
    ]
  }
}
```

---

## List Meetings Shared With Me

Use the `ListMeetings` query with `type: "SharedWithMe"`:

```graphql
query ListMeetings($type: MeetingType!, ...) {
  meetings(type: $type, ...) {
    meetings { ... }
    hasMore
  }
}
```

**Variables**:
```json
{
  "type": "SharedWithMe",
  "offset": 0,
  "filter": {}
}
```

---

## Remove Share

```graphql
mutation RemoveShare($input: RemoveShareInput!) {
  removeShare(input: $input) {
    success
  }
}
```

**Variables**:
```json
{
  "input": {
    "shareId": "share_abc123"
  }
}
```

---

## Update Meeting Sharing (Copy Link)

Enable/disable link sharing for a meeting. When `reach` is not `PRIVATE`, a unique share key is generated that can be used to access the meeting via `/s/{shareKey}`.

```graphql
mutation UpdateMeetingSharing($input: UpdateMeetingSharingInput!) {
  updateMeetingSharing(input: $input) {
    key
    reach
    expiry
  }
}
```

**Variables**:
```json
{
  "input": {
    "meetingId": "a5ea703731bb38fe443a",
    "reach": "ANYONE_WITH_LINK",
    "expiry": null
  }
}
```

**Reach Values**:
- `PRIVATE` - No link sharing (clears the share key)
- `ANYONE_WITH_LINK` - Anyone with the link can view
- `PUBLIC` - Listed publicly (if applicable)

**Response**:
```json
{
  "data": {
    "updateMeetingSharing": {
      "key": "abc123xyz789",
      "reach": "ANYONE_WITH_LINK",
      "expiry": 0
    }
  }
}
```

**Notes**:
- `key` is the unique share key for the URL
- `expiry` is timestamp in ms (0 = no expiry)
- When reach is changed back to `PRIVATE`, the share key is cleared

---

## Access Shared Meeting (Public Endpoint)

Access a meeting via share link without authentication.

**Endpoint**: `GET /s/{shareKey}`

**Example**:
```bash
curl http://127.0.0.1:8000/s/abc123xyz789
```

**Response**:
```json
{
  "id": "a5ea703731bb38fe443a",
  "title": "Team Sync",
  "platform": "GOOGLE_MEET",
  "duration": 3600,
  "speechDuration": 2800,
  "created": 1765848765845,
  "languageCode": "en-US",
  "participants": [
    {
      "name": "Alice",
      "analytics": {
        "textLength": 1500,
        "speechDuration": 1200
      }
    }
  ],
  "transcript": {
    "blocks": [
      {
        "messageId": "u1/@spaces/xxx/devices/552",
        "speakerName": "Alice",
        "transcript": "Hello everyone!",
        "timestamp": 0
      }
    ]
  }
}
```

**Error Responses**:
- `404` - Meeting not found or link expired
- `503` - Database not available

---

## Meeting `sharingLink` Field

The Meeting type now includes a `sharingLink` field:

```graphql
query GetMeeting($meetingId: ID!) {
  meeting(id: $meetingId) {
    id
    title
    sharingLink {
      key
      reach
      expiry
    }
  }
}
```

**Response**:
```json
{
  "data": {
    "meeting": {
      "id": "a5ea703731bb38fe443a",
      "title": "Team Sync",
      "sharingLink": {
        "key": "abc123xyz789",
        "reach": "ANYONE_WITH_LINK",
        "expiry": 0
      }
    }
  }
}
```

---

# Tasks

## List Tasks for Meeting

```graphql
query ListTasks($input: TasksInput!) {
  tasks(input: $input) {
    tasks {
      id
      title
      description
      status
      priority
      createdAt
      updatedAt
      completed
      dueTime
      createdBy { uid displayName photoURL }
      assignedTo { uid displayName photoURL }
      meetingId
      tags
      source
    }
    hasMore
    totalCount
  }
}
```

**Variables**:
```json
{
  "input": {
    "meetingId": "a5ea703731bb38fe443a",
    "limit": 100
  }
}
```

**Response**:
```json
{
  "data": {
    "tasks": {
      "tasks": [
        {
          "id": "task_123",
          "title": "Follow up with client",
          "description": "Send proposal by Friday",
          "status": "PENDING",
          "priority": "HIGH",
          "createdAt": 1765848765845,
          "updatedAt": 1765848765845,
          "completed": false,
          "dueTime": null,
          "createdBy": {
            "uid": "user_abc",
            "displayName": "John Doe",
            "photoURL": "https://..."
          },
          "assignedTo": null,
          "meetingId": "a5ea703731bb38fe443a",
          "tags": [],
          "source": "MANUAL"
        }
      ],
      "hasMore": false,
      "totalCount": 1
    }
  }
}
```

---

## Create Task

```graphql
mutation CreateTask($input: CreateTaskInput!) {
  createTask(input: $input) {
    success
    task {
      id
      title
      status
    }
  }
}
```

**Variables**:
```json
{
  "input": {
    "title": "Review meeting notes",
    "description": "Summarize key points",
    "meetingId": "a5ea703731bb38fe443a",
    "priority": "MEDIUM",
    "assignedToUserId": "user_xyz",
    "dueTime": { "date": "2025-01-15" },
    "tags": ["review", "notes"]
  }
}
```

**Priority Values**: `LOW`, `MEDIUM`, `HIGH`

**Source Values**: `MANUAL`, `AI`

**Response**:
```json
{
  "data": {
    "createTask": {
      "success": true,
      "task": {
        "id": "task_456",
        "title": "Review meeting notes",
        "status": "PENDING"
      }
    }
  }
}
```

---

## Update Task

```graphql
mutation UpdateTask($input: UpdateTaskInput!) {
  updateTask(input: $input) {
    success
  }
}
```

**Variables**:
```json
{
  "input": {
    "taskId": "task_123",
    "title": "Updated title",
    "status": "COMPLETED",
    "priority": "LOW",
    "assignedToUserId": "user_xyz"
  }
}
```

**Status Values**: `PENDING`, `IN_PROGRESS`, `COMPLETED`

---

## Delete Task

```graphql
mutation DeleteTask($input: DeleteTaskInput!) {
  deleteTask(input: $input) {
    success
  }
}
```

**Variables**:
```json
{
  "input": {
    "taskId": "task_123"
  }
}
```

---

# AI Chat

## Start AI Conversation

```graphql
mutation StartAgentRun($input: StartAgentRunInput!) {
  startAgentRun(input: $input) {
    success
    agentRunId
  }
}
```

**Variables**:
```json
{
  "input": {
    "prompt": "What were the main action items from this meeting?",
    "context": [
      { "id": "a5ea703731bb38fe443a", "type": "meeting" }
    ],
    "triggeredBy": "WebApp",
    "entryMethod": "custom_user_prompt"
  }
}
```

**Response**:
```json
{
  "data": {
    "startAgentRun": {
      "success": true,
      "agentRunId": "agent_abc123"
    }
  }
}
```

**Important**: After receiving `agentRunId`, subscribe to `AgentRunUpdates` via WebSocket to receive streaming response.

---

## Continue AI Conversation

```graphql
mutation ContinueAgentRun($input: ContinueAgentRunInput!) {
  continueAgentRun(input: $input) {
    success
  }
}
```

**Variables**:
```json
{
  "input": {
    "agentRunId": "agent_abc123",
    "userInput": "Can you elaborate on the second point?",
    "context": [
      { "id": "a5ea703731bb38fe443a", "type": "meeting" }
    ]
  }
}
```

---

## Get AI Conversation History

```graphql
query LoadAgentRunDetails($input: LoadAgentRunDetailsInput!) {
  loadAgentRunDetails(input: $input) {
    success
    agentRun {
      id
      status
      updatedAt
      hasUsedAICredit
      conversationHistory {
        __typename
        ... on AgentConversationHistoryItemUser {
          id
          role
          status
          timestamp
          content
        }
        ... on AgentConversationHistoryItemAssistant {
          id
          role
          status
          timestamp
          content
          quickReplies
        }
      }
    }
  }
}
```

**Variables**:
```json
{
  "input": {
    "agentRunId": "agent_abc123"
  }
}
```

**Response**:
```json
{
  "data": {
    "loadAgentRunDetails": {
      "success": true,
      "agentRun": {
        "id": "agent_abc123",
        "status": "COMPLETED",
        "updatedAt": 1765848836246,
        "hasUsedAICredit": true,
        "conversationHistory": [
          {
            "__typename": "AgentConversationHistoryItemUser",
            "id": "msg_1",
            "role": "user",
            "status": "completed",
            "timestamp": 1765848765845,
            "content": "What were the main action items?"
          },
          {
            "__typename": "AgentConversationHistoryItemAssistant",
            "id": "msg_2",
            "role": "assistant",
            "status": "completed",
            "timestamp": 1765848770000,
            "content": "Here are the main action items:\n\n1. ...",
            "quickReplies": ["Tell me more", "Create tasks"]
          }
        ]
      }
    }
  }
}
```

---

## Get AI Outputs for Meeting

```graphql
query GetAIRuns($input: GetAIRunsInput!) {
  getAIRuns(input: $input) {
    id
    items {
      id
      meetingId
      prompt
      promptTitle
      contentType
      content
      isSystemPrompt
      requestedAt
      generatedAt
      askedByName
      askedByPhoto
    }
    hasMore
    totalCount
  }
}
```

**Variables**:
```json
{
  "input": {
    "meetingId": "a5ea703731bb38fe443a",
    "limit": 50
  }
}
```

---

# Search

## Search Transcripts

```graphql
query SearchTranscripts($input: SearchInput!) {
  searchTranscripts(input: $input) {
    results {
      id
      meetingId
      meetingTitle
      speakerName
      text
      highlight
      timestamp
      rank
    }
    totalCount
  }
}
```

**Variables**:
```json
{
  "input": {
    "query": "action items budget",
    "limit": 50,
    "offset": 0,
    "meetingId": null
  }
}
```

**Response**:
```json
{
  "data": {
    "searchTranscripts": {
      "results": [
        {
          "id": "block_123",
          "meetingId": "a5ea703731bb38fe443a",
          "meetingTitle": "Budget Review",
          "speakerName": "John Doe",
          "text": "We need to finalize the action items for the budget...",
          "highlight": "...finalize the <b>action items</b> for the <b>budget</b>...",
          "timestamp": 1765848770748,
          "rank": 0.95
        }
      ],
      "totalCount": 1
    }
  }
}
```

---

# Labels

## Get User Labels

```graphql
query getLabels {
  user {
    labels {
      id
      name
      description
      style {
        color
        line
        variant
      }
      filters
    }
  }
}
```

**Response**:
```json
{
  "data": {
    "user": {
      "labels": [
        {
          "id": "label_1",
          "name": "Important",
          "description": "Important meetings",
          "style": {
            "color": "RED",
            "line": "SOLID",
            "variant": "OUTLINED"
          },
          "filters": null
        }
      ]
    }
  }
}
```

---

# WebSocket Subscriptions

Connect to `ws://server/api/2/graphql` with `graphql-transport-ws` protocol.

## Subscribe to AI Response Streaming

### Complete Flow (Step by Step)

**Step 1: Start the AI chat and get the agentRunId**
```javascript
const result = await graphqlClient.mutate({
  mutation: START_AGENT_RUN,
  variables: {
    input: {
      prompt: "What were the action items?",
      context: [{ id: meetingId, type: "meeting" }]
    }
  }
});
const agentRunId = result.data.startAgentRun.agentRunId;
// agentRunId looks like: "W7kaYg4BBOeg7rv5fTNU"
```

**Step 2: Subscribe to AgentRunUpdates with that agentRunId**
```graphql
subscription AgentRunUpdates($agentRunId: ID!) {
  agentRun(agentRunId: $agentRunId) {
    id
    status
    updatedAt
    hasUsedAICredit
    conversationHistory {
      __typename
      ... on AgentConversationHistoryItemUser {
        id role status timestamp content
      }
      ... on AgentConversationHistoryItemAssistant {
        id role status timestamp content quickReplies
      }
    }
  }
}
```

**Variables** (use the agentRunId from Step 1):
```json
{ "agentRunId": "W7kaYg4BBOeg7rv5fTNU" }
```

**Step 3: Handle subscription updates WITH NULL CHECKS**
```javascript
// IMPORTANT: agentRun can be null/undefined initially!
const onUpdate = (data) => {
  const agentRun = data?.agentRun;

  // Guard against null/undefined
  if (!agentRun) {
    console.log('Waiting for AI response...');
    return;
  }

  // Guard against missing conversationHistory
  const history = agentRun.conversationHistory || [];

  if (agentRun.status === 'RUNNING') {
    // Show "Thinking..." indicator
    setIsLoading(true);
  } else if (agentRun.status === 'COMPLETED') {
    setIsLoading(false);
    // Get the latest assistant message
    const assistantMessages = history.filter(m => m.role === 'assistant');
    const latestResponse = assistantMessages[assistantMessages.length - 1];
    setResponse(latestResponse?.content || '');
  }
};
```

**Push Message Format** (what you receive via WebSocket):
```json
{
  "id": "subscription-uuid",
  "type": "next",
  "payload": {
    "data": {
      "agentRun": {
        "id": "W7kaYg4BBOeg7rv5fTNU",
        "status": "COMPLETED",
        "updatedAt": 1765863178970,
        "hasUsedAICredit": true,
        "conversationHistory": [
          {
            "__typename": "AgentConversationHistoryItemUser",
            "id": "user_123",
            "role": "user",
            "status": "completed",
            "timestamp": 1765863170000,
            "content": "What were the action items?"
          },
          {
            "__typename": "AgentConversationHistoryItemAssistant",
            "id": "assistant_456",
            "role": "assistant",
            "status": "completed",
            "timestamp": 1765863178000,
            "content": "Based on the meeting transcript, here are the action items...",
            "quickReplies": ["Tell me more", "Action items", "Summary"]
          }
        ]
      }
    }
  }
}
```

**Status Values**:
- `RUNNING` - AI is processing (show "Thinking..." indicator, `conversationHistory` may be empty)
- `COMPLETED` - Response ready (hide indicator, show content)
- `FAILED` - Error occurred

**Common Errors**:
- `Cannot read properties of undefined (reading 'conversationHistory')` → Add null check: `agentRun?.conversationHistory || []`
- Empty response → Check `agentRun.status` is `COMPLETED` before reading content

---

## Subscribe to User Updates

```graphql
subscription userUpdates {
  user {
    id
    displayName
    settings { ... }
    aiCredits { remaining isUnlimited }
  }
}
```

---

# Other Endpoints

## Related Meetings

```graphql
query RelatedMeetings($meetingId: ID!) {
  relatedMeetings(meetingId: $meetingId) {
    id
    title
    platform
    created
  }
}
```

**Variables**:
```json
{ "meetingId": "a5ea703731bb38fe443a" }
```

**Response**: Returns `[]` (not implemented yet)

---

## Track Meeting View

```graphql
mutation TrackMeetingView($id: ID!) {
  trackMeetingView(meetingId: $id) {
    success
  }
}
```

**Variables**:
```json
{ "id": "a5ea703731bb38fe443a" }
```

---

## Get Workflows Requiring Attention

```graphql
query GetWorkflowsRequiringAttention {
  workflowsRequiringAttention {
    workflowId
    workflowName
    integration
    errorMessage
    failedAt
    executionId
  }
}
```

**Response**: Returns `[]` (no workflow errors)

---

## Get Domain Users Count

```graphql
query getDomainUsersCount {
  getDomainUsersCount
}
```

**Response**:
```json
{
  "data": {
    "getDomainUsersCount": 0
  }
}
```

---

# Error Handling

All errors follow this format:

```json
{
  "errors": [
    {
      "message": "Meeting not found",
      "extensions": {
        "code": "NOT_FOUND"
      }
    }
  ],
  "data": null
}
```

**Common Error Codes**:
- `NOT_FOUND` - Resource doesn't exist
- `UNAUTHORIZED` - Invalid or missing auth token
- `FORBIDDEN` - No permission to access resource
- `BAD_REQUEST` - Invalid input parameters

---

# Search Facets

## Get Meeting Search Facets

```graphql
query MeetingSearchFacets {
  meetingSearchFacets {
    speakers { id name imageUrl }
    owners { id name imageUrl }
    platforms { id name }
    spaces { id name }
    labels { id name }
    tags { id name }
    languages { id name }
  }
}
```

**Response**:
```json
{
  "data": {
    "meetingSearchFacets": {
      "speakers": [
        { "id": "John Doe", "name": "John Doe", "imageUrl": null }
      ],
      "owners": [
        { "id": "user_abc", "name": "Me", "imageUrl": "https://..." }
      ],
      "platforms": [
        { "id": "GOOGLE_MEET", "name": "Google Meet" }
      ],
      "spaces": [],
      "labels": [],
      "tags": [],
      "languages": [
        { "id": "en-US", "name": "English" }
      ]
    }
  }
}
```

---

# AI Prompts

## Get Quick Prompts

```graphql
query GetQuickPrompts {
  getQuickPrompts {
    system {
      id
      name
      description
      icon
      items {
        id
        name
        description
        icon
        type
        outputType
        prompt
        requiresUserInput
      }
    }
    used { ... }
    explore { ... }
  }
}
```

**Response**:
```json
{
  "data": {
    "getQuickPrompts": {
      "system": {
        "id": "system-prompts",
        "name": "General",
        "description": "Default AI prompts",
        "items": [
          {
            "id": "short-summary",
            "name": "Short summary",
            "description": "Write a brief summary of this meeting",
            "type": "PROMPT",
            "outputType": "MARKDOWN",
            "prompt": "Write a brief summary of this meeting."
          },
          {
            "id": "action-items",
            "name": "Generate Action Items",
            "type": "PROMPT",
            "outputType": "MARKDOWN"
          }
        ]
      },
      "used": [],
      "explore": []
    }
  }
}
```

---

# Rate Limits

**NOT YET IMPLEMENTED** - No rate limiting currently in place.

---

# Examples

## JavaScript/TypeScript Fetch Example

```typescript
const GRAPHQL_URL = 'http://127.0.0.1:8000/api/2/graphql';

async function fetchMeeting(meetingId: string, token: string) {
  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      query: `
        query GetMeeting($meetingId: ID!) {
          meeting(id: $meetingId) {
            id title platform created
            transcript { blocks { speakerName transcript timestamp } }
          }
        }
      `,
      variables: { meetingId: meetingId },
      operationName: 'GetMeeting'
    })
  });

  return response.json();
}
```

## WebSocket Subscription Example

```typescript
import { createClient } from 'graphql-ws';

const client = createClient({
  url: 'ws://127.0.0.1:8000/api/2/graphql',
  connectionParams: {
    authorization: token
  }
});

// Subscribe to AI streaming
client.subscribe(
  {
    query: `
      subscription AgentRunUpdates($agentRunId: ID!) {
        agentRun(agentRunId: $agentRunId) {
          id status conversationHistory { ... }
        }
      }
    `,
    variables: { agentRunId: 'agent_abc123' }
  },
  {
    next: (data) => {
      console.log('AI Update:', data);
      // Update UI with streaming response
    },
    error: (err) => console.error(err),
    complete: () => console.log('Subscription complete')
  }
);
```
