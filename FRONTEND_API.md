# Stru Meet Frontend API Guide

Complete API reference for frontend developers building on top of Stru Meet.

## Base URLs

| Environment | HTTP | WebSocket |
|-------------|------|-----------|
| Local Dev | `http://127.0.0.1:8000` | `ws://127.0.0.1:8000` |
| Production | `https://your-api.com` | `wss://your-api.com` |

## Authentication

All requests require a JWT token in the Authorization header:

```
Authorization: Bearer <jwt-token>
```

### Test Token (Development Only)

For local development without Firebase auth, use this hardcoded test token:

```
eyJhbGciOiAibm9uZSIsICJ0eXAiOiAiSldUIn0.eyJ1c2VyX2lkIjogIkhZR2J3VWEwc3JmTnFiZ2RGVmdZcnVkZWxpNTMiLCAic3ViIjogIkhZR2J3VWEwc3JmTnFiZ2RGVmdZcnVkZWxpNTMiLCAiZW1haWwiOiAiYmhvc2hhZ2FAZ21haWwuY29tIiwgIm5hbWUiOiAiQmhvc2hhZ2EgTWl0cnJhbiIsICJwaWN0dXJlIjogImh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL2RlZmF1bHQtdXNlciJ9.test_signature
```

**Decoded payload:**
```json
{
  "user_id": "HYGbwUa0srfNqbgdFVgYrudeli53",
  "email": "bhoshaga@gmail.com",
  "name": "Bhoshaga Mitrran"
}
```

**Example usage:**
```bash
export TEST_TOKEN="eyJhbGciOiAibm9uZSIsICJ0eXAiOiAiSldUIn0.eyJ1c2VyX2lkIjogIkhZR2J3VWEwc3JmTnFiZ2RGVmdZcnVkZWxpNTMiLCAic3ViIjogIkhZR2J3VWEwc3JmTnFiZ2RGVmdZcnVkZWxpNTMiLCAiZW1haWwiOiAiYmhvc2hhZ2FAZ21haWwuY29tIiwgIm5hbWUiOiAiQmhvc2hhZ2EgTWl0cnJhbiIsICJwaWN0dXJlIjogImh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL2RlZmF1bHQtdXNlciJ9.test_signature"

curl -X POST http://127.0.0.1:8000/api/2/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -d '{"operationName":"ListMeetings","variables":{"type":"MyMeetings","offset":0,"filter":{}},"query":"query { meetings(type: MyMeetings, filter: {}) { meetings { id title } } }"}'
```

For GraphQL WebSocket, pass token in connection_init:
```json
{
  "type": "connection_init",
  "payload": {
    "authorization": "<firebase-jwt-token>"
  }
}
```

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
    createdAt
    updatedAt
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
      "createdAt": 1765848765845,
      "updatedAt": 1765848836246,
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
```bash
curl -s -X POST http://127.0.0.1:8000/api/2/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"operationName":"meetingWithTranscript","variables":{"meetingId":"MEETING_ID"},"query":"query meetingWithTranscript($meetingId: ID!) { meeting(id: $meetingId) { id title transcript { id blocks { speakerName transcript timestamp } } } }"}'
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

**Variables**:
```json
{ "agentRunId": "agent_abc123" }
```

**Push Message Format**:
```json
{
  "id": "subscription-uuid",
  "type": "next",
  "payload": {
    "data": {
      "agentRun": {
        "id": "agent_abc123",
        "status": "COMPLETED",
        "conversationHistory": [...]
      }
    }
  }
}
```

**Status Values**:
- `RUNNING` - AI is processing (show "Thinking..." indicator)
- `COMPLETED` - Response ready (hide indicator, show content)
- `FAILED` - Error occurred

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
            id title platform createdAt
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
