import React, { useState, useEffect, useRef } from "react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Separator } from "../components/ui/separator";
import {
  Clock,
  Users,
  Search,
  ChevronRight,
  FileText,
  FileSearch,
  Mail,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { currentSpace, speakerColors } from "../data/meetings";
import { Meeting, Message, ActionItem } from "../types";
import { MeetingListView } from "../components/MeetingListView";
import { MessageList } from "../components/MessageList";
import { ActionItems, SpeakerStats } from "../components/MeetingPanels";
import { UserMenu } from "../components/UserMenu";
import { fetchMeetings, joinMeeting, endMeeting, deleteMeeting } from "../apis/meeting";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { formatTimestamp } from "../lib/utils";
import { toggleMessageStar, createActionItem } from "../apis/message";
import { toast } from '../components/ui/toast';
import { useBreadcrumb } from "../lib/BreadcrumbContext";
import { useTranscript } from '../lib/TranscriptContext';

// Define WebSocket message types
interface WebSocketMessage {
  type: 'initial_state' | 'transcript_update' | 'participant_update' | 'meeting_ended' | 'heartbeat' | 'heartbeat_ack' | 'heartbeat_metrics' | 'transcript';
  data?: any;
}

interface TranscriptSegment {
  id: string;
  speaker: string;
  text: string;
  timestamp: string;
  isComplete?: boolean;
}

// Helper function to get first name
const getFirstName = (fullName: string): string => {
  // Check if name is in "Last, First" format
  if (fullName.includes(',')) {
    const parts = fullName.split(',');
    if (parts.length > 1) {
      return parts[1].trim(); // Return the first name part
    }
  }
  
  // Standard format - first part of space-separated name
  return fullName.split(' ')[0];
};

const Transcript = () => {
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [user_name, setUser_name] = useState<string | null>(null);
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isTranscriptLoading, setIsTranscriptLoading] = useState(false);
  const [transcriptLoadStartTime, setTranscriptLoadStartTime] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPrefetching, setIsPrefetching] = useState(false);
  const [prefetchedMeetingId, setPrefetchedMeetingId] = useState<string | null>(null);
  const [prefetchedMessages, setPrefetchedMessages] = useState<Message[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [socket, setSocket] = useState<WebSocket | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [error, setError] = useState("");

  const [messages, setMessages] = useState<Message[]>([]);
  const { 
    setTranscriptData, 
    navigateToMeetingDetail, 
    navigateToMeetingList, 
    selectedMeetingId,
    setMeetingName
  } = useTranscript();

  const [actionItems, setActionItems] = useState<ActionItem[]>([]);

  const [newActionItem, setNewActionItem] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [hoveredDelete, setHoveredDelete] = useState<string | null>(null);
  const [speakerStats, setSpeakerStats] = useState<Record<string, number>>({});
  const processedMessagesRef = useRef<Set<string>>(new Set());
  // Add a ref to track the timeout ID so it can be accessed from multiple places
  const transcriptTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);

  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ id?: string }>();
  const meetingIdFromUrl = params.id;
  const { registerNavigateHandler } = useBreadcrumb();

  // Reference to store the prefetch WebSocket
  const prefetchWebSocketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const fetchMeetingsData = async (isInitialFetch = false) => {
      try {
        // Only set loading state on initial fetch
        if (isInitialFetch) {
          setIsInitialLoading(true);
        } else {
          setIsRefreshing(true);
        }
        
        const username = localStorage.getItem("username");
        setUser_name(username);
        if (!username) {
          navigate("/login", { replace: true });
          return;
        }
        const fetchedMeetings = await fetchMeetings(username);
        
        // Compare with existing meetings to avoid unnecessary re-renders
        if (JSON.stringify(fetchedMeetings) !== JSON.stringify(meetings)) {
          console.log('[Transcript] Updating meetings data (changes detected)');
          setMeetings(fetchedMeetings);
          
          // If we have a selected meeting, update its data if needed
          if (selectedMeeting) {
            const updatedMeeting = fetchedMeetings.find(m => m.id === selectedMeeting.id);
            if (updatedMeeting && JSON.stringify(updatedMeeting) !== JSON.stringify(selectedMeeting)) {
              console.log('[Transcript] Updating selected meeting data');
              setSelectedMeeting(updatedMeeting);
            }
          }
        } else {
          console.log('[Transcript] Skipping update - no changes in meetings data');
        }
        
        // If we have a meetingId in the URL, load that meeting
        if (meetingIdFromUrl && !selectedMeeting) {
          console.log(`[Transcript] URL has meeting ID: ${meetingIdFromUrl}, loading meeting data`);
          const matchingMeeting = fetchedMeetings.find(m => m.id === meetingIdFromUrl);
          if (matchingMeeting) {
            console.log(`[Transcript] Found matching meeting for ID ${meetingIdFromUrl}:`, matchingMeeting.name);
            handleMeetingSelect(matchingMeeting);
          } else {
            console.error(`[Transcript] Meeting with ID ${meetingIdFromUrl} not found`);
            // Redirect to meeting list if meeting not found
            navigateToMeetingList();
          }
        }
      } catch (error) {
        console.error("Error fetching meetings:", error);
        setError("Failed to fetch meetings. Please try again.");
      } finally {
        setIsInitialLoading(false);
        setIsRefreshing(false);
      }
    };

    // Initial fetch - pass true to indicate it's the initial load
    fetchMeetingsData(true);
    
    // Set up polling interval for refreshes - but ONLY when in list view (no selected meeting)
    // This is the opposite of the current logic which only polls when in detail view with an active meeting
    let pollingInterval: NodeJS.Timeout | null = null;
    
    if (!selectedMeeting) {
      console.log('[Transcript] Setting up polling for meeting list view (every 10 seconds)');
      pollingInterval = setInterval(() => fetchMeetingsData(false), 10000);
    }
    
    // Clean up interval on component unmount
    return () => {
      if (pollingInterval) {
        console.log('[Transcript] Clearing polling interval');
        clearInterval(pollingInterval);
      }
    };
  }, [meetingIdFromUrl, navigateToMeetingList, navigate, selectedMeeting?.id]);

  // Prefetch transcript data for the most recent meeting when in list view
  useEffect(() => {
    // Only prefetch when in list view and not already prefetching
    if (selectedMeeting || !meetings || meetings.length === 0 || isPrefetching) {
      console.log('[Transcript] Skipping prefetch because:', 
        selectedMeeting ? 'meeting is selected' : 
        !meetings ? 'no meetings data' : 
        meetings.length === 0 ? 'meetings array is empty' : 
        'already prefetching');
      return;
    }
    
    // Find the most recent meeting by start_time, regardless of active status
    const sortedMeetings = [...meetings].sort((a, b) => {
      // Try to parse dates if they're ISO strings
      try {
        const dateA = a.start_time ? new Date(a.start_time).getTime() : 0;
        const dateB = b.start_time ? new Date(b.start_time).getTime() : 0;
        // Sort in descending order (most recent first)
        return dateB - dateA;
      } catch (e) {
        // If date parsing fails, just return 0 (no change in order)
        return 0;
      }
    });
    
    // Take the most recent meeting
    const mostRecentMeeting = sortedMeetings[0];
    
    if (!mostRecentMeeting) {
      console.log('[Transcript] No meetings available for prefetching');
      return;
    }
    
    // If we've already prefetched this meeting, don't prefetch again
    if (prefetchedMeetingId === mostRecentMeeting.id) {
      console.log(`[Transcript] Already prefetched most recent meeting: ${mostRecentMeeting.name} (${mostRecentMeeting.id})`);
      return;
    }
    
    // Start prefetching the most recent meeting
    console.log(`[Transcript] Starting prefetch for the most recent meeting: ${mostRecentMeeting.name} (${mostRecentMeeting.date || new Date(mostRecentMeeting.start_time || '').toLocaleDateString()})`);
    startPrefetching(mostRecentMeeting);
    
    // Cleanup function for when component unmounts or dependencies change
    return () => {
      // Close any existing prefetch WebSocket
      if (prefetchWebSocketRef.current) {
        console.log('[Transcript] Cleaning up prefetch WebSocket connection');
        prefetchWebSocketRef.current.close();
        prefetchWebSocketRef.current = null;
      }
    };
  }, [meetings, selectedMeeting, isPrefetching, prefetchedMeetingId, user_name]);

  // Function to start prefetching transcript data
  const startPrefetching = (meeting: Meeting) => {
    if (!user_name) {
      console.log('[Transcript] Cannot prefetch: no user name available');
      return;
    }
    
    console.log(`[Transcript] Prefetching transcript data for meeting: ${meeting.name} (ID: ${meeting.id})`);
    setIsPrefetching(true);
    // Only set the prefetched meeting ID after we successfully get data
    // This prevents marking meetings as "prefetched" when they haven't been
    
    // Start a timer to track prefetch duration
    const prefetchStartTime = Date.now();
    
    // If the meeting already has transcript data, use it directly
    if (meeting.transcript && meeting.transcript.length > 0) {
      console.log(`[Transcript] Using existing transcript data for prefetch: ${meeting.transcript.length} messages`);
      
      // Process the transcript data similarly to handleMeetingSelect
      const sanitizedTranscript = meeting.transcript.map(msg => ({
        ...msg,
        call_time: msg.call_time || msg.timestamp || "00:00",
        capture_time: msg.capture_time || undefined
      }));
      
      // Store the prefetched data
      setPrefetchedMessages(sanitizedTranscript);
      // Now it's safe to set the prefetchedMeetingId since we have data
      setPrefetchedMeetingId(meeting.id);
      
      // Calculate the time it took to process the data
      const prefetchTime = Date.now() - prefetchStartTime;
      console.log(`[Transcript] Prefetch completed in ${prefetchTime}ms using existing transcript data for: ${meeting.name}`);
      
      setIsPrefetching(false);
      return;
    }
    
    // Maximum number of retry attempts
    let retryCount = 0;
    const MAX_RETRIES = 2;
    
    // Function to establish WebSocket connection with retry logic
    const connectWithRetry = () => {
      // If we've already retried too many times, give up
      if (retryCount >= MAX_RETRIES) {
        console.log(`[Transcript] Maximum prefetch retry attempts (${MAX_RETRIES}) reached for ${meeting.name}`);
        setIsPrefetching(false);
        return;
      }
      
      // Close any existing prefetch WebSocket
      if (prefetchWebSocketRef.current) {
        prefetchWebSocketRef.current.close();
        prefetchWebSocketRef.current = null;
      }
      
      // Construct WebSocket URL
      const wsUrl = `wss://api.stru.ai/ws/meetings/${meeting.id}/transcript?user=${user_name}`;
      
      try {
        console.log(`[Transcript] Connecting to WebSocket for prefetching (attempt ${retryCount + 1}): ${wsUrl}`);
        const prefetchWs = new WebSocket(wsUrl);
        prefetchWebSocketRef.current = prefetchWs;
        
        // Add a timeout for WebSocket connection
        const connectionTimeout = setTimeout(() => {
          if (prefetchWebSocketRef.current === prefetchWs) {
            console.log(`[Transcript] Prefetch WebSocket connection timeout after 10 seconds for meeting: ${meeting.id}`);
            prefetchWs.close();
            
            // Try to reconnect
            retryCount++;
            setTimeout(connectWithRetry, 1000 * retryCount); // Exponential backoff
          }
        }, 10000);
        
        prefetchWs.onopen = () => {
          // Clear the connection timeout
          clearTimeout(connectionTimeout);
          console.log(`[Transcript] Prefetch WebSocket connected for meeting: ${meeting.name} (ID: ${meeting.id})`);
        };
        
        prefetchWs.onmessage = (event: MessageEvent) => {
          try {
            const message = JSON.parse(event.data) as WebSocketMessage;
            
            if (message.type === "initial_state" && message.data?.transcript?.history) {
              // Calculate the time it took to receive the data
              const prefetchTime = Date.now() - prefetchStartTime;
              console.log(`[Transcript] Received prefetched transcript data in ${prefetchTime}ms: ${message.data.transcript.history.length} messages`);
              
              // Process the transcript data
              const msgs = message.data.transcript.history.map((msg: any) => ({
                id: msg.id || crypto.randomUUID(),
                speaker: msg.speaker,
                content: msg.text,
                call_time: msg.call_time || msg.timestamp || "00:00",
                capture_time: msg.capture_time || undefined,
                timestamp: msg.timestamp || msg.call_time || "00:00",
                isComplete: true,
                isStarred: false,
              }));
              
              // Only store if we have data
              if (msgs.length > 0) {
                // Store the prefetched data
                setPrefetchedMessages(msgs);
                // Only NOW set the prefetchedMeetingId - this is the crucial change
                setPrefetchedMeetingId(meeting.id);
                console.log(`[Transcript] Successfully prefetched ${msgs.length} messages for: ${meeting.name}`);
              } else {
                console.log(`[Transcript] Received empty transcript, not storing prefetched data`);
              }
              
              // We've successfully prefetched, so close the WebSocket
              if (prefetchWebSocketRef.current) {
                prefetchWebSocketRef.current.close();
                prefetchWebSocketRef.current = null;
              }
              setIsPrefetching(false);
            }
          } catch (error) {
            console.error("[Transcript] Error processing prefetch message:", error);
          }
        };
        
        prefetchWs.onerror = (error: Event) => {
          console.error("[Transcript] Prefetch WebSocket error:", error);
          // Clear the connection timeout
          clearTimeout(connectionTimeout);
          
          // Try to reconnect on error unless we've already received data
          if (prefetchedMessages.length === 0) {
            retryCount++;
            console.log(`[Transcript] Will retry prefetch connection for ${meeting.name} (attempt ${retryCount} of ${MAX_RETRIES})`);
            setTimeout(connectWithRetry, 1000 * retryCount); // Exponential backoff
          } else {
            setIsPrefetching(false);
          }
        };
        
        prefetchWs.onclose = (event: CloseEvent) => {
          // Clear the connection timeout
          clearTimeout(connectionTimeout);
          // Log the close reason
          console.log(`[Transcript] Prefetch WebSocket closed for ${meeting.name}: Code ${event.code} ${event.reason}`);
          
          // Check if this is the current WebSocket reference
          if (prefetchWebSocketRef.current === prefetchWs) {
            prefetchWebSocketRef.current = null;
            
            // If we didn't receive any data and the connection closed abnormally, consider retry
            if (prefetchedMessages.length === 0 && event.code !== 1000 && event.code !== 1001) { // Not a normal close
              retryCount++;
              if (retryCount < MAX_RETRIES) {
                console.log(`[Transcript] WebSocket closed abnormally, will retry prefetch for ${meeting.name} (attempt ${retryCount} of ${MAX_RETRIES})`);
                setTimeout(connectWithRetry, 1000 * retryCount); // Exponential backoff
              } else {
                console.log(`[Transcript] Maximum retry attempts reached, giving up on prefetching ${meeting.name}`);
                setIsPrefetching(false);
              }
            } else if (prefetchedMessages.length === 0) {
              // If we still have no data after all retries, or normal close with no data
              console.log(`[Transcript] Prefetch yielded no data for ${meeting.name} - WebSocket closed`);
              setIsPrefetching(false);
            }
          }
        };
      } catch (error) {
        console.error("[Transcript] Error setting up prefetch WebSocket:", error);
        setIsPrefetching(false);
      }
    };
    
    // Start the connection process
    connectWithRetry();
  };

  const handleMeetingSelect = async (meeting: Meeting) => {
    // Set transcript loading to true at the beginning and record start time
    setIsTranscriptLoading(true);
    const startTime = Date.now();
    setTranscriptLoadStartTime(startTime);
    console.log(`[Transcript] Started loading transcript data for ${meeting.name} at ${new Date(startTime).toISOString()}`);
    
    // Clear any existing timeout
    if (transcriptTimeoutRef.current) {
      clearTimeout(transcriptTimeoutRef.current);
      transcriptTimeoutRef.current = null;
    }
    
    // Set a timeout for transcript data loading (15 seconds)
    transcriptTimeoutRef.current = setTimeout(() => {
      // Store the ID to check later if this is the current timeout
      console.log(`[Transcript] Timed out after 15 seconds waiting for transcript data for ${meeting.name}`);
      setIsTranscriptLoading(false);
      setTranscriptLoadStartTime(null);
      transcriptTimeoutRef.current = null;
    }, 15000);

    // If not already on the meeting detail URL, navigate to it first
    if (!meetingIdFromUrl || meetingIdFromUrl !== meeting.id) {
      console.log(`[Transcript] Navigating to meeting detail: /t/${meeting.id} (${meeting.name})`);
      // Set selected meeting first to avoid flash of empty content
      setSelectedMeeting(meeting);
      // Set the meeting name in the context
      setMeetingName(meeting.name);
      navigateToMeetingDetail(meeting.id);
      return; // The navigation will trigger a re-render, which will load the meeting data
    }
    
    // Already on the correct URL, load data immediately
    console.log(`[Transcript] Loading meeting data for: ${meeting.name} (ID: ${meeting.id})`);
    setSelectedMeeting(meeting);
    // Set the meeting name in the context
    setMeetingName(meeting.name);
    
    // Clear processed messages cache for the new meeting
    processedMessagesRef.current.clear();

    // Check if we have prefetched data for this meeting
    const hasPrefetchedData = meeting.id === prefetchedMeetingId && prefetchedMessages.length > 0;
    
    if (hasPrefetchedData) {
      console.log(`[Transcript] Using prefetched transcript data for ${meeting.name}: ${prefetchedMessages.length} messages`);
      
      // Calculate and log the time it took to load the data
      if (transcriptLoadStartTime) {
        const loadTime = Date.now() - transcriptLoadStartTime;
        console.log(`[Transcript] Loaded ${prefetchedMessages.length} messages in ${loadTime}ms from prefetched data for ${meeting.name}`);
      }
      
      // Make a copy to avoid potential issues with state references
      const prefetchedMessagesClone = [...prefetchedMessages];
      
      // Use the prefetched data directly
      setMessages(prefetchedMessagesClone);
      
      // Explicitly set transcript data in context to ensure AI has access to it
      console.log(`[Transcript] Setting ${prefetchedMessagesClone.length} messages in TranscriptContext from prefetched data`);
      setTranscriptData(prefetchedMessagesClone);
      
      // Calculate speaker statistics
      const stats: Record<string, number> = {};
      prefetchedMessagesClone.forEach((msg: Message) => {
        const speaker = msg.speaker;
        stats[speaker] = (stats[speaker] || 0) + 1;
      });
      setSpeakerStats(stats);
      
      // Clear the timeout and set loading to false since we have data
      if (transcriptTimeoutRef.current) {
        console.log(`[Transcript] Clearing timeout as prefetched data is available for ${meeting.name}`);
        clearTimeout(transcriptTimeoutRef.current);
        transcriptTimeoutRef.current = null;
      }
      setIsTranscriptLoading(false);
      setTranscriptLoadStartTime(null);
      
      // Clear prefetched data after using it
      console.log(`[Transcript] Clearing prefetched data after using it for ${meeting.name}`);
      setTimeout(() => {
        setPrefetchedMeetingId(null);
        setPrefetchedMessages([]);
      }, 0);
      
      // Always establish a WebSocket connection to receive status updates and new transcript data
      // This ensures we detect if an inactive meeting becomes active again
      console.log(`[Transcript] Establishing WebSocket connection for ${meeting.name} (active: ${meeting.is_active})`);
      // The WebSocket connection will be established in the useEffect below
    }
    // If the meeting has transcript data, use it directly
    else if (meeting.transcript && meeting.transcript.length > 0) {
      console.log(`[Transcript] No prefetched data available for ${meeting.name}, using transcript data from meeting object: ${meeting.transcript.length} messages`);
      
      // Calculate and log the time it took to load the data
      if (transcriptLoadStartTime) {
        const loadTime = Date.now() - transcriptLoadStartTime;
        console.log(`[Transcript] Loaded ${meeting.transcript.length} messages in ${loadTime}ms from initial data for ${meeting.name}`);
      }
      
      // Log any potentially problematic timestamp formats
      const missingCallTime = meeting.transcript.filter(msg => msg.call_time === undefined).length;
      const missingCaptureTime = meeting.transcript.filter(msg => msg.capture_time === undefined).length;
      if (missingCallTime > 0 || missingCaptureTime > 0) {
        console.warn(`Found ${missingCallTime} messages missing call_time and ${missingCaptureTime} missing capture_time`);
      }
      
      // Sanitize the timestamps in the transcript data
      const sanitizedTranscript = meeting.transcript.map(msg => {
        // For messages with just the timestamp but missing call_time/capture_time,
        // try to extract and map appropriately 
        if (!msg.call_time && msg.timestamp) {
          // If timestamp looks like MM:SS format (call_time)
          if (/^\d{1,2}:\d{2}$/.test(msg.timestamp)) {
            msg.call_time = msg.timestamp;
          }
          // If timestamp looks like ISO format (capture_time)
          else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(msg.timestamp)) {
            msg.capture_time = msg.timestamp;
          }
        }
        
        return {
          ...msg,
          // Ensure timestamp fields are available
          call_time: msg.call_time || msg.timestamp || "00:00",
          capture_time: msg.capture_time || undefined
        };
      });
      
      // Set messages state and transcript context data in sequence
      setMessages(sanitizedTranscript);
      
      // Explicitly set transcript data in context to ensure AI has access to it
      console.log(`[Transcript] Setting ${sanitizedTranscript.length} messages in TranscriptContext for ${meeting.name}`);
      setTranscriptData(sanitizedTranscript);
      
      // Calculate speaker statistics
      const stats: Record<string, number> = {};
      sanitizedTranscript.forEach((msg: Message) => {
        const speaker = msg.speaker;
        stats[speaker] = (stats[speaker] || 0) + 1;
      });
      setSpeakerStats(stats);
      
      // Clear the timeout and set loading to false since we have data
      if (transcriptTimeoutRef.current) {
        console.log(`[Transcript] Clearing timeout as meeting object contains transcript data for ${meeting.name}`);
        clearTimeout(transcriptTimeoutRef.current);
        transcriptTimeoutRef.current = null;
      }
      setIsTranscriptLoading(false);
      setTranscriptLoadStartTime(null);
    } else {
      console.log(`[Transcript] No transcript data in meeting object for ${meeting.name}`);
      // Clear previous messages if no transcript is available
      setMessages([]);
      setTranscriptData(null);
      setSpeakerStats({});
      
      // For inactive meetings, we can immediately show no data
      if (!meeting.is_active) {
        if (transcriptTimeoutRef.current) {
          console.log(`[Transcript] Clearing timeout as ${meeting.name} is inactive and has no transcript`);
          clearTimeout(transcriptTimeoutRef.current);
          transcriptTimeoutRef.current = null;
        }
        setIsTranscriptLoading(false);
      }
      // For active meetings, we'll wait for the timeout or WebSocket data
    }
    
    // Then try to join the meeting
    if (user_name) {
      try {
        const joinResult = await joinMeeting(meeting.id, user_name);
        if (!joinResult.success) {
          console.warn(`Couldn't join meeting ${meeting.name}, but will still display content:`, joinResult.message);
          // We're continuing anyway to display the meeting content
        }
      } catch (error) {
        console.error(`Join meeting error for ${meeting.name}:`, error);
        // Continue to display the meeting even if join fails
      }
    }
  };

  const toggleStar = async (id: string) => {
    // Optimistically update the UI first
    const updatedMessages = messages.map((msg) =>
      msg.id === id ? { ...msg, isStarred: !msg.isStarred } : msg
    );
    
    // Get the current state of the message being toggled
    const currentMessage = messages.find(msg => msg.id === id);
    const newStarredState = currentMessage ? !currentMessage.isStarred : false;
    
    // Update the UI immediately
    setMessages(updatedMessages);
    
    try {
      // Call the API
      const response = await toggleMessageStar(id, newStarredState);
      
      if (!response.success) {
        // If API failed, revert the UI change
        setMessages(messages);
        toast({
          variant: "destructive",
          title: "Failed to update",
          description: response.message || "Failed to update starred status",
        });
      }
    } catch (error) {
      console.error("Error toggling star:", error);
      // Revert UI on error
      setMessages(messages);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update starred status. Please try again.",
      });
    }
  };

  const addToActionItems = async (content: string, messageId: string) => {
    try {
      // Find the message
      const message = messages.find(msg => msg.id === messageId);
      if (!message) return;
      
      // Check if this message is already an action item
      const isAlreadyActionItem = message.isActionItem;
      
      if (isAlreadyActionItem) {
        // If it's already an action item, remove it
        const actionItem = actionItems.find(item => 
          item.content === content && !item.isInferred
        );
        
        if (actionItem) {
          // Remove from UI immediately
          setActionItems((items) => items.filter(item => item.id !== actionItem.id));
          
          // Update message state
          setMessages(msgs => msgs.map(msg => 
            msg.id === messageId ? { ...msg, isActionItem: false } : msg
          ));
          
          // We would call an API here to delete the action item
          // For now, just log it
          console.log(`Removed action item: ${actionItem.id}`);
        }
      } else {
        // Create a temporary ID for optimistic UI updates
        const tempId = crypto.randomUUID();
        
        // Add to UI immediately for better UX
        setActionItems((items) => [
          ...items,
          {
            id: tempId,
            content,
            isInferred: false,
            isEditing: false,
          },
        ]);
        
        // Update message state
        setMessages(msgs => msgs.map(msg => 
          msg.id === messageId ? { ...msg, isActionItem: true } : msg
        ));
        
        // Call the API
        try {
          const response = await createActionItem(content, messageId);
          
          if (response.success && response.actionItem) {
            // Replace the temporary item with the one from the API
            setActionItems((items) => 
              items.map(item => 
                item.id === tempId ? { ...response.actionItem!, id: response.actionItem!.id } : item
              )
            );
          } else {
            // Remove the temporary item if API call failed
            setActionItems((items) => items.filter(item => item.id !== tempId));
            
            // Also revert the message isActionItem status
            setMessages(msgs => msgs.map(msg => 
              msg.id === messageId ? { ...msg, isActionItem: false } : msg
            ));
            
            toast({
              variant: "destructive",
              title: "Failed to create action item",
              description: response.message || "Failed to create action item",
            });
          }
        } catch (error) {
          console.error("Error adding action item:", error);
          
          // Revert UI changes on error
          setActionItems((items) => items.filter(item => item.id !== tempId));
          setMessages(msgs => msgs.map(msg => 
            msg.id === messageId ? { ...msg, isActionItem: false } : msg
          ));
          
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to create action item. Please try again.",
          });
        }
      }
    } catch (error) {
      console.error("Error handling action item:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
      });
    }
  };

  const deleteMessage = (id: string) => {
    setMessages((msgs) => msgs && msgs.filter((msg) => msg.id !== id));
  };

  const handleInviteMember = () => {
    if (newMemberEmail.trim()) {
      // Here you would typically make an API call to invite the member
      setNewMemberEmail("");
    }
  };

  // Function to update meetings list when a meeting is ended
  const handleMeetingsUpdate = (updatedMeetings: Meeting[]) => {
    setMeetings(updatedMeetings);
    // Update selected meeting if it exists in the updated meetings
    if (selectedMeeting) {
      const updatedSelectedMeeting = updatedMeetings.find(m => m.id === selectedMeeting.id);
      if (updatedSelectedMeeting) {
        setSelectedMeeting(updatedSelectedMeeting);
      }
    }
  };

  // Function to end the current meeting with optimistic UI update
  const handleEndMeeting = async () => {
    if (!selectedMeeting || !user_name) return;
    
    // Create a copy of the selected meeting with is_active set to false
    const updatedMeeting = { ...selectedMeeting, is_active: false };
    
    // Update the selected meeting immediately for optimistic UI
    setSelectedMeeting(updatedMeeting);
    
    // If we have the meetings list, update it too
    if (meetings) {
      const optimisticMeetings = meetings.map(m => 
        m.id === selectedMeeting.id ? updatedMeeting : m
      );
      setMeetings(optimisticMeetings);
    }
    
    // Make the actual API call
    try {
      await endMeeting(selectedMeeting.id, user_name);
      
      // If successful, fetch the latest data in the background
      fetchMeetings(user_name)
        .then(refreshedMeetings => {
          setMeetings(refreshedMeetings);
          // Keep the updated selected meeting in sync
          const latestMeeting = refreshedMeetings.find(m => m.id === selectedMeeting.id);
          if (latestMeeting) {
            setSelectedMeeting(latestMeeting);
          }
        })
        .catch(error => console.error("Background refresh failed:", error));
    } catch (error) {
      console.error("Failed to end meeting:", error);
      
      // If the API call fails, revert to original state
      setSelectedMeeting(selectedMeeting);
      
      // If we have the meetings list, revert it too
      if (meetings) {
        setMeetings([...meetings]);
      }
      
      // Show error to user
      alert("Failed to end meeting. Please try again.");
    }
  };

  // Function to delete the current meeting and go back to list view with optimistic UI
  const handleDeleteMeeting = async () => {
    if (!selectedMeeting || !user_name) return;
    
    // Store the current meeting and list for potential reversion
    const currentMeeting = selectedMeeting;
    const currentMeetings = meetings;
    
    // Immediately go back to meeting list view
    setSelectedMeeting(null);
    
    // Update meetings list optimistically
    if (meetings) {
      const optimisticMeetings = meetings.filter(m => m.id !== currentMeeting.id);
      setMeetings(optimisticMeetings);
    }
    
    // Make the actual API call
    try {
      await deleteMeeting(currentMeeting.id, user_name);
      
      // If successful, nothing more to do - UI is already updated
    } catch (error) {
      console.error("Failed to delete meeting:", error);
      
      // If the API call fails, revert the deleted meeting
      if (currentMeetings) {
        setMeetings(currentMeetings);
      }
      
      // Show error to user
      alert("Failed to delete meeting. Please try again.");
    }
  };

  // Update the navigation back to the meeting list
  const handleBackToMeetingList = () => {
    // Navigate to the meeting list view
    console.log("[Transcript] Navigating back to meeting list");
    navigateToMeetingList();
    
    // Clear the selected meeting
    setSelectedMeeting(null);
    setMessages([]);
    setTranscriptData(null);
  };

  // Register the navigation handler with the context
  useEffect(() => {
    console.log("Registering navigation handler in Transcript component");
    registerNavigateHandler(handleBackToMeetingList);
    return () => {
      // Clear the handler when component unmounts
      console.log("Clearing navigation handler");
    };
  }, [registerNavigateHandler]);

  // Listen for changes to the URL that might affect the selected meeting
  useEffect(() => {
    const checkUrlForStateChange = () => {
      // Get the current path
      const currentPath = window.location.pathname;
      console.log(`[Transcript] URL check, current path: ${currentPath}`);
      
      // Check if we're now on the root path (meeting list view)
      if (currentPath === '/' && selectedMeeting) {
        console.log('[Transcript] At root path - clearing selected meeting');
        setSelectedMeeting(null);
        setMessages([]);
        setTranscriptData(null);
        setSpeakerStats({});
      }
      
      // If we're on a detail page but don't have the right meeting selected
      if (currentPath.startsWith('/t/')) {
        const idFromPath = currentPath.split('/')[2];
        if (idFromPath && (!selectedMeeting || selectedMeeting.id !== idFromPath)) {
          console.log(`[Transcript] URL changed to meeting ${idFromPath}, but selected meeting doesn't match`);
          // If meetings are loaded, try to select the matching one
          if (meetings) {
            const matchingMeeting = meetings.find(m => m.id === idFromPath);
            if (matchingMeeting) {
              console.log(`[Transcript] Found matching meeting for ID ${idFromPath}, selecting it`);
              handleMeetingSelect(matchingMeeting);
            }
          }
        }
      }
    };

    // Check URL on component mount and location changes
    checkUrlForStateChange();

    // Also listen for popstate events (browser back/forward)
    const handlePopState = () => {
      console.log(`[Transcript] Popstate detected`);
      checkUrlForStateChange();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [selectedMeeting, meetings, handleMeetingSelect, setTranscriptData, location.pathname]);

  useEffect(() => {
    if (!selectedMeeting || !user_name) return;

    // Construct WebSocket URL
    const wsUrl = `wss://api.stru.ai/ws/meetings/${selectedMeeting.id}/transcript?user=${user_name}`;
    let ws: WebSocket;
    let reconnectInterval: NodeJS.Timeout | null = null;
    let heartbeatInterval: NodeJS.Timeout | null = null;
    let missedHeartbeats = 0;
    let reconnectCount = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;
    const MAX_MISSED_HEARTBEATS = 3;
    const HEARTBEAT_INTERVAL = 20000; // 20 seconds instead of 30

    const initializeWebSocket = () => {
      if (ws) {
        ws.close();
        if (reconnectInterval) clearInterval(reconnectInterval);
        if (heartbeatInterval) clearInterval(heartbeatInterval);
      }
      
      console.log(`Connecting to WebSocket: ${wsUrl}`);
      ws = new WebSocket(wsUrl);
      missedHeartbeats = 0; // Reset counter on new connection

      ws.onopen = () => {
        console.log("Connected to WebSocket server");
        setSocket(ws);
        setError(""); // Clear any previous errors
        if (reconnectInterval) clearInterval(reconnectInterval);
        
        // Start heartbeat
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        heartbeatInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            // Send heartbeat message
            console.log("Sending heartbeat to server");
            ws.send(JSON.stringify({ type: "heartbeat" }));
            missedHeartbeats++;
            
            if (missedHeartbeats > MAX_MISSED_HEARTBEATS) {
              console.log(`Too many missed heartbeats (${missedHeartbeats}), reconnecting...`);
              ws.close();
            }
          }
        }, HEARTBEAT_INTERVAL);
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          console.log("WebSocket message received:", event.data.substring(0, 100) + (event.data.length > 100 ? '...' : ''));
          const message = JSON.parse(event.data) as WebSocketMessage;

          switch (message.type) {
            case "initial_state":
              console.log("Received initial state");
              
              // Important: Clear loading state and timeout immediately when we receive data
              setIsTranscriptLoading(false);
              if (transcriptLoadStartTime) {
                const loadTime = Date.now() - transcriptLoadStartTime;
                console.log(`[Transcript] Cancelling loading timeout as data was received in ${loadTime}ms for ${selectedMeeting.name}`);
                setTranscriptLoadStartTime(null);
              }
              
              // Clear the timeout using the ref
              if (transcriptTimeoutRef.current) {
                console.log(`[Transcript] Clearing timeout from WebSocket handler for ${selectedMeeting.name}`);
                clearTimeout(transcriptTimeoutRef.current);
                transcriptTimeoutRef.current = null;
              }
              
              if (message.data?.transcript?.history) {
                console.log("Initial state transcript history sample:", 
                  message.data.transcript.history.slice(0, 3).map((h: any) => ({
                    id: h.id,
                    speaker: h.speaker,
                    text: h.text?.substring(0, 30),
                    call_time: h.call_time,
                    capture_time: h.capture_time,
                    timestamp: h.timestamp
                  }))
                );
                
                // Calculate time taken to load data via WebSocket if we're tracking load time
                if (transcriptLoadStartTime) {
                  const loadTime = Date.now() - transcriptLoadStartTime;
                  console.log(`[Transcript] Received ${message.data.transcript.history.length} messages via WebSocket in ${loadTime}ms`);
                }
                
                // Check for missing time fields in the data
                const missingCallTime = message.data.transcript.history.filter((m: any) => m.call_time === undefined).length;
                const missingCaptureTime = message.data.transcript.history.filter((m: any) => m.capture_time === undefined).length;
                if (missingCallTime > 0 || missingCaptureTime > 0) {
                  console.warn(`Found ${missingCallTime} messages missing call_time and ${missingCaptureTime} missing capture_time in WebSocket data`);
                }
                
                const msgs = message.data.transcript.history.map((msg: any) => {
                  // Log any unusual timestamp formats for debugging
                  if (!msg.call_time && !msg.capture_time) {
                    console.warn(`Message missing both time fields: ${msg.speaker} - "${msg.text?.substring(0, 30)}..."`);
                  }
                  
                  return {
                    id: msg.id || crypto.randomUUID(),
                    speaker: msg.speaker,
                    content: msg.text,
                    call_time: msg.call_time,
                    capture_time: msg.capture_time,
                    timestamp: msg.timestamp || msg.call_time || "00:00", // Keep for backward compatibility
                    isComplete: true,
                    isStarred: false,
                  };
                });
                
                if (msgs.length > 0) {
                  // Important: Update both local state and context
                  setMessages(msgs);
                  console.log(`Processed ${msgs.length} historical messages from WebSocket`);
                  
                  // CRITICAL: Set transcript data in context to ensure AI has access
                  console.log(`[Transcript] Setting ${msgs.length} messages in TranscriptContext from WebSocket`);
                  setTranscriptData(msgs);
                  
                  // Calculate speaker statistics
                  const stats: Record<string, number> = {};
                  msgs.forEach((msg: Message) => {
                    const speaker = msg.speaker;
                    stats[speaker] = (stats[speaker] || 0) + 1;
                  });
                  setSpeakerStats(stats);
                  
                  // Since we received data, stop showing loading state
                  setIsTranscriptLoading(false);
                  setTranscriptLoadStartTime(null);
                } else {
                  console.warn("Initial state has no transcript history");
                }
              } else {
                console.warn("Initial state has no transcript history");
              }
              break;
              
            case "transcript":
              console.log("Received transcript message");
              if (message.data) {
                const segment = message.data;
                const isFinal = true; // Assume it's a final message unless specified otherwise
                
                // Skip invalid or duplicate messages
                if (!isMessageValid(segment)) {
                  console.log("Skipping invalid or duplicate transcript message:", segment.id);
                  break;
                }
                
                // Log data for debugging
                console.log("Transcript message data:", {
                  id: segment.id,
                  speaker: segment.speaker,
                  text: segment.text?.substring(0, 30),
                });
                
                const newMsg: Message = {
                  id: segment.id || crypto.randomUUID(),
                  speaker: segment.speaker,
                  content: segment.text,
                  call_time: segment.call_time || new Date().toISOString().substring(11, 16), // Extract HH:MM if not provided
                  capture_time: segment.timestamp || new Date().toISOString(),
                  timestamp: segment.timestamp || new Date().toISOString(),
                  isComplete: isFinal,
                  isStarred: false,
                };
                
                setMessages((prevMessages) => {
                  // Remove any existing message with the same ID
                  const withoutDuplicate = prevMessages.filter(msg => msg.id !== newMsg.id);
                  // Add the new message
                  return [...withoutDuplicate, newMsg];
                });
                
                // Update speaker stats
                setSpeakerStats(prevStats => {
                  const newStats = {...prevStats};
                  const speaker = segment.speaker;
                  newStats[speaker] = (newStats[speaker] || 0) + 1;
                  return newStats;
                });
                
                // Since we received data, stop showing loading state
                setIsTranscriptLoading(false);
                if (transcriptLoadStartTime) {
                  const loadTime = Date.now() - transcriptLoadStartTime;
                  console.log(`[Transcript] Received first live transcript message in ${loadTime}ms`);
                  setTranscriptLoadStartTime(null);
                }
              }
              break;
              
            case "transcript_update":
              console.log("Received transcript update");
              if (message.data?.segment) {
                const segment = message.data.segment;
                const isFinal = message.data.is_final;
                
                // Skip invalid or duplicate messages
                if (!isMessageValid(segment)) {
                  console.log("Skipping invalid or duplicate transcript_update message:", segment.id);
                  break;
                }
                
                // Log timestamp for debugging
                console.log("Transcript update segment:", {
                  id: segment.id,
                  speaker: segment.speaker,
                  text: segment.text?.substring(0, 30),
                  call_time: segment.call_time,
                  capture_time: segment.capture_time,
                  timestamp: segment.timestamp
                });
                
                const newMsg: Message = {
                  id: segment.id || crypto.randomUUID(),
                  speaker: segment.speaker,
                  content: segment.text,
                  call_time: segment.call_time,
                  capture_time: segment.capture_time,
                  timestamp: segment.timestamp || segment.call_time || "00:00", // Keep for backward compatibility
                  isComplete: isFinal,
                  isStarred: false,
                };
                
                setMessages((prevMessages) => {
                  // Check for incomplete message from the same speaker that should be updated
                  const hasIncompleteSameSpeaker = 
                    prevMessages.length > 0 &&
                    !prevMessages[prevMessages.length - 1].isComplete &&
                    prevMessages[prevMessages.length - 1].speaker === segment.speaker;
                  
                  if (hasIncompleteSameSpeaker) {
                    // Update the incomplete message
                    return [
                      ...prevMessages.slice(0, -1), // Keep previous messages except last one
                      newMsg,
                    ];
                  } else {
                    // Otherwise, remove any duplicate with same ID and add the new message
                    const withoutDuplicate = prevMessages.filter(msg => msg.id !== newMsg.id);
                    return [...withoutDuplicate, newMsg];
                  }
                });
                
                // Update speaker stats for this message
                if (isFinal) {
                  setSpeakerStats(prevStats => {
                    const newStats = {...prevStats};
                    const speaker = segment.speaker;
                    newStats[speaker] = (newStats[speaker] || 0) + 1;
                    return newStats;
                  });
                }
                
                // Since we received data, stop showing loading state
                setIsTranscriptLoading(false);
                if (transcriptLoadStartTime) {
                  const loadTime = Date.now() - transcriptLoadStartTime;
                  console.log(`[Transcript] Received first transcript update in ${loadTime}ms`);
                  setTranscriptLoadStartTime(null);
                }
              }
              break;
              
            case "participant_update":
              console.log("Received participant update:", message.data?.participants);
              // You could update a participants state here if needed
              break;
              
            case "meeting_ended":
              console.log("Meeting has ended");
              // Update the selected meeting to show as inactive
              const endTimeFormatted = new Date().toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit'
              });
              const endTimeISO = new Date().toISOString();
              
              // Update the selected meeting with is_active explicitly set to false
              setSelectedMeeting(prev => {
                if (!prev) return null;
                console.log("Setting selected meeting to inactive");
                // Use a consistently formatted end_time and explicitly set is_active to false
                return {...prev, is_active: false, end_time: endTimeISO};
              });
              
              // Update the meeting in the meetings list if it exists
              if (meetings) {
                setMeetings(prev => {
                  if (!prev) return [];
                  console.log("Updating meetings list to set meeting inactive");
                  return prev.map(m => 
                    m.id === selectedMeeting?.id 
                      ? {...m, is_active: false, end_time: endTimeISO}
                      : m
                  );
                });
              }
              
              // Show toast notification to user
              toast({
                title: "Meeting Ended",
                description: `This meeting has ended automatically at ${endTimeFormatted}.`,
                variant: "default"
              });
              
              break;
              
            case "heartbeat":
              // Respond to server heartbeat immediately
              console.log("Received server heartbeat, sending acknowledgment");
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "heartbeat_ack" }));
              }
              break;
              
            case "heartbeat_ack":
              // Reset the counter when we get a heartbeat acknowledgment
              console.log("Received heartbeat acknowledgment from server");
              missedHeartbeats = 0;
              break;
            
            case "heartbeat_metrics":
              // Process connection quality metrics
              console.log(`Connection metrics - Latency: ${message.data?.latency}ms, Quality: ${message.data?.quality}`);
              // Reset missed heartbeats counter on any heartbeat-related message
              missedHeartbeats = 0;
              break;
              
            default:
              console.warn(`Unknown message type: ${message.type}`);
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error, event.data);
          setError("Error parsing incoming data");
        }
      };

      ws.onerror = (event: Event) => {
        console.error("WebSocket error:", event);
        setError("WebSocket error occurred - Please try refreshing the page");
      };

      ws.onclose = (event: CloseEvent) => {
        console.log("WebSocket connection closed:", event.code, event.reason);
        setSocket(null);
        
        // Clear heartbeat interval
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
        
        // Only attempt to reconnect if the meeting is still active
        if (selectedMeeting?.is_active === true) {
          if (reconnectCount < MAX_RECONNECT_ATTEMPTS) {
            console.log(`Reconnecting (attempt ${reconnectCount + 1} of ${MAX_RECONNECT_ATTEMPTS})...`);
            const delay = Math.min(1000 * Math.pow(2, reconnectCount), 30000);
            
            setTimeout(() => {
              reconnectCount++;
              initializeWebSocket();
            }, delay);
          } else {
            console.log("Maximum reconnection attempts reached");
            setError("Failed to connect after multiple attempts. Please refresh the page.");
          }
        } else {
          console.log("Not reconnecting because meeting is no longer active");
        }
      };
    };

    initializeWebSocket();

    // Cleanup function to close WebSocket and stop intervals
    return () => {
      if (ws) ws.close();
      if (reconnectInterval) clearInterval(reconnectInterval);
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    };
  }, [selectedMeeting, user_name, transcriptLoadStartTime]);

  // Add search functionality
  useEffect(() => {
    if (!searchQuery || searchQuery.trim() === "") {
      setSearchResults([]);
      setCurrentSearchIndex(0);
      return;
    }
    
    // Find all messages that match the search query
    const results = messages.reduce<number[]>((matches, message, index) => {
      if (message.content && message.content.toLowerCase().includes(searchQuery.toLowerCase())) {
        matches.push(index);
      }
      return matches;
    }, []);
    
    setSearchResults(results);
    setCurrentSearchIndex(results.length > 0 ? 0 : -1);
  }, [searchQuery, messages]);
  
  // Handle navigation between search results
  const goToNextSearchResult = () => {
    if (searchResults.length === 0) return;
    setCurrentSearchIndex((prevIndex) => 
      prevIndex + 1 >= searchResults.length ? 0 : prevIndex + 1
    );
  };
  
  const goToPreviousSearchResult = () => {
    if (searchResults.length === 0) return;
    setCurrentSearchIndex((prevIndex) => 
      prevIndex - 1 < 0 ? searchResults.length - 1 : prevIndex - 1
    );
  };

  // Add a handler to clear search
  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setCurrentSearchIndex(0);
  };

  // Validate and deduplicate messages
  const isMessageValid = (segment: any) => {
    if (!segment?.id || !segment?.speaker) return false;
    
    // Allow empty/partial messages for streaming updates
    if (segment.text && segment.text.trim() === '') {
      return true;
    }
    
    // Create unique key for this version of the message
    const messageKey = `${segment.id}-${segment.text ? segment.text.length : 0}-${segment.speaker}`;
    
    // If this exact message was already processed, skip it
    if (processedMessagesRef.current.has(messageKey)) {
      return false;
    }
    
    // Add to processed messages
    processedMessagesRef.current.add(messageKey);
    
    // Cleanup old messages if needed
    if (processedMessagesRef.current.size > 1000) {
      const oldestMessages = Array.from(processedMessagesRef.current).slice(0, 500);
      oldestMessages.forEach(key => processedMessagesRef.current.delete(key));
    }
    
    return true;
  };

  // Add key handler for Escape key to clear search
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      clearSearch();
    }
  };

  return (
    <div className={selectedMeeting ? "h-full flex flex-col overflow-hidden" : "min-h-screen"}>
      <div className={selectedMeeting ? "flex-1 overflow-hidden" : ""}>
        {selectedMeeting ? (
          <div className="container mx-auto px-4 py-8 h-full flex flex-col overflow-hidden">
            <div className="grid gap-8 h-full overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full overflow-hidden">
                <div className="lg:col-span-8 flex flex-col overflow-hidden">
                  <div className="min-w-0 flex flex-col overflow-hidden">
                    <>
                      <div className="relative">
                        {selectedMeeting?.is_active === true ? (
                          <div className="absolute top-6 right-6 flex items-center space-x-2 z-10">
                            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 px-2 text-xs text-red-400 hover:bg-red-100 hover:text-red-600"
                              onClick={handleEndMeeting}
                            >
                              End
                            </Button>
                          </div>
                        ) : null}
                        <Card className="overflow-hidden">
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle>{selectedMeeting.name}</CardTitle>
                                <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-2">
                                  <div className="flex items-center">
                                    <Clock className="mr-2 h-4 w-4" />
                                    <span>
                                      {selectedMeeting.date} |{" "}
                                      {(() => {
                                        // Format the start and end times consistently
                                        const formatTimeDisplay = (timeStr: string | null | undefined) => {
                                          // If it's not set yet
                                          if (!timeStr) return "—";
                                          
                                          // If it's already in a user-friendly format (like "10:00 AM")
                                          if (/^\d{1,2}:\d{2}(?:\s?[AP]M)?$/i.test(timeStr)) {
                                            return timeStr;
                                          }
                                          
                                          // If it's an ISO timestamp, format it using the browser's locale
                                          try {
                                            const date = new Date(timeStr);
                                            return date.toLocaleTimeString([], { 
                                              month: 'short',
                                              day: 'numeric',
                                              hour: '2-digit', 
                                              minute: '2-digit'
                                            });
                                          } catch (e) {
                                            // Fallback if parsing fails
                                            return timeStr;
                                          }
                                        };
                                        
                                        // Check if we have both start and end times as dates
                                        if (selectedMeeting.start_time && selectedMeeting.end_time) {
                                          try {
                                            // Try to parse both as dates
                                            const startDate = new Date(selectedMeeting.start_time);
                                            const endDate = new Date(selectedMeeting.end_time);
                                            
                                            // If both are valid dates
                                            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                                              // Check if they're on the same day
                                              const sameDay = 
                                                startDate.getDate() === endDate.getDate() && 
                                                startDate.getMonth() === endDate.getMonth() &&
                                                startDate.getFullYear() === endDate.getFullYear();
                                                
                                              if (sameDay) {
                                                // Format date once with both times
                                                const dateStr = startDate.toLocaleDateString([], {
                                                  month: 'short',
                                                  day: 'numeric',
                                                  year: 'numeric'
                                                });
                                                
                                                const startTime = startDate.toLocaleTimeString([], {
                                                  hour: '2-digit',
                                                  minute: '2-digit'
                                                });
                                                
                                                const endTime = endDate.toLocaleTimeString([], {
                                                  hour: '2-digit',
                                                  minute: '2-digit'
                                                });
                                                
                                                return `${dateStr} | ${startTime} - ${endTime}`;
                                              }
                                            }
                                          } catch (e) {
                                            // If parsing fails, fall back to original format
                                            console.log("Error parsing dates:", e);
                                          }
                                        }
                                        
                                        // If we get here, either the dates are different days or parsing failed
                                        // Fall back to original format
                                        return `${formatTimeDisplay(selectedMeeting.start_time)} - ${formatTimeDisplay(selectedMeeting.end_time)}`;
                                      })()}
                                    </span>
                                  </div>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="flex items-center"
                                      >
                                        <Users className="mr-2 h-4 w-4" />
                                        <span>
                                          {selectedMeeting.participants.length}{" "}
                                          Participants
                                        </span>
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-64 bg-card border-border">
                                      <div className="space-y-2">
                                        {selectedMeeting.participants.map(
                                          (member) => (
                                            <div
                                              key={member}
                                              className="flex items-center space-x-2"
                                            >
                                              <Avatar
                                                className={
                                                  speakerColors[member]
                                                }
                                              >
                                                <AvatarFallback>
                                                  {getFirstName(member)[0]}
                                                </AvatarFallback>
                                              </Avatar>
                                              <span>{member}</span>
                                            </div>
                                          )
                                        )}
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                  <span className="text-sm text-muted-foreground">
                                    Work Intelligently with AI
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex space-x-2 mt-4">
                              <Button 
                                variant="secondary" 
                                size="sm"
                                onClick={() => {
                                  toast({
                                    title: "Beta Feature",
                                    description: "This is a beta feature coming in the upcoming release",
                                    variant: "info",
                                    hideClose: true,
                                  });
                                }}
                              >
                                <FileText className="mr-2 h-4 w-4" />
                                Generate Minutes
                              </Button>
                              <Button 
                                variant="secondary" 
                                size="sm"
                                onClick={() => {
                                  toast({
                                    title: "Beta Feature",
                                    description: "This is a beta feature coming in the upcoming release",
                                    variant: "info",
                                    hideClose: true,
                                  });
                                }}
                              >
                                <FileSearch className="mr-2 h-4 w-4" />
                                Detailed Summary
                              </Button>
                            </div>
                          </CardHeader>
                        </Card>
                      </div>

                      <div className="mb-4"></div>

                      <Card className="flex-1 flex flex-col overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between flex-shrink-0">
                          <CardTitle>Transcript</CardTitle>
                          <div className="w-64">
                            <div className="relative flex items-center">
                              {searchQuery ? (
                                <X 
                                  className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground" 
                                  onClick={clearSearch}
                                />
                              ) : (
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              )}
                              <Input 
                                placeholder="Search..." 
                                className="pl-8 focus:ring-0 focus:outline-none focus:border-transparent" 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                              />
                              {searchQuery && (
                                <div className="absolute right-2 flex items-center space-x-1">
                                  <span className="text-xs text-muted-foreground">
                                    {searchResults.length > 0 
                                      ? `${currentSearchIndex + 1}/${searchResults.length}` 
                                      : "0/0"}
                                  </span>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 focus:ring-0 focus:ring-offset-0 no-focus-outline"
                                    disabled={searchResults.length === 0}
                                    onClick={goToPreviousSearchResult}
                                    tabIndex={-1}
                                  >
                                    <ChevronUp className="h-3 w-3" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 focus:ring-0 focus:ring-offset-0 no-focus-outline"
                                    disabled={searchResults.length === 0}
                                    onClick={goToNextSearchResult}
                                    tabIndex={-1}
                                  >
                                    <ChevronDown className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden p-0">
                          <div className="h-full p-4 overflow-y-auto hide-scrollbar">
                            {messages.length > 0 ? (
                              <MessageList
                                messages={messages || []}
                                hoveredDelete={hoveredDelete}
                                onStar={toggleStar}
                                onAddToActionItems={addToActionItems}
                                onDelete={deleteMessage}
                                onHoverDelete={setHoveredDelete}
                                searchQuery={searchQuery}
                                searchResults={searchResults}
                                currentSearchIndex={currentSearchIndex}
                                isLive={selectedMeeting?.is_active === true}
                              />
                            ) : isTranscriptLoading ? (
                              <div className="space-y-2">
                                {/* Display multiple skeleton loaders while loading */}
                                {Array.from({ length: 8 }).map((_, i) => (
                                  <div key={i} className="group flex items-start space-x-3 py-2 px-3 rounded-md transition-colors animate-pulse">
                                    {/* Avatar skeleton */}
                                    <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700 relative overflow-hidden">
                                      <div className="shimmer-effect"></div>
                                    </div>
                                    <div className="flex-1 min-w-0 relative overflow-hidden">
                                      {/* Header skeleton */}
                                      <div className="flex items-center space-x-2">
                                        {/* Speaker name skeleton */}
                                        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded relative overflow-hidden">
                                          <div className="shimmer-effect"></div>
                                        </div>
                                        {/* Timestamp skeleton */}
                                        <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded relative overflow-hidden">
                                          <div className="shimmer-effect"></div>
                                        </div>
                                      </div>
                                      {/* Content skeleton lines */}
                                      <div className="mt-2 space-y-2 relative overflow-hidden">
                                        <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded relative overflow-hidden">
                                          <div className="shimmer-effect"></div>
                                        </div>
                                        <div className="h-3 w-4/5 bg-gray-200 dark:bg-gray-700 rounded relative overflow-hidden">
                                          <div className="shimmer-effect"></div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : selectedMeeting ? (
                              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-medium mb-2">No transcript available</h3>
                                <p className="text-muted-foreground text-sm max-w-md">
                                  {selectedMeeting.is_active 
                                    ? "Transcript will appear here once the meeting starts recording."
                                    : "No transcript was recorded for this meeting."}
                                </p>
                              </div>
                            ) : null}
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  </div>
                </div>
                <div className="lg:col-span-4 overflow-hidden flex flex-col">
                  <div className="space-y-4 h-full flex flex-col overflow-hidden">
                    {messages.length > 0 ? (
                      <>
                        <SpeakerStats stats={speakerStats} messages={messages} />
                        <ActionItems
                          items={actionItems}
                          newItem={newActionItem}
                          onNewItemChange={setNewActionItem}
                          onAddItem={() => {
                            if (newActionItem.trim()) {
                              setActionItems([
                                ...actionItems,
                                {
                                  id: crypto.randomUUID(),
                                  content: newActionItem,
                                  isInferred: false,
                                  isEditing: false,
                                },
                              ]);
                              setNewActionItem("");
                            }
                          }}
                          onDeleteItem={(id: string) => {
                            setActionItems((items) =>
                              items.filter((item) => item.id !== id)
                            );
                          }}
                          onEditItem={(id: string, content: string) => {
                            setActionItems((items) =>
                              items.map((item) =>
                                item.id === id
                                  ? { ...item, content, isEditing: false }
                                  : item
                              )
                            );
                          }}
                          onSetEditing={setActionItems}
                        />
                      </>
                    ) : isTranscriptLoading ? (
                      <>
                        {/* Speaker Stats Skeleton */}
                        <div className="bg-background rounded-lg border p-4 animate-pulse">
                          <div className="mb-4 flex items-center justify-between">
                            <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded relative overflow-hidden">
                              <div className="shimmer-effect"></div>
                            </div>
                          </div>
                          <div className="space-y-3">
                            {Array.from({ length: 3 }).map((_, i) => (
                              <div key={i} className="flex items-center space-x-2">
                                <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700 relative overflow-hidden">
                                  <div className="shimmer-effect"></div>
                                </div>
                                <div className="flex-1">
                                  <div className="h-4 w-24 mb-1 bg-gray-200 dark:bg-gray-700 rounded relative overflow-hidden">
                                    <div className="shimmer-effect"></div>
                                  </div>
                                  <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                                    <div className={`h-full ${i === 0 ? 'w-2/3' : i === 1 ? 'w-1/2' : 'w-1/4'} bg-gray-200 dark:bg-gray-700 relative overflow-hidden`}>
                                      <div className="shimmer-effect"></div>
                                    </div>
                                  </div>
                                </div>
                                <div className="h-4 w-8 bg-gray-200 dark:bg-gray-700 rounded relative overflow-hidden">
                                  <div className="shimmer-effect"></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* Action Items Skeleton */}
                        <div className="bg-background rounded-lg border overflow-hidden flex-1 flex flex-col animate-pulse">
                          <div className="p-4 border-b">
                            <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded relative overflow-hidden">
                              <div className="shimmer-effect"></div>
                            </div>
                          </div>
                          <div className="p-4 space-y-3 flex-1">
                            {Array.from({ length: 3 }).map((_, i) => (
                              <div key={i} className="flex items-start space-x-2">
                                <div className="h-4 w-4 mt-1 rounded bg-gray-200 dark:bg-gray-700 relative overflow-hidden">
                                  <div className="shimmer-effect"></div>
                                </div>
                                <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded relative overflow-hidden">
                                  <div className="shimmer-effect"></div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="p-4 mt-auto border-t">
                            <div className="h-9 w-full bg-gray-200 dark:bg-gray-700 rounded relative overflow-hidden">
                              <div className="shimmer-effect"></div>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : selectedMeeting ? (
                      <>
                        <SpeakerStats stats={{}} messages={[]} />
                        <ActionItems
                          items={[]}
                          newItem={newActionItem}
                          onNewItemChange={setNewActionItem}
                          onAddItem={() => {}}
                          onDeleteItem={(id: string) => {}}
                          onEditItem={(id: string, content: string) => {}}
                          onSetEditing={() => {}}
                        />
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="container mx-auto px-4 py-8">
            <div className="grid gap-8">
              <div className="min-w-0">
                <MeetingListView
                  meetings={meetings || []}
                  onMeetingSelect={handleMeetingSelect}
                  onMeetingUpdate={handleMeetingsUpdate}
                  isLoading={isInitialLoading}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Add this style block at the end of the file, just before export default
const style = document.createElement('style');
style.textContent = `
  .hide-scrollbar {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }
  .hide-scrollbar::-webkit-scrollbar {
    display: none;  /* Chrome, Safari and Opera */
  }
`;
document.head.appendChild(style);

export default Transcript;
