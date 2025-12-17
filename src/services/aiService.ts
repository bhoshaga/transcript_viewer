import { AIMessage } from '../lib/AIContext';
import { MAX_CONVERSATION_TOKENS } from '../config';
import { startAgentRun, continueAgentRun, subscribeToAgentRun } from '../apis/agent';
import { AgentRun } from '../types';

// Token limits
const MAX_TRANSCRIPT_TOKENS = 20000;

// Active agent run ID - persists across messages in a conversation
let activeAgentRunId: string | null = null;

/**
 * Process a user message and get an AI response using GraphQL Agent
 */
export const processUserMessage = async (
  messages: AIMessage[],
  onChunk: (chunk: string) => void,
  onComplete: (fullResponse: string) => void,
  context?: {
    page?: string;
    meetingId?: string;
    transcriptData?: unknown;
  }
): Promise<void> => {
  try {
    const userMessage = messages[messages.length - 1]?.content || '';
    const meetingId = context?.meetingId || '';

    if (!meetingId) {
      const response = "Please select a meeting first to use the AI assistant.";
      onChunk(response);
      onComplete(response);
      return;
    }

    let agentRunId: string;

    // Start a new agent run or continue existing one
    const isNewConversation = !activeAgentRunId;

    if (isNewConversation) {
      console.log('[aiService] Starting new agent run');
      agentRunId = await startAgentRun(userMessage, meetingId);
      activeAgentRunId = agentRunId;
    } else {
      agentRunId = activeAgentRunId!; // We know it's not null from isNewConversation check
      console.log('[aiService] Continuing agent run:', agentRunId);
      // Note: We'll call continueAgentRun AFTER subscribing (see below)
    }

    // Subscribe to agent updates BEFORE calling continueAgentRun
    let fullResponse = '';
    let lastContentLength = 0;
    let expectedAssistantIndex = -1; // Track which assistant message we're waiting for
    let initialized = false;

    const unsubscribe = await subscribeToAgentRun(agentRunId, {
      onUpdate: (agentRun: AgentRun) => {
        // Guard against null/undefined agentRun (backend may send ack messages first)
        if (!agentRun) {
          console.log('[aiService] Waiting for agentRun data...');
          return;
        }

        console.log('[aiService] Agent update - status:', agentRun.status);

        // Guard against missing conversationHistory
        if (!agentRun.conversationHistory) {
          console.warn('[aiService] AgentRun missing conversationHistory:', agentRun);
          return;
        }

        // Find all assistant messages
        const assistantMessages = agentRun.conversationHistory.filter(
          msg => msg.role === 'assistant'
        );

        // On first update, figure out which assistant message we're waiting for
        if (!initialized) {
          initialized = true;
          // For continued conversations, we expect a NEW assistant message
          // If there are existing assistant messages, we want the NEXT one
          expectedAssistantIndex = assistantMessages.length > 0 ? assistantMessages.length - 1 : 0;

          // If this is a continuation and the latest assistant message already has quickReplies,
          // we're waiting for a new message (index will be current length)
          if (assistantMessages.length > 0) {
            const latest = assistantMessages[assistantMessages.length - 1];
            const hasQuickReplies = (latest as any).quickReplies?.length > 0;
            if (hasQuickReplies) {
              expectedAssistantIndex = assistantMessages.length; // Wait for next one
              console.log('[aiService] Continuing conversation, waiting for assistant message index:', expectedAssistantIndex);
            }
          }
        }

        // Get the assistant message we're interested in
        const targetMessage = assistantMessages[expectedAssistantIndex];

        if (targetMessage) {
          const content = targetMessage.content || '';

          // Only emit new content
          if (content.length > lastContentLength) {
            const newContent = content.substring(lastContentLength);
            console.log('[aiService] New content chunk:', newContent.substring(0, 50) + '...');
            onChunk(newContent);
            lastContentLength = content.length;
            fullResponse = content;
          }

          // Check if response is complete - quickReplies being populated signals final update
          const quickReplies = (targetMessage as any).quickReplies;
          const hasQuickReplies = quickReplies && quickReplies.length > 0;
          if (agentRun.status === 'COMPLETED' && hasQuickReplies) {
            console.log('[aiService] Response complete with quickReplies, finishing');
            onComplete(fullResponse);
          }
        }
      },
      onError: (error: Error) => {
        console.error('[aiService] Agent subscription error:', error);
        onChunk('Sorry, there was an error processing your request.');
        onComplete('Sorry, there was an error processing your request.');
      },
      onComplete: () => {
        // This is called when the GraphQL subscription actually completes
        console.log('[aiService] Agent subscription complete - final response length:', fullResponse.length);
        onComplete(fullResponse || 'Request completed.');
      }
    });

    // For follow-up messages, call continueAgentRun AFTER subscription is active
    if (!isNewConversation) {
      console.log('[aiService] Sending follow-up message after subscription active');
      await continueAgentRun(agentRunId, userMessage, meetingId);
    }

  } catch (error) {
    console.error('[aiService] Error processing message:', error);
    activeAgentRunId = null; // Reset on error
    onChunk('Sorry, there was an error processing your request. Please try again.');
    onComplete('Sorry, there was an error processing your request. Please try again.');
  }
};

/**
 * Reset the agent run (start fresh conversation)
 */
export const resetAgentRun = (): void => {
  activeAgentRunId = null;
};

/**
 * Check if the conversation is too long and should be reset
 */
export const isConversationTooLong = (messages: AIMessage[]): boolean => {
  const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
  const estimatedTokens = totalChars / 4;
  return estimatedTokens > MAX_CONVERSATION_TOKENS;
};

/**
 * Get contextual suggestions based on the current page
 */
export const getContextualSuggestions = (
  context: {
    page: string;
    meetingId?: string;
  }
): string[] => {
  const isDetailView = context.meetingId && context.page === 'transcript-detail';

  if (isDetailView) {
    return [
      'What were the key points discussed?',
      'Summarize the action items from this meeting',
      'Who spoke the most in this meeting?',
      'What decisions were made?'
    ];
  } else {
    return [
      'How can I search through my meetings?',
      'Show me my recent meetings',
      'What can you help me with?'
    ];
  }
};
