# Stru Meet Backend API Design Document

## Overview

This document describes the backend API required to support the Stru Meet Chrome extension (forked from Tactiq). The extension captures Google Meet transcripts and provides AI-powered chat functionality.

**Important**: The extension is minified and cannot be easily modified. The backend MUST match the expected API contracts exactly.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CHROME EXTENSION                          │
│                                                              │
│  googlemeet.inline.js → content.js → background.js          │
│       (captures captions)    (relays)    (API calls)        │
└──────────────────────────┬──────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
     ┌────────────────┐        ┌────────────────┐
     │   HTTP/REST    │        │   WebSocket    │
     │   Endpoints    │        │  Subscriptions │
     └────────┬───────┘        └───────┬────────┘
              │                        │
              └──────────┬─────────────┘
                         │
                         ▼
              ┌────────────────────┐
              │     FastAPI        │
              │   main.py +        │
              │   routers/*.py     │
              └─────────┬──────────┘
                        │
           ┌────────────┼────────────┐
           │            │            │
           ▼            ▼            ▼
   ┌───────────┐ ┌───────────┐ ┌───────────┐
   │  OpenAI   │ │ meet_db/  │ │  Local    │
   │  (AI Chat)│ │ Supabase  │ │  Storage  │
   └───────────┘ │ PostgreSQL│ │(screenshots)
                 └───────────┘ └───────────┘
```

---

## Environment Variables & Configuration

### Required Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `SUPABASE_TERRA_URL` | PostgreSQL connection string | `postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres` |
| `OPENAI_API_KEY` | OpenAI API for AI chat | `sk-...` |

### Required Files

| File | Purpose |
|------|---------|
| `server/firebase-service-account.json` | Firebase Admin SDK credentials for custom token generation |

### Optional Configuration

| Setting | Location | Default | Purpose |
|---------|----------|---------|---------|
| `INITIALIZE_TABLES_ON_STARTUP` | `meet_db/__init__.py` | `False` | Set `True` for first run to create DB tables |

### Example .env file
```bash
SUPABASE_TERRA_URL=postgresql://postgres:YOUR_PASSWORD@db.xxxx.supabase.co:5432/postgres
OPENAI_API_KEY=sk-your-openai-key
```

---

## Critical Lessons Learned

### 1. Response Format Sensitivity
The extension is VERY sensitive to response formats. Missing fields or wrong nesting will cause silent failures.

### 2. WebSocket is Required for AI Chat
The extension uses WebSocket subscriptions for real-time AI updates. HTTP polling alone won't work - the extension polls ONCE then waits for WebSocket push.

### 3. State Transitions Matter
For AI chat, the extension expects specific state transitions (RUNNING → COMPLETED). Skipping states causes UI bugs like persistent "Thinking..." indicators.

### 4. Autosave Response Format
The autosave must return a non-empty `transcripts` array or the extension shows "Autosave failed".

---

## HTTP Endpoints

### 1. POST /api/2/a/meeting
**Purpose**: Autosave transcript data (called every 15 seconds during meeting)

**Request Body**:
```json
{
  "compressedTranscript": {
    "r": {
      "id": "meeting-url-id",
      "devices": { "@spaces/xxx/devices/123": "Speaker Name" },
      "createdAt": 1765780858589,
      "updatedAt": 1765780982735,
      "tzOffset": 18000000,
      "detectedLanguage": { "shortName": "en-US", "optionName": "English" },
      "meetingId": "internal-meeting-id",
      "platform": "GOOGLE_MEET"
    },
    "t": {
      "version": 1,
      "minStamp": 1765780862735,
      "speakers": ["Speaker 1", "Speaker 2"],
      "blocks": [
        { "d": ["u1", 0, 2, 0, 0, "Hello world", 0, 0], "v": 0 }
      ]
    },
    "v": 1
  },
  "rawMeeting": {
    "participants": [{ "name": "Speaker", "analytics": { "textLength": 834 } }],
    "speechDuration": 118,
    "platform": "GOOGLE_MEET"
  },
  "uid": "firebase-user-id"
}
```

**Required Response** (CRITICAL - must match exactly):
```json
{
  "success": true,
  "meetingId": "unique-meeting-id",
  "id": "unique-meeting-id",
  "transcripts": [
    { "type": "local", "url": "http://server/transcripts/id" }
  ],
  "delay": 15000
}
```

**Mistakes to Avoid**:
- ❌ Empty `transcripts: []` → Shows "Autosave failed"
- ❌ Missing `meetingId` at top level → AI chat won't work
- ❌ Wrapping in `{"data": {...}}` → Extension can't find meetingId

---

### 2. GET /api/2/a/user/custom-token
**Purpose**: Get Firebase custom authentication token

**Response**:
```json
{
  "token": "firebase-custom-token-string"
}
```

**Note**: Can return mock token if Firebase auth is disabled.

---

### 3. GET /api/2/u/notifications
**Purpose**: Fetch user notifications

**Response**:
```json
{
  "notifications": []
}
```

---

### 4. PUT /api/2/a/meeting/{meetingId}/screenshot/{timestamp}
**Purpose**: Upload meeting screenshot

**Request**: Raw image bytes (PNG)

**Response**:
```json
{
  "success": true,
  "url": "http://server/screenshots/filename.png"
}
```

---

### 5. GET /api/2/u/welcome/{userId}
**Purpose**: Welcome page shown after extension install

**Response**: HTML page

---

### 6. GET /proxy
**Purpose**: Unleash feature flags proxy

**Query Parameters**: `environment`, `appName`, `sessionId`, `userId`, `properties[*]`

**Response**:
```json
{
  "toggles": [
    {
      "name": "captureContextWidget",
      "enabled": true,
      "variant": { "name": "enabled", "enabled": true }
    }
  ]
}
```

**Important Feature Flags**:
- `captureContextWidget` - Enables screenshot button (set `enabled: true`)

---

## GraphQL Endpoint

### POST /api/2/graphql

All GraphQL operations go through this endpoint.

---

### Query: GetAgentRunsByMeetingId
**Purpose**: Get AI chat history for a meeting

**Variables**:
```json
{
  "input": { "meetingId": "meeting-id" }
}
```

**Response**:
```json
{
  "data": {
    "getAgentRunsByMeetingId": {
      "success": true,
      "agentRuns": [
        {
          "id": "agent-run-id",
          "status": "COMPLETED",
          "updatedAt": 1765780858589,
          "__typename": "AgentRun"
        }
      ],
      "__typename": "GetAgentRunsByMeetingIdResponse"
    }
  }
}
```

---

### Mutation: StartAgentRun
**Purpose**: Start a new AI chat conversation

**Variables**:
```json
{
  "input": {
    "prompt": "User question",
    "context": [{ "id": "meeting-id", "type": "meeting" }],
    "triggeredBy": "ChromeExtension",
    "entryMethod": "custom_user_prompt"
  }
}
```

**Response** (return immediately, process async):
```json
{
  "data": {
    "startAgentRun": {
      "success": true,
      "agentRunId": "new-agent-run-id",
      "__typename": "StartAgentRunResponse"
    }
  }
}
```

**CRITICAL**:
- Return immediately with `agentRunId`
- Process AI in background
- Push updates via WebSocket subscription

---

### Mutation: ContinueAgentRun
**Purpose**: Send follow-up message in existing chat

**Variables**:
```json
{
  "input": {
    "agentRunId": "existing-agent-run-id",
    "userInput": "Follow-up question",
    "context": [{ "id": "meeting-id", "type": "meeting" }]
  }
}
```

**Response**:
```json
{
  "data": {
    "continueAgentRun": {
      "success": true,
      "__typename": "ContinueAgentRunResponse"
    }
  }
}
```

**CRITICAL**:
- Must push RUNNING status via WebSocket BEFORE starting AI processing
- This enables proper state transition (COMPLETED → RUNNING → COMPLETED)
- Without this, "Thinking..." indicator persists after response

---

### Query: LoadAgentRunDetails
**Purpose**: Load full conversation history (polled once after Start/Continue)

**Variables**:
```json
{
  "input": { "agentRunId": "agent-run-id" }
}
```

**Response**:
```json
{
  "data": {
    "loadAgentRunDetails": {
      "success": true,
      "agentRun": {
        "id": "agent-run-id",
        "status": "RUNNING",
        "updatedAt": 1765780858589,
        "hasUsedAICredit": false,
        "conversationHistory": [
          {
            "__typename": "AgentConversationHistoryItemUser",
            "id": "user_123",
            "role": "user",
            "status": "completed",
            "timestamp": 1765780858589,
            "content": "User message"
          },
          {
            "__typename": "AgentConversationHistoryItemAssistant",
            "id": "assistant_456",
            "role": "assistant",
            "status": "completed",
            "timestamp": 1765780858600,
            "content": "AI response",
            "quickReplies": ["Tell me more", "Summary"]
          }
        ],
        "__typename": "AgentRun"
      },
      "__typename": "LoadAgentRunDetailsResponse"
    }
  }
}
```

---

### Query: RelatedMeetings
**Purpose**: Find related meetings by pathname hash

**Response**:
```json
{
  "data": {
    "relatedMeetings": []
  }
}
```

---

### Mutation: UpdateUserSetting
**Purpose**: Update user preferences

**Response**:
```json
{
  "data": {
    "updateUserSetting": {
      "success": true,
      "__typename": "UpdateUserSettingResponse"
    }
  }
}
```

---

## WebApp GraphQL Operations

These operations are used by the Tactiq web application (not the extension). Handled by `server/routers/webapp_*.py`.

### Query: GetMeeting
**Purpose**: Get meeting details (without transcript)

**Variables**: `{ "id": "meeting-id" }`

**Response**: Meeting metadata with participants, labels, permissions

---

### Query: meetingWithTranscript
**Purpose**: Get meeting with full transcript

**Variables**: `{ "id": "meeting-id" }`

**Response**: Meeting + expanded transcript blocks with speaker names, timestamps

---

### Query: ListTasks
**Purpose**: Get tasks for a meeting

**Variables**: `{ "input": { "meetingId": "xxx", "limit": 100 } }`

**Response**: Paginated list of tasks with status, priority, assignee

---

### Query: GetAIRuns
**Purpose**: Get AI outputs for a meeting

**Variables**: `{ "input": { "meetingId": "xxx", "limit": 50 } }`

**Response**: List of AI-generated outputs (summaries, action items)

---

### Mutation: CreateTask / UpdateTask / DeleteTask
**Purpose**: Task CRUD operations

**Variables**: Task fields (title, description, status, priority, assignee)

**Response**: Success boolean + created/updated task

---

### Query: SearchTranscripts
**Purpose**: Full-text search across transcripts

**Variables**: `{ "input": { "query": "search term", "userId": "xxx" } }`

**Response**: Matching transcript blocks with highlights

---

### Mutation: ShareMeeting / Query: GetMeetingShares / Mutation: RemoveShare
**Purpose**: Meeting sharing operations

**Variables**: Meeting ID, shared user email, access level (VIEW/EDIT)

**Response**: Share details or success boolean

---

### Query: ListMeetings
**Purpose**: List user's meetings or meetings shared with them

**Variables**:
```json
{
  "type": "MyMeetings",
  "spaceId": null,
  "offset": 0,
  "filter": {},
  "sortBy": "CREATED_NEWEST_FIRST",
  "includeAiOutputs": true
}
```

**Type Values**:
- `MyMeetings` - User's own meetings
- `SharedWithMe` - Meetings shared with user

**Response**: Paginated list of meetings with metadata

---

### Mutation: ArchiveMeeting
**Purpose**: Archive a meeting (soft delete)

**Variables**:
```json
{
  "input": { "id": "meeting-id" }
}
```

**Response**:
```json
{
  "data": {
    "archiveMeeting": {
      "success": true,
      "__typename": "MutationResponse"
    }
  }
}
```

---

### Mutation: UpdateMeeting
**Purpose**: Update meeting details including transcript

**Variables**:
```json
{
  "input": {
    "id": "meeting-id",
    "rawTranscript": { ... },
    "title": "New Title"
  }
}
```

**Response**:
```json
{
  "data": {
    "updateMeeting": {
      "success": true,
      "errors": [],
      "__typename": "UpdateMeetingResponse"
    }
  }
}
```

---

### Query: GetQuickPrompts
**Purpose**: Get AI prompt templates for quick actions

**Response**: Nested structure with `system`, `used`, and `explore` prompt collections

---

### Query: MeetingSearchFacets
**Purpose**: Get search filter options (speakers, platforms, labels, etc.)

**Response**:
```json
{
  "data": {
    "meetingSearchFacets": {
      "speakers": [{ "id": "Name", "name": "Name", "imageUrl": null }],
      "owners": [...],
      "platforms": [{ "id": "GOOGLE_MEET", "name": "Google Meet" }],
      "spaces": [],
      "labels": [],
      "tags": [],
      "languages": [{ "id": "en-US", "name": "English" }]
    }
  }
}
```

---

### Other WebApp Operations
| Operation | Purpose |
|-----------|---------|
| `RelatedMeetings` | Find related meetings (returns []) |
| `TrackMeetingView` | Track meeting view analytics |
| `getLabels` | Get user's custom labels |
| `getDomainUsersCount` | Get domain user count |
| `GetWorkflowsRequiringAttention` | Workflow errors (returns []) |

---

## WebSocket Subscriptions

### Endpoint: ws://server/api/2/graphql

Uses `graphql-ws` protocol.

---

### Subscription: userUpdates
**Purpose**: Real-time user state updates

**Variables**:
```json
{ "userId": "user-id" }
```

**Push Format**:
```json
{
  "id": "subscription-id",
  "type": "next",
  "payload": {
    "data": {
      "userUpdates": {
        "autoHighlights": [],
        "settings": {},
        "__typename": "UserUpdatesPayload"
      }
    }
  }
}
```

---

### Subscription: AgentRunUpdates (CRITICAL for AI Chat)
**Purpose**: Real-time AI response streaming

**Variables**:
```json
{ "agentRunId": "agent-run-id" }
```

**Push Format**:
```json
{
  "id": "subscription-id",
  "type": "next",
  "payload": {
    "data": {
      "agentRun": {
        "id": "agent-run-id",
        "status": "RUNNING",
        "updatedAt": 1765780858589,
        "hasUsedAICredit": false,
        "conversationHistory": [...],
        "__typename": "AgentRun"
      }
    }
  }
}
```

---

## AI Chat Streaming Implementation

### Flow Diagram
```
Extension                          Server                         OpenAI
    │                                │                               │
    │──StartAgentRun────────────────▶│                               │
    │◀─────────{agentRunId}──────────│                               │
    │                                │                               │
    │──Subscribe(AgentRunUpdates)───▶│                               │
    │                                │──────Request─────────────────▶│
    │                                │                               │
    │                                │◀─────Stream chunk 1───────────│
    │◀───Push(COMPLETED, "Hello")────│                               │
    │                                │◀─────Stream chunk 2───────────│
    │◀───Push(COMPLETED, "Hello wo")─│                               │
    │                                │◀─────Stream chunk N───────────│
    │◀───Push(COMPLETED, full text)──│                               │
```

### Key Implementation Details

1. **Create assistant message on FIRST chunk** (not before)
   - Avoids empty message box in UI

2. **Set status to COMPLETED on first chunk**
   - Hides "Thinking..." indicator immediately
   - Response continues streaming in

3. **For ContinueAgentRun: Push RUNNING status first**
   - Before starting AI processing
   - Enables state transition detection
   - Without this: "Thinking..." persists alongside response

4. **Push after EVERY chunk** (no batching)
   - Gives smooth streaming UX
   - Extension handles rapid updates fine

### Status Values
- `RUNNING` - AI is processing (shows "Thinking...")
- `COMPLETED` - Response ready (hides "Thinking...")
- `FAILED` - Error occurred

### Conversation History Item Types
```typescript
type ConversationHistoryItem =
  | AgentConversationHistoryItemUser
  | AgentConversationHistoryItemAssistant
  | AgentConversationHistoryItemOutOfCredits

interface AgentConversationHistoryItemUser {
  __typename: "AgentConversationHistoryItemUser"
  id: string
  role: "user"
  status: "completed"
  timestamp: number  // Unix ms
  content: string
}

interface AgentConversationHistoryItemAssistant {
  __typename: "AgentConversationHistoryItemAssistant"
  id: string
  role: "assistant"
  status: "completed" | "streaming"
  timestamp: number
  content: string
  quickReplies: string[]  // e.g., ["Tell me more", "Summary"]
}
```

---

## Data Storage

### What Goes Where

| Data Type | Storage | Notes |
|-----------|---------|-------|
| Users | **Database** | Firebase UID, email, display name |
| Meetings | **Database** | Metadata, title, platform, timestamps |
| Transcripts | **Database** | All blocks stored in `meet-transcript-blocks` |
| AI Chat (Agent Runs) | **Database** | Sessions + messages in `meet-agent-runs`, `meet-agent-messages` |
| AI Outputs | **Database** | Summaries, action items in `meet-ai-outputs` |
| Tasks | **Database** | Tasks in `meet-tasks` |
| Shares | **Database** | Sharing permissions in `meet-meeting-shares` |
| Screenshots | **Local Files** | PNG files in `server/screenshots/` |
| Debug Logs | **Local Files** | `requests/`, `ws_messages/`, `transcripts/` (raw JSON dumps) |

### Database (Supabase PostgreSQL)

- **Connection**: `SUPABASE_TERRA_URL` env var
- **Module**: `server/meet_db/`
- **Library**: Async `databases` with connection pooling (min=1, max=10)

### Database Schema (13 Tables)

| Table | Purpose |
|-------|---------|
| `meet-users` | User profiles (firebase_uid, email, display_name) |
| `meet-meetings` | Meeting metadata (id, code, title, platform, timestamps) |
| `meet-participants` | Meeting participants with analytics |
| `meet-transcripts` | Transcript metadata per meeting |
| `meet-transcript-blocks` | Individual transcript blocks with full-text search |
| `meet-meeting-shares` | Meeting sharing between users |
| `meet-ai-outputs` | AI-generated content (summaries, etc.) |
| `meet-agent-runs` | AI chat sessions |
| `meet-agent-messages` | Individual messages in AI chats |
| `meet-tasks` | Meeting tasks/action items |
| `meet-task-comments` | Comments on tasks |
| `meet-labels` | User-defined labels |
| `meet-meeting-labels` | Label assignments to meetings |

### Key Patterns
- **Soft Delete**: All tables use `deleted_at` column (never hard delete)
- **Full-text Search**: `meet-transcript-blocks` has `search_vector` tsvector with GIN index
- **Meeting ID Generation**: SHA256 hash of meeting code → first 20 chars

### Module Structure
```
server/meet_db/
├── __init__.py      # Connection, exports
├── schema.py        # SQL CREATE statements
├── users.py         # User CRUD
├── meetings.py      # Meeting CRUD
├── transcripts.py   # Transcript storage
├── shares.py        # Meeting sharing
├── search.py        # Full-text search
├── ai.py            # AI outputs & agent runs
└── tasks.py         # Task management
```

---

## Error Handling

### Silent Failures to Watch For
1. Extension doesn't retry failed requests
2. WebSocket disconnects lose subscription state
3. Missing `__typename` fields cause Apollo cache issues

### Recommended Logging
- Log ALL incoming requests with full body
- Log ALL outgoing responses
- Log WebSocket subscription lifecycle
- Separate log files for different concerns:
  - `requests/` - HTTP request/response JSON
  - `ws_messages/` - WebSocket messages
  - `ai_debug.log` - AI processing details
  - `welcome_requests.log` - Welcome page hits

---

## Security Considerations

### Current (Development)
- No authentication
- CORS allows all origins
- Runs on localhost

### Production Requirements
- Firebase Auth token validation
- CORS restricted to extension origin
- HTTPS required
- Rate limiting on AI endpoints

---

## Testing Checklist

### Transcript Capture
- [ ] Extension captures captions
- [ ] Autosave succeeds (check notification)
- [ ] Transcripts stored correctly

### AI Chat
- [ ] First message shows "Thinking..." then response
- [ ] Response streams in (not all at once)
- [ ] "Thinking..." disappears when response starts
- [ ] Follow-up messages work
- [ ] Multiple follow-ups in same conversation
- [ ] New chat creates new agentRunId

### Screenshots
- [ ] Screenshot button visible (feature flag)
- [ ] Screenshot uploads successfully
- [ ] Screenshot retrievable via URL

---

## Files Reference

| File/Directory | Purpose |
|----------------|---------|
| `server/main.py` | Main FastAPI server |
| `server/meet_db/` | Supabase database module |
| `server/meet_db/__init__.py` | DB connection & exports |
| `server/meet_db/schema.py` | SQL CREATE statements |
| `server/meet_db/users.py` | User CRUD |
| `server/meet_db/meetings.py` | Meeting CRUD |
| `server/meet_db/transcripts.py` | Transcript storage |
| `server/meet_db/shares.py` | Meeting sharing |
| `server/meet_db/search.py` | Full-text search |
| `server/meet_db/ai.py` | AI outputs & agent runs |
| `server/meet_db/tasks.py` | Task management |
| `server/routers/` | WebApp GraphQL handlers |
| `server/routers/webapp_graphql.py` | Central GraphQL router |
| `server/routers/webapp_meetings.py` | Meeting operations |
| `server/routers/webapp_tasks.py` | Task & AI operations |
| `server/routers/webapp_user.py` | User operations |
| `server/tests/` | Unit tests |
| `server/tests/run_db_tests.py` | DB function tests |
| `server/requests/` | Debug: logged HTTP request JSON |
| `server/ws_messages/` | Debug: logged WebSocket messages |
| `server/transcripts/` | Debug: raw transcript JSON dumps |
| `server/screenshots/` | Stored screenshots (local files) |
| `server/ai_debug.log` | Debug: AI processing log |

---

---

## Deployment: URLs to Change

When deploying to production, the following localhost URLs in the extension need to be replaced.

### Primary API Server (Port 8000)
**Current**: `http://127.0.0.1:8000`
**Replace with**: `https://your-api-server.com`

| File | URLs to Change |
|------|----------------|
| `background.js` | `http://127.0.0.1:8000` (base URL) |
| `background.js` | `http://127.0.0.1:8000/api/2/graphql` |
| `background.js` | `http://127.0.0.1:8000/proxy` |
| `background.js` | `http://127.0.0.1:8000/firebase-disabled` |
| `content.js` | `http://127.0.0.1:8000` |
| `content.js` | `http://127.0.0.1:8000/api/2/graphql` |
| `options.js` | `http://127.0.0.1:8000` |
| `options.js` | `http://127.0.0.1:8000/api/2/graphql` |
| `popup.js` | `http://127.0.0.1:8000` |
| `popup.js` | `http://127.0.0.1:8000/api/2/graphql` |

### Disabled Services (Port 9999)
**Current**: `http://127.0.0.1:9999`
**Replace with**: Either real services or keep disabled

| File | URL | Purpose |
|------|-----|---------|
| `chatgoogle.inline.js` | `http://127.0.0.1:9999/disabled` | Mixpanel/Datadog |
| `chatgoogle.inline.js` | `http://127.0.0.1:9999/firebase-disabled` | Firebase DB |
| `content.js` | `http://127.0.0.1:9999/disabled` | Mixpanel/Datadog |
| `content.js` | `http://127.0.0.1:9999/disabled/libs/mixpanel-recorder.min.js` | Mixpanel recorder |
| `content.js` | `http://127.0.0.1:9999/firebase-disabled` | Firebase DB |
| `googlemeet.inline.js` | `http://127.0.0.1:9999/disabled` | Mixpanel/Datadog |
| `googlemeet.inline.js` | `http://127.0.0.1:9999/firebase-disabled` | Firebase DB |
| `msteams.inline.js` | `http://127.0.0.1:9999/disabled` | Mixpanel/Datadog |
| `msteams.inline.js` | `http://127.0.0.1:9999/firebase-disabled` | Firebase DB |
| `options.js` | `http://127.0.0.1:9999/disabled` | Mixpanel/Datadog |
| `options.js` | `http://127.0.0.1:9999/disabled/libs/mixpanel-recorder.min.js` | Mixpanel recorder |
| `options.js` | `http://127.0.0.1:9999/firebase-disabled` | Firebase DB |
| `popup.js` | `http://127.0.0.1:9999/disabled` | Mixpanel/Datadog |
| `popup.js` | `http://127.0.0.1:9999/disabled/libs/mixpanel-recorder.min.js` | Mixpanel recorder |
| `popup.js` | `http://127.0.0.1:9999/firebase-disabled` | Firebase DB |
| `zoom.inline.js` | `http://127.0.0.1:9999/disabled` | Mixpanel/Datadog |
| `zoom.inline.js` | `http://127.0.0.1:9999/firebase-disabled` | Firebase DB |

### Quick Replace Commands

```bash
# Replace main API server
find stru-meet -name "*.js" -exec sed -i '' 's|http://127.0.0.1:8000|https://api.your-domain.com|g' {} \;

# Replace disabled endpoint (if keeping disabled)
find stru-meet -name "*.js" -exec sed -i '' 's|http://127.0.0.1:9999|https://disabled.your-domain.com|g' {} \;

# Or re-enable real services:
# Mixpanel: https://api-js.mixpanel.com
# Datadog: https://browser-http-intake.logs.datadoghq.com
# Firebase: https://your-project.firebaseio.com
```

### manifest.json Changes

Also update `manifest.json`:
```json
{
  "host_permissions": [
    "https://api.your-domain.com/*",
    "https://*.google.com/*",
    "https://*.googleapis.com/*"
  ],
  "externally_connectable": {
    "matches": [
      "https://api.your-domain.com/*"
    ]
  }
}
```

### Summary Count

| Category | Count |
|----------|-------|
| Files with localhost URLs | 9 |
| Total URL occurrences | ~30 |
| Port 8000 (API) | ~12 |
| Port 9999 (Disabled) | ~18 |

---

## Version History

- **v1.0** - Initial implementation with transcript capture
- **v1.1** - Added AI chat with streaming
- **v1.2** - Fixed follow-up chat state transitions
- **v1.3** - Added welcome page endpoint
- **v1.4** - Added deployment URL change guide
- **v1.5** - Added webapp routers for web app GraphQL operations
- **v1.6** - Added Supabase PostgreSQL database integration
- **v1.7** - Wired up all DB functions (Tasks, Shares, Search, AI Outputs, Agent Runs)
