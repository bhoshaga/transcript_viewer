import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { processUserMessage, isConversationTooLong } from '../services/aiService';

// Define message type
export interface AIMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

// Define context type
interface AIContextType {
  messages: AIMessage[];
  addUserMessage: (content: string, context?: any) => void;
  clearMessages: () => void;
  isProcessing: boolean;
  resetChatIfTooLong: () => boolean;
}

// Create context with default values
const AIContext = createContext<AIContextType>({
  messages: [],
  addUserMessage: () => {},
  clearMessages: () => {},
  isProcessing: false,
  resetChatIfTooLong: () => false,
});

// Custom hook to use the AI context
export const useAI = () => useContext(AIContext);

// Provider component
export const AIProvider = ({ children }: { children: ReactNode }) => {
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: '1',
      content: "Hello! I'm your AI assistant. How can I help you understand your meetings today?",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentResponseId, setCurrentResponseId] = useState<string | null>(null);

  // Reset chat if conversation is too long
  const resetChatIfTooLong = useCallback((): boolean => {
    if (isConversationTooLong(messages)) {
      setMessages([
        {
          id: Date.now().toString(),
          content: "The conversation has been reset due to length. How else can I help you today?",
          isUser: false,
          timestamp: new Date(),
        },
      ]);
      return true;
    }
    return false;
  }, [messages]);

  // Add a user message and get an AI response with streaming
  const addUserMessage = useCallback((content: string, context?: any) => {
    // Special case for initialization - just set up context without adding a message
    if (content === "__INIT__") {
      console.log("[AIContext] Initializing with context:", {
        page: context?.page,
        meetingId: context?.meetingId,
        hasTranscriptData: !!context?.transcriptData,
        transcriptLength: context?.transcriptData?.length || 0
      });
      return;
    }
    
    if (!content.trim()) return;

    // Check if chat needs to be reset due to length
    if (resetChatIfTooLong()) return;

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      content,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsProcessing(true);

    // Create placeholder for AI response
    const responseId = (Date.now() + 1).toString();
    setCurrentResponseId(responseId);
    
    setMessages((prev) => [
      ...prev, 
      {
        id: responseId,
        content: "",
        isUser: false,
        timestamp: new Date(),
      }
    ]);

    // Get latest transcript data directly from window if available
    const latestContext = {
      ...context,
      // Make sure to include latest transcript data if not already in context
      transcriptData: context?.transcriptData || window.transcriptData
    };

    console.log('[AIContext] Final context being sent to AI:', {
      hasContext: !!latestContext,
      hasTranscriptData: !!latestContext?.transcriptData,
      transcriptLength: latestContext?.transcriptData?.length || 0,
      page: latestContext?.page,
      contextKeys: latestContext ? Object.keys(latestContext) : [],
      windowTranscriptAvailable: !!window.transcriptData,
      windowTranscriptLength: window.transcriptData?.length || 0,
      windowObject: !!window,
      pathname: window.location.pathname
    });

    // Process the message with streaming
    processUserMessage(
      [...messages, userMessage],
      // Handle streaming chunks
      (chunk: string) => {
        setMessages((currentMessages) => {
          const updatedMessages = [...currentMessages];
          const responseIndex = updatedMessages.findIndex((msg) => msg.id === responseId);
          
          if (responseIndex !== -1) {
            updatedMessages[responseIndex] = {
              ...updatedMessages[responseIndex],
              content: updatedMessages[responseIndex].content + chunk,
            };
          }
          
          return updatedMessages;
        });
      },
      // Handle completion
      () => {
        setIsProcessing(false);
        setCurrentResponseId(null);
      },
      latestContext
    );
  }, [messages, resetChatIfTooLong]);

  // Clear all messages except the initial greeting
  const clearMessages = useCallback(() => {
    console.log("[AIContext] Clearing messages and re-initializing context.");
    setMessages([
      {
        id: Date.now().toString(),
        content: "Hello! I'm your AI assistant. How can I help you understand your meetings today?",
        isUser: false,
        timestamp: new Date(),
      },
    ]);

    // Re-initialize with current transcript data if available using the __INIT__ mechanism
    if (window.transcriptData && Array.isArray(window.transcriptData) && window.transcriptData.length > 0) {
      console.log("[AIContext] Re-initializing with transcript data after clearing messages.");
      // Use the addUserMessage with __INIT__ to update context consistently
      addUserMessage("__INIT__", {
        page: 'transcript-detail', // Assume detail if transcript data exists
        meetingId: window.location.pathname.split('/').pop() || 'unknown',
        transcriptData: window.transcriptData
      });
    } else {
      // If no transcript data, initialize with appropriate context (e.g., list or dashboard)
      const currentPage = window.location.pathname.includes('/transcript') ? 'transcript-list' : 'dashboard';
      console.log(`[AIContext] Initializing with ${currentPage} context after clearing (no transcript data).`);
      addUserMessage("__INIT__", {
        page: currentPage
      });
    }
  }, [addUserMessage]);

  const value = {
    messages,
    addUserMessage,
    clearMessages,
    isProcessing,
    resetChatIfTooLong,
  };

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
}; 