import { AIMessage } from '../lib/AIContext';
import { OPENAI_API_KEY, CHAT_CONFIG, MAX_CONVERSATION_TOKENS } from '../config';
// Import tiktoken conditionally
let encoding_for_model: any;
try {
  // Try importing tiktoken
  const tiktoken = require('tiktoken');
  encoding_for_model = tiktoken.encoding_for_model;
} catch (error) {
  console.warn('Tiktoken import failed, using fallback token counting method', error);
  encoding_for_model = null;
}

// Token limits
const MAX_TRANSCRIPT_TOKENS = 20000; // Maximum number of tokens for transcript data
const MAX_MESSAGE_TOKENS = 4000; // Maximum tokens for conversation messages

/**
 * Count tokens in a string using tiktoken or fallback to estimation
 */
const countTokens = (text: string, modelName: string = 'gpt-4o'): number => {
  try {
    // If tiktoken is available, use it
    if (encoding_for_model) {
      // Get the encoding for the model - use a specific supported model name
      const tiktokenModel = modelName === 'gpt-4o' ? 'gpt-4' : modelName;
      const enc = encoding_for_model(tiktokenModel as any);
      // Encode the text and return the token count
      const tokens = enc.encode(text);
      const count = tokens.length;
      // Free the encoder to avoid memory leaks
      enc.free();
      return count;
    } else {
      // Fallback to a rough estimate if tiktoken is not available
      return Math.ceil(text.length / 4);
    }
  } catch (error) {
    console.error('Error counting tokens:', error);
    // Fallback to a rough estimate if tiktoken fails
    return Math.ceil(text.length / 4);
  }
};

/**
 * Truncate transcript data to fit within token limit
 */
const truncateTranscript = (transcriptData: any[], maxTokens: number = MAX_TRANSCRIPT_TOKENS): any[] => {
  if (!transcriptData || transcriptData.length === 0) return [];
  
  console.log('[aiService] Checking transcript size before truncation:', transcriptData.length, 'messages');
  
  // Format the transcript to estimate tokens
  let formattedTranscript = "";
  transcriptData.forEach((msg: any) => {
    if (msg.speaker && msg.content) {
      const timestamp = msg.call_time || msg.timestamp || '';
      formattedTranscript += `[${timestamp}] ${msg.speaker}: ${msg.content}\n`;
    }
  });
  
  // Count tokens in the full transcript
  const tokenCount = countTokens(formattedTranscript);
  console.log('[aiService] Full transcript token count:', tokenCount);
  
  // If under the limit, return the full transcript
  if (tokenCount <= maxTokens) {
    console.log('[aiService] Transcript is under token limit, using full transcript');
    return transcriptData;
  }
  
  console.log('[aiService] Transcript exceeds token limit, truncating...');
  
  // We need to truncate - try several approaches
  
  // 1. First, try keeping the first and last parts of the conversation
  const portionToKeep = 0.8; // Keep 80% of the max tokens
  const firstPortion = 0.6; // 60% from the beginning
  const lastPortion = 0.4; // 40% from the end
  
  const targetTokens = Math.floor(maxTokens * portionToKeep);
  const firstTokens = Math.floor(targetTokens * firstPortion);
  const lastTokens = Math.floor(targetTokens * lastPortion);
  
  // Calculate approximately how many messages we can keep
  const tokensPerMessage = tokenCount / transcriptData.length;
  const firstMsgCount = Math.floor(firstTokens / tokensPerMessage);
  const lastMsgCount = Math.floor(lastTokens / tokensPerMessage);
  
  // Get first and last portions
  const firstPart = transcriptData.slice(0, firstMsgCount);
  const lastPart = transcriptData.slice(-lastMsgCount);
  
  // Combine with a note about truncation
  const truncatedData = [
    ...firstPart,
    {
      id: 'truncation-notice',
      speaker: 'System',
      content: `[Note: ${transcriptData.length - firstMsgCount - lastMsgCount} messages were omitted to fit token limits]`,
      timestamp: '',
      isComplete: true
    },
    ...lastPart
  ];
  
  // Verify the truncated version is within limits
  let truncatedText = "";
  truncatedData.forEach((msg: any) => {
    if (msg.speaker && msg.content) {
      const timestamp = msg.call_time || msg.timestamp || '';
      truncatedText += `[${timestamp}] ${msg.speaker}: ${msg.content}\n`;
    }
  });
  
  const truncatedTokenCount = countTokens(truncatedText);
  console.log('[aiService] Truncated transcript token count:', truncatedTokenCount);
  
  // If still too large, use a more aggressive truncation
  if (truncatedTokenCount > maxTokens) {
    console.log('[aiService] Still exceeds token limit, using more aggressive truncation');
    // Just keep the first portion that fits
    const safeMessageCount = Math.floor((maxTokens * 0.9) / tokensPerMessage);
    return transcriptData.slice(0, safeMessageCount);
  }
  
  return truncatedData;
};

/**
 * Truncate conversation messages to fit within token limit
 */
const truncateMessages = (messages: AIMessage[], maxTokens: number = MAX_MESSAGE_TOKENS): AIMessage[] => {
  if (messages.length <= 2) return messages;
  
  // Convert messages to text to count tokens
  const messagesText = messages.map(msg => `${msg.isUser ? 'User' : 'Assistant'}: ${msg.content}`).join('\n');
  const tokenCount = countTokens(messagesText);
  
  if (tokenCount <= maxTokens) {
    return messages;
  }
  
  console.log('[aiService] Conversation exceeds token limit, truncating...');
  
  // Keep the system message (first) and the most recent messages
  // Estimate tokens per message
  const tokensPerMessage = tokenCount / messages.length;
  const messagesToKeep = Math.floor(maxTokens / tokensPerMessage) - 1; // -1 for safety
  
  // Always keep the latest user message and the most recent history
  const latestUserMsgIndex = [...messages].reverse().findIndex(msg => msg.isUser);
  const keepCount = Math.max(2, messagesToKeep); // Always keep at least 2 messages
  
  // If the conversation is very long, keep the first message (system context) and the most recent messages
  if (messages.length > keepCount + 1) {
    // Create a truncation notification message that matches the AIMessage interface
    const truncationMessage: AIMessage = {
      id: crypto.randomUUID(),
      content: `[Note: Some earlier messages were omitted to fit token limits]`,
      isUser: false,
      timestamp: new Date()
    };
    
    return [
      // Keep the system message if it exists
      ...(messages[0].isUser ? [] : [messages[0]]),
      // Add a note about truncation
      truncationMessage,
      // Keep the most recent messages, making sure to include the latest user message
      ...messages.slice(-keepCount)
    ];
  }
  
  return messages;
};

// In a real application, this would interact with an actual AI API endpoint

/**
 * Process a user message and get an AI response using OpenAI
 */
export const processUserMessage = async (
  messages: AIMessage[],
  onChunk: (chunk: string) => void,
  onComplete: (fullResponse: string) => void,
  context?: {
    page?: string;
    meetingId?: string;
    transcriptData?: any;
  }
): Promise<void> => {
  try {
    // Try multiple sources for the API key
    const apiKey = window.ENV?.OPENAI_API_KEY || OPENAI_API_KEY || process.env.REACT_APP_OPENAI_API_KEY || '';
    
    console.log('API Key check in aiService:');
    console.log('- OPENAI_API_KEY from config:', !!OPENAI_API_KEY);
    console.log('- Direct env variable:', !!process.env.REACT_APP_OPENAI_API_KEY);
    console.log('- Window ENV variable:', !!window.ENV?.OPENAI_API_KEY);
    console.log('- Combined key available:', !!apiKey);
    
    if (!apiKey) {
      throw new Error('OpenAI API key is missing');
    }

    // Format messages for OpenAI API
    const formattedMessages = messages.map(msg => ({
      role: msg.isUser ? 'user' : 'assistant',
      content: msg.content
    }));
    
    // Get best available transcript data and truncate if needed
    let transcriptData = context?.transcriptData || window.transcriptData;
    if (transcriptData && Array.isArray(transcriptData) && transcriptData.length > 0) {
      transcriptData = truncateTranscript(transcriptData);
      // Update the context with truncated data
      if (context) {
        context.transcriptData = transcriptData;
      }
    }
    
    // Add system message based on context
    const systemMessage = getSystemPrompt(context);
    
    // Log a summary of the system prompt for debugging
    const maxPromptPreview = 100; // Limit the preview length to avoid flooding the console
    console.log(`System prompt includes transcript: ${systemMessage.includes('transcript of the meeting')}`, {
      promptLength: systemMessage.length,
      promptPreview: systemMessage.substring(0, maxPromptPreview) + (systemMessage.length > maxPromptPreview ? '...' : '')
    });
    
    // Truncate messages if needed
    const truncatedMessages = truncateMessages(messages);
    const finalFormattedMessages = truncatedMessages.map(msg => ({
      role: msg.isUser ? 'user' : 'assistant',
      content: msg.content
    }));
    
    const requestBody = {
      model: CHAT_CONFIG.model,
      messages: [
        { role: "system", content: systemMessage },
        ...finalFormattedMessages
      ],
      temperature: CHAT_CONFIG.temperature,
      max_tokens: CHAT_CONFIG.max_tokens,
      stream: true
    };

    console.log('Making OpenAI API request');
    
    // Make streaming request to OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    // Process the stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim() !== '');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content || '';
            
            if (content) {
              fullResponse += content;
              onChunk(content);
            }
          } catch (e) {
            console.error('Error parsing chunk:', e);
          }
        }
      }
    }
    
    onComplete(fullResponse);
  } catch (error) {
    console.error('Error processing message:', error);
    onChunk('Sorry, there was an error processing your request. Please try again.');
    onComplete('Sorry, there was an error processing your request. Please try again.');
  }
};

/**
 * Get system prompt based on context
 */
const getSystemPrompt = (context?: { page?: string; meetingId?: string; transcriptData?: any }): string => {
  // Get username from localStorage
  const username = localStorage.getItem("username") || "Unknown User";
  
  const basePrompt = `You are a helpful AI assistant specialized in helping users understand and analyze meeting transcripts. Provide concise, accurate responses. If you don't know something, say so rather than making up information. The user's username is: ${username}.`;
  
  console.log("[aiService] Building system prompt with context:", {
    username,
    page: context?.page,
    meetingId: context?.meetingId,
    hasTranscriptData: !!context?.transcriptData,
    transcriptLength: context?.transcriptData?.length || 0,
    windowTranscriptAvailable: !!window.transcriptData,
    windowTranscriptLength: window.transcriptData?.length || 0,
    urlPath: window.location.pathname
  });
  
  // Determine if we're in a transcript detail view
  const isDetailView = (context?.meetingId && context?.page === 'transcript-detail') || 
                       (window.location.pathname.includes('/transcript') && 
                        ((context?.transcriptData && context.transcriptData.length > 0) || 
                         (window.transcriptData && window.transcriptData.length > 0)));
  
  // Determine page type based on isDetailView flag
  const pageType = isDetailView ? 'transcript-detail' : (context?.page || 
                  (window.location.pathname.includes('/transcript') ? 'transcript-list' : 'unknown'));
  
  // Get best available transcript data
  const transcriptData = context?.transcriptData || window.transcriptData;
  
  // Different prompts based on the page context
  switch (pageType) {
    case 'transcript-detail':
      // Meeting detail view 
      let detailPrompt = `${basePrompt} 
      The user is currently viewing a transcript for meeting ID: ${context?.meetingId || 'unknown'}. 
      Help them extract insights, summarize content, identify action items, and understand the meeting dynamics.`;
      
      console.log('[aiService] Building system prompt for TRANSCRIPT DETAIL VIEW');
      
      if (transcriptData && Array.isArray(transcriptData) && transcriptData.length > 0) {
        // Add transcript data to the prompt
        detailPrompt += `\n\nHere is the transcript of the meeting:\n\n`;
        
        // Format the transcript in a clean, readable way
        let formattedTranscript = "";
        transcriptData.forEach((msg: any) => {
          if (msg.speaker && msg.content) {
            const timestamp = msg.call_time || msg.timestamp || '';
            formattedTranscript += `[${timestamp}] ${msg.speaker}: ${msg.content}\n`;
          }
        });
        
        detailPrompt += formattedTranscript;
        detailPrompt += `\n\nPlease analyze the above transcript to provide insightful responses to the user's questions.`;
        console.log('[aiService] Added transcript data to prompt with', transcriptData.length, 'messages');
      } else {
        detailPrompt += `\n\nNOTE: The transcript data is not available. Please inform the user that you don't have access to the meeting transcript content.`;
      }
      
      return detailPrompt;
      
    case 'transcript-list':
      // Meeting list view
      console.log('[aiService] Building system prompt for MEETING LIST VIEW');
      return `${basePrompt} 
      The user is currently viewing a list of meetings, not a specific transcript. 
      You can help them with:
      1. How to select a meeting to view its transcript
      2. General information about how to use the transcript viewer
      3. What features are available for analyzing meetings
      4. How the AI can help analyze meeting content once a meeting is selected`;
      
    case 'dashboard':
      // Dashboard view
      console.log('[aiService] Building system prompt for DASHBOARD');
      return `${basePrompt} 
      The user is currently on the dashboard page. 
      You can help them navigate to the meetings page, understand the application features, 
      or answer general questions about the system.`;
      
    default:
      // Default for unknown pages
      console.log('[aiService] Using default prompt (unknown page type)');
      return basePrompt;
  }
};

// Add a debug utility function to view the current system prompt
// This can be called from the browser console for debugging
window.debugSystemPrompt = () => {
  // Better context detection based on URL path and transcript data availability
  const isInTranscriptPath = window.location.pathname.includes('/transcript');
  const hasTranscriptData = window.transcriptData && window.transcriptData.length > 0;
  
  // Determine the most likely page type
  let pageType = 'unknown';
  if (isInTranscriptPath) {
    pageType = hasTranscriptData ? 'transcript-detail' : 'transcript-list';
  } else if (window.location.pathname.includes('/dashboard')) {
    pageType = 'dashboard';
  }
  
  const currentContext = {
    page: pageType,
    meetingId: window.location.pathname.split('/').pop() || '',
    transcriptData: window.transcriptData
  };
  
  const prompt = getSystemPrompt(currentContext);
  console.log("=== CURRENT SYSTEM PROMPT ===");
  console.log("Context:", currentContext);
  console.log("Page Type:", pageType);
  console.log("Has Transcript Data:", hasTranscriptData);
  console.log("Is in Transcript Path:", isInTranscriptPath);
  console.log("Prompt includes transcript:", prompt.includes("transcript of the meeting"));
  console.log("Prompt length:", prompt.length);
  console.log("Prompt preview (first 200 chars):", prompt.substring(0, 200) + "...");
  
  // Get contextual suggestions to verify they're working
  const suggestions = getContextualSuggestions(currentContext);
  console.log("Current Contextual Suggestions:", suggestions);
  
  // Calculate token counts for the prompt and transcript
  const promptTokens = countTokens(prompt);
  console.log("System prompt token count:", promptTokens);
  
  let transcriptTokens = 0;
  if (hasTranscriptData && window.transcriptData) {
    let transcriptText = "";
    window.transcriptData.forEach((msg: any) => {
      if (msg.speaker && msg.content) {
        const timestamp = msg.call_time || msg.timestamp || '';
        transcriptText += `[${timestamp}] ${msg.speaker}: ${msg.content}\n`;
      }
    });
    transcriptTokens = countTokens(transcriptText);
    console.log("Transcript token count:", transcriptTokens);
    
    // Show truncated version for comparison
    const truncatedData = truncateTranscript(window.transcriptData || []);
    console.log("Truncated transcript would have", truncatedData.length, "messages (original:", window.transcriptData.length, ")");
  }
  
  return {
    fullPrompt: prompt,
    hasTranscript: prompt.includes("transcript of the meeting"),
    transcriptAvailable: !!window.transcriptData,
    transcriptLength: window.transcriptData?.length || 0,
    pageType,
    suggestions,
    tokenCounts: {
      promptTokens,
      transcriptTokens,
      totalTokens: promptTokens + transcriptTokens,
      exceedsLimit: (promptTokens + transcriptTokens) > MAX_TRANSCRIPT_TOKENS
    }
  };
};

// Add token counting debug utility
window.countTokens = (text: string) => {
  if (!text) {
    console.log("No text provided");
    return 0;
  }
  const count = countTokens(text);
  console.log(`Text length: ${text.length} characters, Token count: ${count} tokens`);
  return count;
};

// Add to the window object
declare global {
  interface Window {
    transcriptData?: any[];
    debugSystemPrompt?: () => any;
    countTokens?: (text: string) => number;
  }
}

/**
 * Check if the conversation is too long and should be reset
 * @param messages Array of messages
 */
export const isConversationTooLong = (messages: AIMessage[]): boolean => {
  // Rough estimate: 1 token is about 4 characters for English text
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
  // Check if we're in transcript detail view by looking at window.transcriptData or context
  const isDetailView = (context.meetingId && context.page === 'transcript-detail') || 
                       (window.location.pathname.includes('/transcript') && 
                        window.transcriptData && window.transcriptData.length > 0);
  
  // Provide different suggestions based on context
  if (isDetailView) {
    return [
      'What were the key points discussed?',
      'Summarize the action items from this meeting',
      'Who spoke the most in this meeting?',
      'What decisions were made about the project?'
    ];
  } else if (context.page === 'dashboard') {
    return [
      'Show me meetings from last week',
      'Find discussions about the marketing campaign',
      'Which meetings had John as a participant?',
      'What topics have been trending in recent meetings?'
    ];
  } else {
    // Default for meeting list view
    return [
      'How can I search through my meetings?',
      'Show me my recent meetings',
      'What can you help me with?'
    ];
  }
}; 