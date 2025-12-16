# GraphQL Migration Status

## Completed

### Infrastructure
- [x] Created GraphQL client with JWT auth (`src/lib/graphql/client.ts`)
- [x] Created GraphQL queries (`src/lib/graphql/queries.ts`)
- [x] Created GraphQL mutations (`src/lib/graphql/mutations.ts`)
- [x] Created GraphQL subscriptions (`src/lib/graphql/subscriptions.ts`)
- [x] Updated types to align with backend schema (`src/types.ts`)
- [x] Updated environment config (`src/lib/useEnv.ts`)

### API Layer
- [x] `src/apis/meetings.ts` - listMeetings, getMeetingWithTranscript, archiveMeeting
- [x] `src/apis/tasks.ts` - listTasks, createTask, updateTask, deleteTask
- [x] `src/apis/agent.ts` - startAgentRun, continueAgentRun, subscribeToAgentRun

### UI Integration
- [x] `Transcript.tsx` - Uses GraphQL for meeting list and transcript loading
- [x] Meeting list displays correctly from GraphQL
- [x] Transcript blocks display correctly from GraphQL

### Bug Fixes
- [x] Fixed React 19 + radix-ui ScrollArea infinite loop (replaced with simple divs)
- [x] Fixed infinite loop in RightSidebar useEffect (currentContext dependency)
- [x] Fixed layout height issues for transcript card
- [x] Aligned query field names with backend schema:
  - `meeting(id:)` not `meeting(meetingId:)`
  - `$type: MeetingType!` not `$type: String!`
  - `$filter: SearchFilterInput!` not `ListMeetingsFilter`
  - Removed unsupported fields: `tags`, `messageId`, `isPinned`, `isDeleted` from TranscriptBlock

### Deleted (old REST/WebSocket code)
- [x] `src/apis/auth.tsx`
- [x] `src/apis/meeting.tsx`
- [x] `src/apis/meetingStatusWebsocket.tsx`
- [x] `src/apis/transcriptwebsocket.jsx`
- [x] `src/apis/message.tsx`
- [x] `src/pages/Login.tsx`

---

## Not Implemented

### Authentication
- [ ] Firebase authentication flow
- [ ] Login/logout UI
- [ ] Token refresh
- Currently using hardcoded JWT token in `.env`

### AI Chat (RightSidebar)
- [ ] Wire up `startAgentRun` mutation
- [ ] Wire up `continueAgentRun` mutation
- [ ] Wire up `AgentRunUpdates` subscription for streaming responses
- [ ] Currently AI chat is non-functional (no backend connection)

### Tasks
- [ ] Wire up tasks API to UI components
- [ ] Task creation from transcript messages
- [ ] Task list display in sidebar

### Labels
- [ ] Wire up `getLabels` query
- [ ] Label filtering for meetings
- [ ] Label display on meetings

### Quick Prompts
- [ ] Wire up `getQuickPrompts` query
- [ ] Display quick prompts in AI sidebar

### Real-time Updates
- [ ] WebSocket subscription for live transcript updates
- [ ] Meeting status updates via subscription

### Other
- [ ] Archive meeting functionality (mutation exists, not wired to UI)
- [ ] Update meeting functionality
- [ ] Search/filter meetings
- [ ] Pagination for meeting list

---

## Environment Setup

```env
# Required in .env
REACT_APP_GRAPHQL_URL=http://localhost:8000/api/2/graphql
REACT_APP_GRAPHQL_WS_URL=ws://localhost:8000/api/2/graphql
REACT_APP_AUTH_TOKEN=<jwt_token>
REACT_APP_USER_ID=<user_id>
REACT_APP_USER_EMAIL=<email>
REACT_APP_USER_NAME=<name>
```

---

## Backend Endpoint

GraphQL endpoint: `http://localhost:8000/api/2/graphql`

Tested queries:
- `ListMeetings` ✓
- `meetingWithTranscript` ✓

---

## Known Issues

1. TranscriptBlock `tags` field returns null instead of empty array - removed from query
2. Some meetings have no transcript data (returns `transcript: null`)
3. ESLint warnings for unused variables (non-blocking)
