import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { ScrollArea } from "../../components/ui/scroll-area";
import { ArrowUpCircle, Loader2, Plus } from "lucide-react";
import { useLocation, useParams } from "react-router-dom";
import { useAI } from "../../lib/AIContext";
import { getContextualSuggestions } from "../../services/aiService";
import { Message } from "../../types";
import Markdown from 'markdown-to-jsx';

// Define more specific context types returned by getCurrentContext
type TranscriptDetailContext = {
  page: 'transcript-detail';
  meetingId: string;
  placeholder: string;
  transcriptData: Message[] | undefined;
};

type TranscriptListContext = {
  page: 'transcript-list';
  placeholder: string;
};

type DashboardContext = {
  page: 'dashboard';
  placeholder: string;
};

type CurrentContextType = TranscriptDetailContext | TranscriptListContext | DashboardContext;

// Helper to determine the initial context based on URL and potential data
const getInitialContext = (): CurrentContextType => {
  const path = window.location.pathname;
  const meetingIdFromUrl = path.startsWith('/transcript/') ? path.split('/').pop() : undefined;
  const hasWindowData = window.transcriptData && Array.isArray(window.transcriptData) && window.transcriptData.length > 0;

  if (hasWindowData) {
    return {
      page: 'transcript-detail',
      meetingId: meetingIdFromUrl || 'unknown',
      placeholder: "Ask about this meeting...",
      transcriptData: window.transcriptData
    };
  } else if (path.includes('/transcript')) {
    return {
      page: 'transcript-list',
      placeholder: "Ask about meetings..."
    };
  } else {
    return {
      page: 'dashboard',
      placeholder: "Ask a question...",
    };
  }
};

const RightSidebar = () => {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const { messages: aiMessages, addUserMessage, clearMessages, isProcessing, resetChatIfTooLong } = useAI();
  const location = useLocation();
  const params = useParams();
  const meetingId = params.id || "";
  const [transcriptData, setTranscriptData] = useState<Message[]>([]); // Keep local copy if needed, but primary detection uses window
  
  // *** Use useState to manage the current context ***
  const [currentContext, setCurrentContext] = useState<CurrentContextType>(getInitialContext());
  
  // *** Ref to hold the latest context state for use in intervals/callbacks ***
  const contextRef = useRef(currentContext);
  useEffect(() => {
    console.log(`[RightSidebar contextRef Update] Updating ref with page: ${currentContext.page}`);
    contextRef.current = currentContext;
  }, [currentContext]);

  // Determine current page context (Define this before updateContext)
  const getCurrentContext = useCallback((): CurrentContextType => {
    // Log for debugging
    const hasWindowData = window.transcriptData && Array.isArray(window.transcriptData) && window.transcriptData.length > 0;
    console.log(`[RightSidebar getCurrentContext] Called. Path: ${location.pathname}, MeetingID: ${meetingId}, Has window.transcriptData: ${hasWindowData}, Window data length: ${window.transcriptData?.length || 0}`);
    
    // Key detection: if we have transcript data, we're in meeting detail view
    if (hasWindowData) {
      // We are in a meeting detail view with transcript data
      const contextResult: TranscriptDetailContext = {
        page: 'transcript-detail', // Use a more specific page type
        meetingId: meetingId || 'unknown',
        placeholder: "Ask about this meeting...",
        // Ensure we pass an array or undefined, matching the type
        transcriptData: window.transcriptData ? [...window.transcriptData] : undefined
      };
      console.log("[RightSidebar getCurrentContext] Determined context: transcript-detail", { page: contextResult.page, meetingId: contextResult.meetingId, placeholder: contextResult.placeholder, length: contextResult.transcriptData?.length });
      return contextResult;
    }
    
    // Check if we're on the transcript page path but with no data (meeting list)
    if (location.pathname.includes('/transcript')) {
      const contextResult: TranscriptListContext = {
        page: 'transcript-list', // Distinguish the list view
        placeholder: "Ask about meetings..."
      };
      console.log("[RightSidebar getCurrentContext] Determined context: transcript-list", contextResult);
      return contextResult;
    }
    
    // Default for other pages
    const contextResult: DashboardContext = {
      page: 'dashboard',
      placeholder: "Ask a question...",
    };
    console.log("[RightSidebar getCurrentContext] Determined context: dashboard", contextResult);
    return contextResult;
  }, [location.pathname, meetingId]); // Dependencies are correct

  // Function to recalculate and update the context state
  const updateContext = useCallback(() => {
    const newContext = getCurrentContext(); // Use the existing logic (now defined above)
    const latestContextState = contextRef.current; // Read latest state via ref
    
    // Determine if transcript data actually changed (relevant for detail view)
    let transcriptDataChanged = false;
    if (newContext.page === 'transcript-detail' && latestContextState.page === 'transcript-detail') {
        // Compare lengths or deep compare if necessary, for now length is often sufficient
        transcriptDataChanged = newContext.transcriptData?.length !== latestContextState.transcriptData?.length;
    }

    // Only update state if the page type changed OR if transcript data changed within detail view
    if (latestContextState.page !== newContext.page || transcriptDataChanged)
    {
        console.log(`[RightSidebar updateContext] Context changing from ${latestContextState.page} to ${newContext.page}. Data changed: ${transcriptDataChanged}`);
        setCurrentContext(newContext);
    } else {
        console.log(`[RightSidebar updateContext] No context change needed (already ${newContext.page}, data changed: ${transcriptDataChanged}).`);
    }
  }, [getCurrentContext]); // Now depends only on the stable getCurrentContext callback

  // Get transcript data and update context when available
  useEffect(() => {
    const getTranscriptDataAndUpdateContext = () => {
      // Function now determines *if* an update is needed based on window data
      const hasWindowDataNow = window.transcriptData && Array.isArray(window.transcriptData) && window.transcriptData.length > 0;
      const latestContextState = contextRef.current; // Read latest state via ref

      console.log(`[getTranscriptDataAndUpdateContext] Checking. HasWindowData: ${hasWindowDataNow}, CurrentContextPage: ${latestContextState.page}`);

      if (hasWindowDataNow && latestContextState.page !== 'transcript-detail') {
        console.log("-> Data found, context needs update to detail.");
        // Ensure we pass a valid array to setTranscriptData
        setTranscriptData(window.transcriptData ? [...window.transcriptData] : []); 
        updateContext(); // This recalculates based on latest window data & sets state
        return true;
      } else if (!hasWindowDataNow && latestContextState.page === 'transcript-detail') {
        console.log("-> No data found, context needs update away from detail.");
        setTranscriptData([]); // Clear local state
        updateContext(); // This recalculates & sets state
        return false;
      } else {
        console.log(`-> No context update needed. HasData: ${hasWindowDataNow}, CurrentPage: ${latestContextState.page}`);
        // Update local transcript state if window has data but context is already correct
        // Ensure type safety when comparing IDs
        if (hasWindowDataNow && window.transcriptData && (!transcriptData || transcriptData.length === 0 || transcriptData[0]?.id !== window.transcriptData[0]?.id)) {
           setTranscriptData([...window.transcriptData]); // Pass a new array copy
        }
        return hasWindowDataNow;
      }
    };

    // Log the current path for debugging
    console.log(`[RightSidebar Effect Hook] Running. Path: ${location.pathname}, MeetingID: ${meetingId}, Initial context page: ${contextRef.current.page}`); // Use ref for initial log too
    
    // Initial check
    getTranscriptDataAndUpdateContext();
      
    // Set up a listener for the custom event from Transcript component
    const handleTranscriptDataReady = (event: CustomEvent) => {
      console.log("*********** [RightSidebar] Received transcriptDataReady event! ***********", event.detail);
      console.log("[RightSidebar] EVENT: Attempting context update.");
      getTranscriptDataAndUpdateContext();
    };
    
    // Add the event listener for transcript data changes
    console.log("[RightSidebar Effect Hook] Adding transcriptDataReady event listener.");
    window.addEventListener('transcriptDataReady', handleTranscriptDataReady as EventListener);
    
    // Set up polling check
    console.log("[RightSidebar Effect Hook] Starting polling check for window.transcriptData.");
    const checkForTranscriptInterval = setInterval(() => {
      const hasWindowDataNow = window.transcriptData && Array.isArray(window.transcriptData) && window.transcriptData.length > 0;
      
      // *** Read the LATEST context state using the ref inside the interval ***
      const actualCurrentPage = contextRef.current.page; 
      
      const expectedPageType = hasWindowDataNow ? 'transcript-detail' : 
                              (location.pathname.includes('/transcript') ? 'transcript-list' : 'dashboard');

      // Check if the *actual* latest context state matches the expected state
      if (actualCurrentPage !== expectedPageType) {
          console.log(`*********** [RightSidebar Polling Check] Detected MISMATCH! Expected: ${expectedPageType}, Actual: ${actualCurrentPage}. HasData: ${hasWindowDataNow} ***********`);
          // Call the update function which will internally call getCurrentContext and setCurrentContext
          getTranscriptDataAndUpdateContext(); 
      } else {
          // Optional: Reduce logging frequency when stable
          // console.log(`[Polling Check] State stable. Expected: ${expectedPageType}, Actual: ${actualCurrentPage}`);
      }
    }, 2000); // Check every 2 seconds
    
    // Clean up all listeners and intervals when component unmounts
    return () => {
      console.log("[RightSidebar Effect Hook] Cleaning up listeners and intervals.");
      clearInterval(checkForTranscriptInterval);
      window.removeEventListener('transcriptDataReady', handleTranscriptDataReady as EventListener);
    };
  }, [location.pathname, meetingId, updateContext]); // Dependencies seem stable now

  // Load contextual suggestions when page changes (depends on the context state)
  useEffect(() => {
    const suggestionsContext = {
      page: currentContext.page,
      meetingId: currentContext.page === 'transcript-detail' ? currentContext.meetingId : undefined,
    };
    console.log("[RightSidebar Suggestions Effect] Updating suggestions for page:", currentContext.page);
    const newSuggestions = getContextualSuggestions(suggestionsContext);
    setSuggestions(newSuggestions);
    // Use a dependency that changes reliably when the view type changes
  }, [currentContext.page, currentContext.page === 'transcript-detail' ? currentContext.meetingId : null]); 

  const handleSendMessage = () => {
    if (!input.trim()) return;
    
    // Get the latest context state
    const contextToSend = currentContext; 
    
    // For debugging - log the context being sent
    console.log('[RightSidebar handleSendMessage] Context before sending:', {
      page: contextToSend.page,
      meetingId: contextToSend.page === 'transcript-detail' ? contextToSend.meetingId : undefined,
      hasTranscript: contextToSend.page === 'transcript-detail' && !!contextToSend.transcriptData,
      transcriptLength: contextToSend.page === 'transcript-detail' ? contextToSend.transcriptData?.length || 0 : 0
    });
    
    // Reset the chat if it's too long
    if (resetChatIfTooLong()) {
      setTimeout(() => {
        // Resubmit the message after reset
        addUserMessage(input, contextToSend);
        setInput("");
      }, 100);
      return;
    }
    
    // Normal flow
    addUserMessage(input, contextToSend);
    setInput("");
  };

  const handleNewChat = () => {
    clearMessages();
  };

  const handleSuggestionClick = (suggestion: string) => {
    // Get the latest context state
    const contextToSend = currentContext;
    addUserMessage(suggestion, contextToSend);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header with New Chat button */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <Button 
          variant="ghost" 
          className="text-xs flex items-center px-2 py-1 h-7 text-muted-foreground hover:text-foreground"
          onClick={handleNewChat}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          New Chat
        </Button>
        {transcriptData.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {transcriptData.length} messages available
          </span>
        )}
      </div>
      
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-6">
          {aiMessages.length > 0 ? (
            aiMessages.map((message) => (
              <div
                key={message.id}
                className={`group ${
                  message.isUser ? "border-l-2 border-primary" : "border-l-2 border-transparent"
                }`}
              >
                <div className="pl-3">
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.isUser ? (
                      message.content || ""
                    ) : isProcessing && !message.content ? (
                      "■"
                    ) : (
                      <div className="markdown-simple">
                        {/* Add custom list processing */}
                        {message.content && message.content.match(/^\d+\.\s/) ? (
                          // Message starts with a number followed by period - ensure proper list rendering
                          <Markdown 
                            options={{
                              forceBlock: true,
                              forceWrapper: true,
                              wrapper: 'div',
                              overrides: {
                                ol: {
                                  component: ({children, ...props}) => (
                                    <ol className="markdown-list-ordered" style={{listStyleType: 'decimal', paddingLeft: '0.3rem'}} {...props}>
                                      {children}
                                    </ol>
                                  )
                                },
                                ul: {
                                  component: ({children, ...props}) => (
                                    <ul className="markdown-list-unordered" style={{listStyleType: 'disc', paddingLeft: '0.3rem'}} {...props}>
                                      {children}
                                    </ul>
                                  )
                                },
                                li: {
                                  component: ({children, ...props}) => (
                                    <li className="markdown-list-item" {...props}>
                                      {children}
                                    </li>
                                  )
                                },
                                a: {
                                  props: {
                                    className: 'text-primary hover:underline',
                                    target: '_blank',
                                    rel: 'noopener noreferrer'
                                  }
                                },
                                code: {
                                  props: {
                                    className: 'bg-muted text-xs px-1 py-0.5 rounded inline-block'
                                  }
                                },
                                pre: {
                                  props: {
                                    className: 'bg-muted text-xs p-2 my-2 rounded overflow-x-auto'
                                  }
                                },
                                blockquote: {
                                  props: {
                                    className: 'border-l-2 border-muted pl-3 italic my-2'
                                  }
                                },
                                table: {
                                  props: {
                                    className: 'min-w-full border-collapse my-2'
                                  }
                                },
                                th: {
                                  props: {
                                    className: 'px-2 py-1 text-xs font-medium text-left bg-muted/50'
                                  }
                                },
                                td: {
                                  props: {
                                    className: 'px-2 py-1 text-xs border-t border-border'
                                  }
                                }
                              }
                            }}
                          >
                            {message.content || ""}
                          </Markdown>
                        ) : (
                          // Standard rendering
                          <Markdown 
                            options={{
                              forceBlock: true,
                              overrides: {
                                ol: {
                                  props: {
                                    className: 'markdown-list-ordered',
                                    style: {listStyleType: 'decimal', paddingLeft: '0.3rem'}
                                  }
                                },
                                ul: {
                                  props: {
                                    className: 'markdown-list-unordered',
                                    style: {listStyleType: 'disc', paddingLeft: '0.3rem'}
                                  }
                                },
                                li: {
                                  props: {
                                    className: 'markdown-list-item'
                                  }
                                },
                                a: {
                                  props: {
                                    className: 'text-primary hover:underline',
                                    target: '_blank',
                                    rel: 'noopener noreferrer'
                                  }
                                },
                                code: {
                                  props: {
                                    className: 'bg-muted text-xs px-1 py-0.5 rounded inline-block'
                                  }
                                },
                                pre: {
                                  props: {
                                    className: 'bg-muted text-xs p-2 my-2 rounded overflow-x-auto'
                                  }
                                },
                                blockquote: {
                                  props: {
                                    className: 'border-l-2 border-muted pl-3 italic my-2'
                                  }
                                },
                                table: {
                                  props: {
                                    className: 'min-w-full border-collapse my-2'
                                  }
                                },
                                th: {
                                  props: {
                                    className: 'px-2 py-1 text-xs font-medium text-left bg-muted/50'
                                  }
                                },
                                td: {
                                  props: {
                                    className: 'px-2 py-1 text-xs border-t border-border'
                                  }
                                }
                              }
                            }}
                          >
                            {message.content || ""}
                          </Markdown>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Ask me questions about your meetings.
            </div>
          )}
          
          {/* Show suggestions if there are no messages or only the welcome message */}
          {aiMessages.length <= 1 && suggestions.length > 0 && (
            <div className="mt-6 space-y-2">
              <p className="text-xs text-muted-foreground mb-2">You can ask:</p>
              {suggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="w-full justify-start text-left text-xs h-auto py-2"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
      
      <div className="p-3 border-t border-border">
        <div className="flex space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={currentContext.placeholder}
            className="flex-1 text-sm h-9 bg-background"
            disabled={isProcessing}
          />
          <Button 
            onClick={handleSendMessage} 
            size="sm"
            className="h-9 w-9 p-0 rounded-full"
            disabled={isProcessing || !input.trim()}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUpCircle className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Add TypeScript interface extension for the Window object
declare global {
  interface Window {
    transcriptData?: any[];
  }
}

export default RightSidebar; 

// Add minimal styling for markdown-to-jsx
const style = document.createElement('style');
style.textContent = `
  /* Reduce list indentation */
  .markdown-simple ol,
  .markdown-simple ul,
  .markdown-list-ordered,
  .markdown-list-unordered {
    padding-left: 0.3rem;
    margin: 0.5rem 0;
    list-style-position: outside;
  }
  
  /* Ensure ordered lists show numbers */
  .markdown-simple ol,
  .markdown-list-ordered {
    list-style-type: decimal !important;
    margin-left: 0.5rem;
  }
  
  /* Ensure unordered lists show bullets */
  .markdown-simple ul,
  .markdown-list-unordered {
    list-style-type: disc !important;
    margin-left: 0.5rem;
  }
  
  /* Make ordered list markers right-aligned */
  .markdown-simple ol > li::marker,
  .markdown-list-ordered > li::marker {
    font-weight: 600;
    content: counter(list-item) ".";
    padding-right: 0;
    margin-right: 0;
  }
  
  /* Set baseline spacing for paragraphs */
  .markdown-simple p {
    margin: 0.5rem 0;
  }
  
  /* Compact list items */
  .markdown-simple li,
  .markdown-list-item {
    margin-bottom: 0.25rem;
    padding-left: 0.2rem;
    margin-left: 0;
    text-indent: 0;
  }
  
  /* Make list items more compact when they contain paragraphs */
  .markdown-simple li p,
  .markdown-list-item p {
    margin-top: 0;
    margin-bottom: 0.25rem;
    display: inline;
  }
  
  /* Ensure headings have proper spacing */
  .markdown-simple h1,
  .markdown-simple h2,
  .markdown-simple h3 {
    margin-top: 1rem;
    margin-bottom: 0.5rem;
    font-weight: 600;
  }
  
  /* Make sure table is scrollable */
  .markdown-simple table {
    overflow-x: auto;
    display: block;
  }
`;
document.head.appendChild(style); 