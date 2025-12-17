import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect, useRef } from 'react';
import { processUserMessage, isConversationTooLong } from '../services/aiService';
import { useLocation } from 'react-router-dom';

// Enable this to see detailed logs during development
const DEBUG = false;

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
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentResponseId, setCurrentResponseId] = useState<string | null>(null);
  const location = useLocation();
  const [lastContext, setLastContext] = useState<any>(null);
  
  // Track the last context hash to avoid redundant updates
  const lastContextHashRef = useRef<string | null>(null);

  // Compute a cache key/hash for context to efficiently check if it's changed
  const computeContextHash = (context: any): string => {
    if (!context) return 'null';
    // Create a simplified context representation focusing on key fields only
    const simplified = {
      page: context.page,
      meetingId: context.meetingId,
      dataLength: context.transcriptData?.length || 0
    };
    return JSON.stringify(simplified);
  };
  
  // Initialize welcome message based on location
  useEffect(() => {
    const isOnDetailPage = location.pathname.startsWith('/t/');
    const isOnListPage = location.pathname === '/';
    
    if (DEBUG) console.log(`[AIContext] Setting up initial state for path: ${location.pathname}`);
    
    // Initialize with empty messages array instead of welcome message
    if (messages.length === 0) {
      setMessages([]);
    }
  }, [location.pathname, messages.length]);

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
      // Check if the context has actually changed
      const contextHash = computeContextHash(context);
      if (contextHash === lastContextHashRef.current) {
        if (DEBUG) console.log("[AIContext] Skipping init - context unchanged");
        return;
      }
      
      lastContextHashRef.current = contextHash;
      
      if (DEBUG) {
        console.log("[AIContext] Initializing with context:", {
          page: context?.page,
          meetingId: context?.meetingId,
          hasTranscriptData: !!context?.transcriptData,
          transcriptLength: context?.transcriptData?.length || 0
        });
      }
      
      // Store the context for future reference
      setLastContext(context);
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

    // Check for any significant context changes
    const contextHash = computeContextHash(context);
    const hasChanged = contextHash !== lastContextHashRef.current;
    
    if (hasChanged) {
      if (DEBUG) console.log('[AIContext] Context has changed since last message');
      lastContextHashRef.current = contextHash;
      setLastContext(context);
    }

    // Log the context being sent (only in debug mode)
    if (DEBUG) {
      console.log('[AIContext] Final context being sent to AI:', {
        hasContext: !!context,
        hasTranscriptData: !!context?.transcriptData,
        transcriptLength: context?.transcriptData?.length || 0,
        page: context?.page,
        contextKeys: context ? Object.keys(context) : [],
        pathname: location.pathname,
        contextChanged: hasChanged
      });
    }

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
      context
    );
  }, [messages, resetChatIfTooLong, location.pathname, lastContext]);

  // Clear all messages except the initial greeting
  const clearMessages = useCallback(() => {
    if (DEBUG) console.log("[AIContext] Clearing messages");
    
    // Initialize with empty messages array
    setMessages([]);
    
    // Also clear last context when starting a new chat
    setLastContext(null);
    lastContextHashRef.current = null;
  }, []);

  // Use useMemo to create the context value to prevent unnecessary rerenders
  const value = useMemo(() => ({
    messages,
    addUserMessage,
    clearMessages,
    isProcessing,
    resetChatIfTooLong,
  }), [messages, addUserMessage, clearMessages, isProcessing, resetChatIfTooLong]);

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
}; 