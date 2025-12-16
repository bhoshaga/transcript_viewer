// =============================================================================
// AI Agent API - GraphQL
// =============================================================================

import { graphqlClient, subscriptionClient } from '../lib/graphql/client';
import { LOAD_AGENT_RUN_DETAILS } from '../lib/graphql/queries';
import { START_AGENT_RUN, CONTINUE_AGENT_RUN } from '../lib/graphql/mutations';
import { AGENT_RUN_UPDATES } from '../lib/graphql/subscriptions';
import {
  AgentRun,
  AgentContext,
  MutationResponse,
} from '../types';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface StartAgentRunData {
  startAgentRun: MutationResponse & { agentRunId: string };
}

interface ContinueAgentRunData {
  continueAgentRun: MutationResponse;
}

interface LoadAgentRunDetailsData {
  loadAgentRunDetails: {
    success: boolean;
    agentRun: AgentRun;
  };
}

interface AgentRunUpdateData {
  agentRun: AgentRun;
}

// -----------------------------------------------------------------------------
// API Functions
// -----------------------------------------------------------------------------

export async function startAgentRun(
  prompt: string,
  meetingId: string
): Promise<string> {
  const context: AgentContext[] = [{ id: meetingId, type: 'meeting' }];

  const data = await graphqlClient.mutate<StartAgentRunData>(
    START_AGENT_RUN,
    {
      input: {
        prompt,
        context,
        triggeredBy: 'WebApp',
        entryMethod: 'custom_user_prompt',
      },
    },
    'StartAgentRun'
  );

  return data.startAgentRun.agentRunId;
}

export async function continueAgentRun(
  agentRunId: string,
  userInput: string,
  meetingId: string
): Promise<boolean> {
  const context: AgentContext[] = [{ id: meetingId, type: 'meeting' }];

  const data = await graphqlClient.mutate<ContinueAgentRunData>(
    CONTINUE_AGENT_RUN,
    {
      input: {
        agentRunId,
        userInput,
        context,
      },
    },
    'ContinueAgentRun'
  );

  return data.continueAgentRun.success;
}

export async function loadAgentRunDetails(
  agentRunId: string
): Promise<AgentRun> {
  const data = await graphqlClient.query<LoadAgentRunDetailsData>(
    LOAD_AGENT_RUN_DETAILS,
    { input: { agentRunId } },
    'LoadAgentRunDetails'
  );

  return data.loadAgentRunDetails.agentRun;
}

export async function subscribeToAgentRun(
  agentRunId: string,
  handlers: {
    onUpdate: (agentRun: AgentRun) => void;
    onError: (error: Error) => void;
    onComplete: () => void;
  }
): Promise<() => void> {
  return subscriptionClient.subscribe<AgentRunUpdateData>(
    AGENT_RUN_UPDATES,
    { agentRunId },
    {
      next: (data) => {
        handlers.onUpdate(data.agentRun);
      },
      error: handlers.onError,
      complete: handlers.onComplete,
    }
  );
}
