// =============================================================================
// GraphQL Subscriptions
// =============================================================================

// -----------------------------------------------------------------------------
// AI Agent Subscriptions
// -----------------------------------------------------------------------------

export const AGENT_RUN_UPDATES = `
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
`;

// -----------------------------------------------------------------------------
// User Subscriptions
// -----------------------------------------------------------------------------

export const USER_UPDATES = `
  subscription userUpdates {
    user {
      id
      displayName
      settings
      aiCredits { remaining isUnlimited }
    }
  }
`;
