import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { ArrowUpCircle, Loader2, Plus } from "lucide-react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { useAI } from "../../lib/AIContext";
import { useTranscript } from "../../lib/TranscriptContext";
import { useAuth } from "../../contexts/AuthContext";
import { getContextualSuggestions } from "../../services/aiService";
import Markdown from 'markdown-to-jsx';
import { cn } from "../../lib/utils";

// Local Message type for transcript data
interface Message {
  id: string;
  speaker: string;
  content: string;
  call_time?: string;
  timestamp?: string;
}

// Custom CSS to hide scrollbars while preserving functionality
const hideScrollbarStyles = `
  /* Hide scrollbar for the right sidebar specifically */
  .right-sidebar .scrollbar {
    width: 0 !important;
    opacity: 0 !important;
    display: none !important;
  }

  /* For Webkit browsers (Chrome, Safari) */
  .right-sidebar *::-webkit-scrollbar {
    width: 0 !important;
    display: none !important;
  }

  /* For Firefox */
  .right-sidebar * {
    scrollbar-width: none !important;
  }

  /* For IE/Edge */
  .right-sidebar * {
    -ms-overflow-style: none !important;
  }
`;

// Apply the styles once when the component is loaded
if (typeof document !== 'undefined') {
  const existingStyle = document.getElementById('right-sidebar-no-scrollbar');
  if (!existingStyle) {
    const style = document.createElement('style');
    style.id = 'right-sidebar-no-scrollbar';
    style.textContent = hideScrollbarStyles;
    document.head.appendChild(style);
  }
}

// Define more specific context types returned by getCurrentContext
type TranscriptDetailContext = {
  page: 'transcript-detail';
  meetingId: string;
  placeholder: string;
  meetingName?: string;
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

// Enable this to see detailed logs during development
const DEBUG = false;

// Add a function to get random greeting
const getRandomGreeting = (day: string, username: string) => {
  const greetings = [
    `Happy ${day}, ${username}! Ready to explore your meetings?`,
    `${day} greetings, ${username}! How can I assist with your meetings today?`,
    `Welcome back, ${username}! How's your ${day} going?`,
    `It's a great ${day} to analyze meetings, ${username}!`,
    `Hello ${username}! How can I help make your ${day} more productive?`,
    `Hi ${username}! Let's make this ${day} count!`,
    `${username}, ready to dive into your meetings this ${day}?`,
    `Glad to see you this ${day}, ${username}!`,
    `${day}'s the perfect day to get insights, ${username}!`,
    `${username}, what would you like to know about your meetings this ${day}?`
  ];
  
  // Return a random greeting from the array
  return greetings[Math.floor(Math.random() * greetings.length)];
};

// Add props type for the component
interface RightSidebarProps {}

// Simple scroll container with hidden scrollbar
const ScrollAreaHiddenBar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("relative overflow-y-auto scrollbar-hide", className)}
    {...props}
  >
    {children}
  </div>
));
ScrollAreaHiddenBar.displayName = "ScrollAreaHiddenBar";

const RightSidebar = ({}: RightSidebarProps) => {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const { messages: aiMessages, addUserMessage, clearMessages, isProcessing, resetChatIfTooLong } = useAI();
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();
  const { transcriptData, isDetailView, selectedMeetingId } = useTranscript();
  const meetingId = selectedMeetingId || params.id || "";
  const { user } = useAuth();

  // Track the meeting name for creating better placeholder messages
  const [currentMeetingName, setCurrentMeetingName] = useState<string | undefined>(undefined);
  
  // Add this with the other state variables at the top of the component
  const lastTranscriptLengthRef = useRef<number | null>(null);
  
  // Add a ref for the scroll area
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Add state for the greeting
  const [greeting, setGreeting] = useState<string>("");
  
  // Set initial greeting when component mounts
  useEffect(() => {
    const today = new Date();
    const dayName = today.toLocaleDateString(undefined, { weekday: 'long' });
    const username = localStorage.getItem("username") || "there";
    setGreeting(getRandomGreeting(dayName, username));
  }, []);

  // Create a placeholder based on view state
  const createPlaceholder = useCallback(() => {
    if (isDetailView && currentMeetingName) {
      return `Ask about "${currentMeetingName}"...`;
    } else {
      return "Ask about these meetings...";
    }
  }, [isDetailView, currentMeetingName]);

  // Generate placeholder message
  const placeholder = useMemo(() => {
    return createPlaceholder();
  }, [createPlaceholder]);

  // Only log view state changes when DEBUG is true
  useEffect(() => {
    // Log only when the view state changes, not every render
    if (DEBUG) {
      console.log(`[RightSidebar] View state: ${isDetailView ? 'Detail' : 'List'}, Meeting name: ${currentMeetingName || 'None'}`);
    }
  }, [isDetailView, currentMeetingName]);
  
  // Get actual meeting name from transcript data if we have it
  useEffect(() => {
    if (transcriptData && transcriptData.length > 0) {
      // Try to find a name in the first message (typically contains meeting info)
      const firstMessage = transcriptData[0];
      if (firstMessage && firstMessage.content) {
        // Look for a meeting name in the content
        const contentText = firstMessage.content;
        // Check for common meeting intro patterns like "Welcome to the X meeting"
        if (contentText.toLowerCase().includes('meeting') || 
            contentText.toLowerCase().includes('call') || 
            contentText.toLowerCase().includes('discussion')) {
          // Very basic extraction - could improve with NLP
          if (contentText.includes('"') || contentText.includes('"')) {
            // Look for quoted name
            const matches = contentText.match(/[""]([^""]+)[""]/) || contentText.match(/["']([^"']+)["']/);
            if (matches && matches[1]) {
              setCurrentMeetingName(matches[1]);
              return;
            }
          }
        }
        
        // Fallback to generic name with date if no name found
        const date = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        setCurrentMeetingName(`Meeting on ${date}`);
      }
    }
  }, [transcriptData]);
  
  // Then modify the transcriptData effect to only update AI when needed
  useEffect(() => {
    if (DEBUG) console.log(`[RightSidebar] transcriptData changed: ${transcriptData?.length || 0} messages`);
    
    // Only proceed if we have transcript data
    if (transcriptData && transcriptData.length > 0) {
      // Check if this is the same length as last time we processed
      const currentLength = transcriptData.length;
      if (lastTranscriptLengthRef.current === currentLength) {
        if (DEBUG) console.log('[RightSidebar] Skipping AI init - same transcript length');
        return;
      }
      
      // Update reference with current length
      lastTranscriptLengthRef.current = currentLength;
      
      // Get fresh suggestions for transcript detail view
      const suggestionParams = {
        page: 'transcript-detail',
        meetingId
      };
      
      if (DEBUG) console.log('[RightSidebar] Updating suggestions for transcript data change');
      const newDetailSuggestions = getContextualSuggestions(suggestionParams);
      setSuggestions(newDetailSuggestions);
      
      // Initialize AI context with transcript data
      const transcriptContext = {
        page: 'transcript-detail',
        meetingId,
        transcriptData: [...transcriptData],
        meetingName: currentMeetingName,
        placeholder: createPlaceholder()
      };
      
      if (DEBUG) {
        console.log('[RightSidebar] Initializing AI with transcript data (length changed)');
      }
      // Pass special __INIT__ command to update context without adding a message
      addUserMessage("__INIT__", transcriptContext);
    }
  }, [transcriptData, meetingId, addUserMessage, currentMeetingName, createPlaceholder]);

  // Initialize context on mount based on URL
  useEffect(() => {
    // On first mount, determine the context based on location
    const isOnMeetingDetailPage = location.pathname.startsWith('/t/') || location.pathname.startsWith('/s/');
    const isSharedView = location.pathname.startsWith('/s/');

    if (DEBUG) console.log(`[RightSidebar] Initial context: IsDetail=${isOnMeetingDetailPage}, MeetingID=${meetingId}`);

    // Set appropriate suggestions based on path
    if (isOnMeetingDetailPage && meetingId) {
      const suggestionParams = {
        page: 'transcript-detail',
        meetingId
      };
      const detailSuggestions = getContextualSuggestions(suggestionParams);
      setSuggestions(detailSuggestions);
    } else if (!isSharedView) {
      // Only show list suggestions for non-shared views
      const listSuggestionParams = {
        page: 'transcript-list'
      };
      const listSuggestions = getContextualSuggestions(listSuggestionParams);
      setSuggestions(listSuggestions);
    }
    // For shared view without meetingId yet, don't set suggestions (wait for meeting to load)
  }, [location.pathname, meetingId]);

  // Add this after the existing initializing effect that runs on mount
  // This effect specifically handles URL path changes
  useEffect(() => {
    // When the user navigates to a meeting detail page
    if ((location.pathname.startsWith('/t/') || location.pathname.startsWith('/s/')) && meetingId) {
      if (DEBUG) console.log(`[RightSidebar] URL changed to meeting detail: ${meetingId}`);
      
      // Immediately update suggestions for the transcript detail view
      const suggestionParams = {
        page: 'transcript-detail',
        meetingId
      };
      
      const detailSuggestions = getContextualSuggestions(suggestionParams);
      setSuggestions(detailSuggestions);

      // Set the context even before transcript data arrives
      setCurrentContext({
        page: 'transcript-detail',
        meetingId,
        placeholder: createPlaceholder(),
        transcriptData: undefined
      });
    } else if (location.pathname === '/') {
      // When navigating to meeting list
      if (DEBUG) console.log('[RightSidebar] URL changed to meeting list view');
      
      const listSuggestionParams = {
        page: 'transcript-list'
      };
      
      const listSuggestions = getContextualSuggestions(listSuggestionParams);
      setSuggestions(listSuggestions);

      // Set the context for meeting list view
      setCurrentContext({
        page: 'transcript-list',
        placeholder: createPlaceholder()
      });
    }
  }, [location.pathname, meetingId, createPlaceholder]);

  // Get the current page context based on URL and state
  const getCurrentContext = useCallback((): CurrentContextType => {
    // Check if we're in detail view with a meeting ID in the URL
    const isOnMeetingDetailPage = location.pathname.startsWith('/t/') || location.pathname.startsWith('/s/');
    // Check if we have actual transcript data available
    const hasTranscriptData = !!transcriptData && transcriptData.length > 0;
    
    // If we're on a meeting detail page (/t/:id)
    if (isOnMeetingDetailPage) {
      if (hasTranscriptData) {
        // We have both the URL and data - full context is available
        const contextResult: TranscriptDetailContext = {
          page: 'transcript-detail',
          meetingId,
          placeholder: createPlaceholder(),
          meetingName: currentMeetingName,
          transcriptData: [...transcriptData]
        };
        
        if (DEBUG) console.log("[RightSidebar] Complete transcript context ready", { 
          meetingId: contextResult.meetingId, 
          dataLength: contextResult.transcriptData?.length 
        });
        
        return contextResult;
      } else {
        // We're on a detail page but transcript data isn't loaded yet
        if (DEBUG) console.log("[RightSidebar] On transcript detail page but no data yet");
        return {
          page: 'transcript-detail',
          meetingId,
          placeholder: createPlaceholder(),
          transcriptData: undefined
        };
      }
    }
    
    // Check if we're on the meeting list page (root URL /)
    if (location.pathname === '/') {
      const contextResult: TranscriptListContext = {
        page: 'transcript-list',
        placeholder: createPlaceholder()
      };
      
      if (DEBUG) console.log("[RightSidebar] Context: transcript-list");
      return contextResult;
    }
    
    // Default for other pages
    const contextResult: DashboardContext = {
      page: 'dashboard',
      placeholder: createPlaceholder(),
    };
    
    if (DEBUG) console.log("[RightSidebar] Context: dashboard");
    return contextResult;
  }, [location.pathname, meetingId, transcriptData, createPlaceholder, currentMeetingName]);

  // State to track the current context
  const [currentContext, setCurrentContext] = useState<CurrentContextType>(getCurrentContext());
  
  // Reference to hold latest context state for callbacks
  const contextRef = useRef(currentContext);
  useEffect(() => {
    contextRef.current = currentContext;
  }, [currentContext]);

  // Force context update whenever transcriptData changes
  useEffect(() => {
    const newContext = getCurrentContext();
    if (DEBUG) console.log(`[RightSidebar] Checking context update, data length: ${transcriptData?.length || 0}`);
    setCurrentContext(newContext);
  }, [transcriptData, getCurrentContext]);
  
  // Update context when location changes
  useEffect(() => {
    const newContext = getCurrentContext();
    const latestContextState = contextRef.current;
    
    // Check for actual changes to avoid unnecessary updates
    const transcriptDataChanged = 
      (newContext.page === 'transcript-detail' && latestContextState.page === 'transcript-detail') &&
      ((newContext as TranscriptDetailContext).transcriptData?.length || 0) !== 
      ((latestContextState as TranscriptDetailContext).transcriptData?.length || 0);
    
    const pageChanged = latestContextState.page !== newContext.page;
    const meetingIdChanged = 
      (newContext.page === 'transcript-detail' && latestContextState.page === 'transcript-detail') &&
      (newContext as TranscriptDetailContext).meetingId !== (latestContextState as TranscriptDetailContext).meetingId;
    
    if (pageChanged || transcriptDataChanged || meetingIdChanged) {
      if (DEBUG) console.log(`[RightSidebar] Context changing: ${latestContextState.page} → ${newContext.page}`);
      setCurrentContext(newContext);
    }
  }, [location.pathname, getCurrentContext]);

  // Update context when meeting name changes
  useEffect(() => {
    if (currentMeetingName && isDetailView) {
      const newContext = getCurrentContext();
      setCurrentContext(newContext);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMeetingName, isDetailView]);

  // Auto-scroll to bottom when messages update or when isProcessing changes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiMessages, isProcessing]);

  const handleSendMessage = () => {
    if (!input.trim()) return;
    
    // Double-check context just before sending
    const contextToSend = getCurrentContext();
    
    if (DEBUG) console.log('[RightSidebar] Sending message with context:', {
      page: contextToSend.page,
      meetingId: contextToSend.page === 'transcript-detail' ? (contextToSend as TranscriptDetailContext).meetingId : undefined,
      hasTranscript: contextToSend.page === 'transcript-detail' && !!(contextToSend as TranscriptDetailContext).transcriptData,
      transcriptLength: contextToSend.page === 'transcript-detail' ? (contextToSend as TranscriptDetailContext).transcriptData?.length || 0 : 0
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
    // Double-check context just before sending
    const contextToSend = getCurrentContext();
    addUserMessage(suggestion, contextToSend);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="py-2 px-4 border-b border-border flex items-center justify-between">
        <span className="text-sm font-medium">Ask Questions</span>
        <Button
          variant="ghost"
          className="text-xs px-2 py-0.5 h-6 bg-white text-black hover:bg-white/90 rounded"
          onClick={handleNewChat}
        >
          New Chat
        </Button>
      </div>
      
      {/* Main chat area */}
      <div className="flex-1 px-4 py-3 overflow-y-auto" ref={scrollAreaRef}>
        <div className="flex flex-col min-h-full space-y-6">
          {aiMessages.length > 0 ? (
            aiMessages.map((message) => (
              <div
                key={message.id}
                className={`group ${
                  message.isUser ? "border-l-2 border-primary" : ""
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
                                    className: 'bg-muted text-sm px-1 py-0.5 rounded inline-block font-mono'
                                  }
                                },
                                pre: {
                                  props: {
                                    className: 'bg-muted text-sm p-2 my-2 rounded overflow-x-auto font-mono'
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
                                    className: 'px-2 py-1 text-sm font-medium text-left bg-muted/50'
                                  }
                                },
                                td: {
                                  props: {
                                    className: 'px-2 py-1 text-sm border-t border-border'
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
                                    className: 'bg-muted text-sm px-1 py-0.5 rounded inline-block font-mono'
                                  }
                                },
                                pre: {
                                  props: {
                                    className: 'bg-muted text-sm p-2 my-2 rounded overflow-x-auto font-mono'
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
                                    className: 'px-2 py-1 text-sm font-medium text-left bg-muted/50'
                                  }
                                },
                                td: {
                                  props: {
                                    className: 'px-2 py-1 text-sm border-t border-border'
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
              {greeting}
            </div>
          )}
          
          {/* Show suggestions if there are no messages or only the welcome message */}
          {aiMessages.length <= 1 && suggestions.length > 0 && (
            <div className="mt-auto pt-6 space-y-2 overflow-hidden">
              {suggestions.slice(0, 3).map((suggestion, index) => (
                <Button
                  key={index}
                  variant="secondary"
                  className="w-full justify-start text-left text-sm h-auto py-3 px-3 whitespace-normal break-words shadow-sm"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          )}
          
          {/* Invisible element to scroll to */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="p-4 border-t border-border">
        <div className="relative">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={createPlaceholder()}
            className="w-full text-sm h-10 pr-10 rounded-lg bg-secondary/50 focus:ring-0 focus:outline-none focus-visible:ring-0 !border-0"
            disabled={isProcessing}
          />
          <Button
            onClick={handleSendMessage}
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-md"
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

export default RightSidebar; 