// =============================================================================
// GraphQL Mutations
// =============================================================================

// -----------------------------------------------------------------------------
// Meeting Mutations
// -----------------------------------------------------------------------------

export const ARCHIVE_MEETING = `
  mutation ArchiveMeeting($input: ArchiveMeetingInput!) {
    archiveMeeting(input: $input) {
      success
    }
  }
`;

export const UPDATE_MEETING = `
  mutation UpdateMeeting($input: UpdateMeetingInput!) {
    updateMeeting(input: $input) {
      success
      errors { message statusCode }
    }
  }
`;

// -----------------------------------------------------------------------------
// Sharing Mutations
// -----------------------------------------------------------------------------

export const SHARE_MEETING = `
  mutation ShareMeeting($input: ShareMeetingInput!) {
    shareMeeting(input: $input) {
      success
      shareId
    }
  }
`;

export const REMOVE_SHARE = `
  mutation RemoveShare($input: RemoveShareInput!) {
    removeShare(input: $input) {
      success
    }
  }
`;

// -----------------------------------------------------------------------------
// Task Mutations
// -----------------------------------------------------------------------------

export const CREATE_TASK = `
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
`;

export const UPDATE_TASK = `
  mutation UpdateTask($input: UpdateTaskInput!) {
    updateTask(input: $input) {
      success
    }
  }
`;

export const DELETE_TASK = `
  mutation DeleteTask($input: DeleteTaskInput!) {
    deleteTask(input: $input) {
      success
    }
  }
`;

// -----------------------------------------------------------------------------
// AI Agent Mutations
// -----------------------------------------------------------------------------

export const START_AGENT_RUN = `
  mutation StartAgentRun($input: StartAgentRunInput!) {
    startAgentRun(input: $input) {
      success
      agentRunId
    }
  }
`;

export const CONTINUE_AGENT_RUN = `
  mutation ContinueAgentRun($input: ContinueAgentRunInput!) {
    continueAgentRun(input: $input) {
      success
    }
  }
`;
