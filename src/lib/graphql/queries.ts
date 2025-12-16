// =============================================================================
// GraphQL Queries
// =============================================================================

// -----------------------------------------------------------------------------
// Meeting Queries
// -----------------------------------------------------------------------------

export const LIST_MEETINGS = `
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
`;

export const GET_MEETING = `
  query GetMeeting($meetingId: ID!) {
    meeting(id: $meetingId) {
      id
      title
      platform
      participants {
        name
        analytics { textLength }
      }
      labels { id name color }
      permissions { canEdit canDelete canShare }
    }
  }
`;

export const GET_MEETING_WITH_TRANSCRIPT = `
  query meetingWithTranscript($meetingId: ID!) {
    meeting(id: $meetingId) {
      id
      title
      platform
      participants { name analytics { textLength } }
      duration
      speechDuration
      created
      modified
      hasEnded
      transcript {
        id
        blocks {
          speakerName
          transcript
          timestamp
        }
      }
    }
  }
`;

// -----------------------------------------------------------------------------
// Task Queries
// -----------------------------------------------------------------------------

export const LIST_TASKS = `
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
`;

// -----------------------------------------------------------------------------
// Sharing Queries
// -----------------------------------------------------------------------------

export const GET_MEETING_SHARES = `
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
`;

// -----------------------------------------------------------------------------
// AI Agent Queries
// -----------------------------------------------------------------------------

export const LOAD_AGENT_RUN_DETAILS = `
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
`;

export const GET_AI_RUNS = `
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
`;

// -----------------------------------------------------------------------------
// Search Queries
// -----------------------------------------------------------------------------

export const SEARCH_TRANSCRIPTS = `
  query SearchTranscripts($input: SearchTranscriptsInput!) {
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
`;

// -----------------------------------------------------------------------------
// Labels Queries
// -----------------------------------------------------------------------------

export const GET_LABELS = `
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
`;

// -----------------------------------------------------------------------------
// Quick Prompts Queries
// -----------------------------------------------------------------------------

export const GET_QUICK_PROMPTS = `
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
      used {
        id
        name
        description
        icon
        type
        outputType
        prompt
        requiresUserInput
      }
      explore {
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
  }
`;

// -----------------------------------------------------------------------------
// Search Facets Queries
// -----------------------------------------------------------------------------

export const GET_MEETING_SEARCH_FACETS = `
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
`;
