import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import {
  Users,
  Search,
  FileText,
  X,
  ChevronDown,
  ChevronUp,
  Link,
  Pencil,
  Copy,
  BarChart2,
  Send,
  MessageCircleMore,
} from "lucide-react";
import { getSpeakerColor } from "../data/meetings";
import { Meeting, TranscriptBlock } from "../types";
import { MeetingListView } from "../components/MeetingListView";
import { MessageList } from "../components/MessageList";
// ActionItems and SpeakerStats removed - speaker stats now inline in header
import { listMeetings, getMeetingWithTranscript, archiveMeeting, updateMeeting, generateShareLink, getSharedMeeting, shareMeetingWithEmail } from "../apis/meetings";
import { getAuthToken } from "../lib/graphql/client";
import { useNavigate, useLocation, useParams, useMatch } from "react-router-dom";
import { toast } from '../components/ui/toast';
import { useBreadcrumb } from "../lib/BreadcrumbContext";
import { useTranscript } from '../lib/TranscriptContext';
import { getEnv } from "../lib/useEnv";
import { Skeleton } from "../components/ui/skeleton";
import { processTranscriptToSegments, ProcessedTranscript } from "../lib/speakerStats";

// Skeleton component for Transcript View (shown when loading /t/:id)
const TranscriptViewSkeleton = () => (
  <div className="flex flex-col gap-3 pb-4">
    {/* Meeting Header Skeleton */}
    <div className="flex-shrink-0">
      <Card className="overflow-hidden h-full">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-6 rounded" />
                <Skeleton className="h-8 w-64" />
              </div>
              <div className="flex items-center space-x-4 mt-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
          {/* Speaker Breakdown Skeleton - 2 speakers */}
          <div className="mt-6 space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-8" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-8" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>

    {/* Transcript Card Skeleton */}
    <div className="h-[calc(100vh-350px)] min-h-[400px]">
      <Card className="h-full flex flex-col overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between flex-shrink-0 py-3 px-6">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-10 w-64 rounded-lg" />
        </CardHeader>
        <div className="flex-1 overflow-hidden pb-6 px-6">
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-start space-x-3">
                <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  </div>
);

// Helper function to get pastel colors for speakers
const getPastelColor = (speaker: string): string => {
  const pastelColors = [
    'bg-blue-300',
    'bg-indigo-300',
    'bg-purple-300',
    'bg-pink-300',
    'bg-orange-300',
    'bg-yellow-300',
    'bg-teal-300',
    'bg-cyan-300',
    'bg-violet-300',
    'bg-fuchsia-300',
    'bg-rose-300',
    'bg-amber-300',
  ];
  const hash = speaker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return pastelColors[hash % pastelColors.length];
};

// Helper function to get first name
const getFirstName = (fullName: string): string => {
  if (fullName.includes(',')) {
    const parts = fullName.split(',');
    if (parts.length > 1) {
      return parts[1].trim();
    }
  }
  return fullName.split(' ')[0];
};

// Message type for UI components
interface TranscriptMessage {
  id: string;
  speaker: string;
  content: string;
  timestamp: string;
  call_time: string;
  capture_time: string;
  isStarred: boolean;
  isComplete: boolean;
  duration: number;
}

// Process transcript blocks into messages and speaker stats (time-based)
const processTranscriptBlocks = (blocks: TranscriptBlock[] | undefined) => {
  if (!blocks || blocks.length === 0) {
    return { messages: [], speakerStats: {}, transcriptData: null };
  }

  // Use the utility for time-based calculation
  const processed = processTranscriptToSegments(blocks);

  // Convert segments to legacy message format for UI components
  const messages = processed.segments.map((segment, index) => {
    const minutes = Math.floor(segment.startTime / 60);
    const seconds = Math.floor(segment.startTime % 60);
    const callTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    return {
      id: `block-${index}`,
      speaker: segment.speaker,
      content: segment.text,
      timestamp: new Date().toISOString(), // not critical, used for display
      call_time: callTime,
      capture_time: new Date().toISOString(),
      isStarred: false,
      isComplete: true,
      duration: segment.duration, // seconds this segment lasted
    };
  });

  return {
    messages,
    speakerStats: processed.speakerStats,  // speaker -> total seconds spoken
    transcriptData: processed,  // full data for timeline visualization
  };
};

const Transcript = () => {
  const { USER_NAME } = getEnv();
  const { token } = useAuth();
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const [isTranscriptLoading, setIsTranscriptLoading] = useState(false);
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const {
    setTranscriptData,
    navigateToMeetingDetail,
    navigateToMeetingList,
    setMeetingName,
    setSelectedMeetingId
  } = useTranscript();

  const [hoveredDelete, setHoveredDelete] = useState<string | null>(null);
  const [speakerStats, setSpeakerStats] = useState<Record<string, number>>({});
  const [transcriptData, setTranscriptDataState] = useState<ProcessedTranscript | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);

  // Debounce search query - wait 200ms after typing stops
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [showSpeakerStats, setShowSpeakerStats] = useState(true);
  const [shareEmail, setShareEmail] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [isShareLoading, setIsShareLoading] = useState(false);
  const [showShareInput, setShowShareInput] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ id?: string; shareKey?: string }>();
  const meetingIdFromUrl = params.id;
  const shareKey = params.shareKey;
  const isSharedView = !!shareKey;
  const { registerNavigateHandler } = useBreadcrumb();

  // Track if we've loaded from URL to prevent re-triggering
  const hasLoadedFromUrl = useRef(false);

  // Fetch shared meeting (public, no auth)
  useEffect(() => {
    if (!isSharedView || !shareKey) return;

    const fetchSharedMeeting = async () => {
      try {
        setIsInitialLoading(true);
        const meeting = await getSharedMeeting(shareKey);
        setSelectedMeeting(meeting as Meeting);
        setMeetingName(meeting.title);
        setSelectedMeetingId(meeting.id); // Set meeting ID for AI context

        if (meeting.transcript?.blocks) {
          const { messages: msgs, speakerStats: stats, transcriptData: tData } = processTranscriptBlocks(
            meeting.transcript.blocks
          );
          setMessages(msgs);
          setTranscriptData(msgs as any);
          setSpeakerStats(stats);
          setTranscriptDataState(tData);
        }
      } catch (error: any) {
        console.error("Error fetching shared meeting:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to load shared meeting.",
        });
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchSharedMeeting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareKey, isSharedView]);

  // Fetch meetings list and transcript (in parallel when meetingIdFromUrl exists)
  useEffect(() => {
    if (isSharedView) return; // Skip for shared view

    // Check if GraphQL client actually has the token (not just AuthContext)
    const clientToken = getAuthToken();
    if (!token || !clientToken) {
      console.log(`[Transcript] ${Date.now()} fetchData: waiting for token... (context: ${!!token}, client: ${!!clientToken})`);
      return; // Wait for auth token to be set in GraphQL client
    }

    const fetchData = async () => {
      try {
        console.log(`[Transcript] ${Date.now()} fetchData: starting fetch`);
        setIsInitialLoading(true);

        if (meetingIdFromUrl && !hasLoadedFromUrl.current) {
          // PARALLEL FETCH: When we have a meeting ID, fetch both list and transcript simultaneously
          console.log(`[Transcript] ${Date.now()} fetchData: parallel fetch for meeting ${meetingIdFromUrl}`);
          hasLoadedFromUrl.current = true;

          // Start both fetches in parallel
          const [listResponse, meetingWithTranscript] = await Promise.all([
            listMeetings('MyMeetings'),
            getMeetingWithTranscript(meetingIdFromUrl)
          ]);

          console.log(`[Transcript] ${Date.now()} fetchData: parallel fetch complete`);

          // Set meetings list (for back navigation)
          setMeetings(listResponse.meetings);

          // Set meeting and transcript data directly
          setSelectedMeeting(meetingWithTranscript);
          setMeetingName(meetingWithTranscript.title);

          // Process transcript blocks
          const { messages: msgs, speakerStats: stats, transcriptData: tData } = processTranscriptBlocks(
            meetingWithTranscript.transcript?.blocks
          );
          setMessages(msgs);
          setTranscriptData(msgs.length > 0 ? msgs as any : null);
          setSpeakerStats(stats);
          setTranscriptDataState(tData);
        } else {
          // SEQUENTIAL FETCH: Just fetch the list (no meeting ID in URL)
          console.log(`[Transcript] ${Date.now()} fetchData: list-only fetch`);
          const response = await listMeetings('MyMeetings');
          console.log(`[Transcript] ${Date.now()} fetchData: got response, meetings:`, response.meetings?.length);
          setMeetings(response.meetings);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch data. Please try again.",
        });
        // If we were trying to load a specific meeting that failed, go to list
        if (meetingIdFromUrl) {
          navigateToMeetingList();
        }
      } finally {
        console.log(`[Transcript] ${Date.now()} fetchData: setting isInitialLoading to false`);
        setIsInitialLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingIdFromUrl, isSharedView, token]);

  // Polling for meeting list updates (only when in list view, not shared)
  useEffect(() => {
    if (selectedMeeting || isSharedView) return;

    const pollingInterval = setInterval(async () => {
      try {
        const response = await listMeetings('MyMeetings');
        setMeetings(response.meetings);
      } catch (error) {
        console.error("Error refreshing meetings:", error);
      }
    }, 30000);

    return () => clearInterval(pollingInterval);
  }, [selectedMeeting, isSharedView]);

  const handleMeetingSelect = useCallback(async (meeting: Meeting) => {
    setIsTranscriptLoading(true);
    setSelectedMeeting(meeting);
    setMeetingName(meeting.title);
    setShareLink(""); // Reset share link when switching meetings

    // Navigate to meeting detail URL
    if (!meetingIdFromUrl || meetingIdFromUrl !== meeting.id) {
      navigateToMeetingDetail(meeting.id);
    }

    try {
      // Fetch meeting with transcript using GraphQL
      const meetingWithTranscript = await getMeetingWithTranscript(meeting.id);

      // Process transcript blocks
      const { messages: msgs, speakerStats: stats, transcriptData: tData } = processTranscriptBlocks(
        meetingWithTranscript.transcript?.blocks
      );
      setMessages(msgs);
      setTranscriptData(msgs.length > 0 ? msgs as any : null);
      setSpeakerStats(stats);
      setTranscriptDataState(tData);
    } catch (error) {
      console.error("Error fetching transcript:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load transcript.",
      });
      setMessages([]);
      setTranscriptData(null);
    } finally {
      setIsTranscriptLoading(false);
    }
  }, [meetingIdFromUrl, navigateToMeetingDetail, setMeetingName, setTranscriptData]);

  const toggleStar = useCallback((id: string) => {
    setMessages(msgs =>
      msgs.map(msg => msg.id === id ? { ...msg, isStarred: !msg.isStarred } : msg)
    );
    // TODO: Call updateMeeting mutation to persist pin state
  }, []);

  const deleteMessage = useCallback((id: string) => {
    setMessages(msgs => msgs.filter(msg => msg.id !== id));
  }, []);

  const handleMeetingsUpdate = (updatedMeetings: Meeting[]) => {
    setMeetings(updatedMeetings);
    if (selectedMeeting) {
      const updated = updatedMeetings.find(m => m.id === selectedMeeting.id);
      if (updated) setSelectedMeeting(updated);
    }
  };

  const handleDeleteMeeting = async () => {
    if (!selectedMeeting) return;

    const currentMeeting = selectedMeeting;
    setSelectedMeeting(null);

    if (meetings) {
      setMeetings(meetings.filter(m => m.id !== currentMeeting.id));
    }

    try {
      await archiveMeeting(currentMeeting.id);
      navigateToMeetingList();
    } catch (error) {
      console.error("Failed to archive meeting:", error);
      if (meetings) setMeetings([...meetings, currentMeeting]);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete meeting. Please try again.",
      });
    }
  };

  const handleBackToMeetingList = useCallback(() => {
    navigateToMeetingList();
    setSelectedMeeting(null);
    setMessages([]);
    setTranscriptData(null);
  }, [navigateToMeetingList, setTranscriptData]);

  // Register navigation handler
  useEffect(() => {
    registerNavigateHandler(handleBackToMeetingList);
  }, [registerNavigateHandler, handleBackToMeetingList]);

  // URL change handling
  useEffect(() => {
    const currentPath = window.location.pathname;

    if (currentPath === '/' && selectedMeeting) {
      setSelectedMeeting(null);
      setMessages([]);
      setTranscriptData(null);
      setSpeakerStats({});
    }

    if (currentPath.startsWith('/t/')) {
      const idFromPath = currentPath.split('/')[2];
      if (idFromPath && (!selectedMeeting || selectedMeeting.id !== idFromPath)) {
        if (meetings) {
          const matchingMeeting = meetings.find(m => m.id === idFromPath);
          if (matchingMeeting) handleMeetingSelect(matchingMeeting);
        }
      }
    }
  }, [location.pathname, selectedMeeting, meetings, handleMeetingSelect, setTranscriptData]);

  // Search functionality (uses debounced query for performance)
  useEffect(() => {
    if (!debouncedSearchQuery.trim()) {
      setSearchResults([]);
      setCurrentSearchIndex(0);
      return;
    }

    const results = messages.reduce<number[]>((matches, message, index) => {
      if (message.content?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())) {
        matches.push(index);
      }
      return matches;
    }, []);

    setSearchResults(results);
    setCurrentSearchIndex(results.length > 0 ? 0 : -1);
  }, [debouncedSearchQuery, messages]);

  const goToNextSearchResult = () => {
    if (searchResults.length === 0) return;
    setCurrentSearchIndex(prev => prev + 1 >= searchResults.length ? 0 : prev + 1);
  };

  const goToPreviousSearchResult = () => {
    if (searchResults.length === 0) return;
    setCurrentSearchIndex(prev => prev - 1 < 0 ? searchResults.length - 1 : prev - 1);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setCurrentSearchIndex(0);
  };

  const handleStartRename = () => {
    if (selectedMeeting) {
      setRenameValue(selectedMeeting.title);
      setIsRenaming(true);
    }
  };

  const handleShareWithEmail = async () => {
    if (!selectedMeeting || !shareEmail.trim()) return;

    setIsShareLoading(true);
    try {
      await shareMeetingWithEmail(selectedMeeting.id, shareEmail.trim(), 'VIEW');
      setShareSuccess(true);
      toast({ title: "Shared", description: `Meeting shared with ${shareEmail}` });
      // Show green state briefly, then close
      setTimeout(() => {
        setShareEmail("");
        setShowShareInput(false);
        setShareSuccess(false);
      }, 600);
    } catch (error) {
      console.error("Failed to share meeting:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to share meeting" });
    } finally {
      setIsShareLoading(false);
    }
  };

  const handleRename = async () => {
    if (!selectedMeeting || !renameValue.trim()) return;

    const newTitle = renameValue.trim();
    if (newTitle === selectedMeeting.title) {
      setIsRenaming(false);
      return;
    }

    try {
      await updateMeeting(selectedMeeting.id, { title: newTitle });
      setSelectedMeeting({ ...selectedMeeting, title: newTitle });
      setMeetingName(newTitle);
      if (meetings) {
        setMeetings(meetings.map(m => m.id === selectedMeeting.id ? { ...m, title: newTitle } : m));
      }
      toast({ title: "Renamed", description: "Meeting title updated" });
    } catch (error) {
      console.error("Failed to rename meeting:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to rename meeting" });
    }
    setIsRenaming(false);
  };

  // Format meeting time display
  const formatMeetingTime = (meeting: Meeting) => {
    if (meeting.created) {
      const date = new Date(meeting.created);
      return date.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return '';
  };

  // Format duration display
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Determine if we should show Transcript View layout (either with data or loading skeleton)
  const showTranscriptViewLayout = selectedMeeting || ((meetingIdFromUrl || isSharedView) && isInitialLoading);

  return (
    <div className={showTranscriptViewLayout ? "flex flex-col" : "min-h-screen"}>
      <div className={showTranscriptViewLayout ? "flex-1" : ""}>
        {selectedMeeting ? (
          // ===== TRANSCRIPT VIEW =====
          // Shows a specific meeting's transcript detail (/t/:id route)
          <div className="flex flex-col gap-3">
                {/* Meeting Header */}
                <div className="flex-shrink-0 relative">
                  {!isSharedView && !selectedMeeting.hasEnded && (
                    <div className="absolute top-6 right-6 flex items-center space-x-2 z-10">
                      <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs text-muted-foreground">Live</span>
                    </div>
                  )}
                  <Card className="overflow-hidden h-full">
                        <CardHeader className="py-3 px-4">
                          <div className="flex flex-col gap-2 md:flex-row md:justify-between md:items-start">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                {selectedMeeting.platform === 'GOOGLE_MEET' && (
                                  <img src="/google-meet.png" alt="Google Meet" className="h-4 w-4 flex-shrink-0" />
                                )}
                                {isRenaming ? (
                                  <Input
                                    value={renameValue}
                                    onChange={(e) => setRenameValue(e.target.value)}
                                    onBlur={handleRename}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleRename();
                                      if (e.key === 'Escape') setIsRenaming(false);
                                    }}
                                    autoFocus
                                    className="text-base font-semibold leading-none tracking-tight h-auto w-auto min-w-[200px] py-0 px-0 bg-transparent border-0 border-transparent rounded-none focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                                  />
                                ) : (
                                  <CardTitle className="text-base truncate">{selectedMeeting.title}</CardTitle>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-y-1 text-sm text-muted-foreground mt-2">
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="ghost" size="sm" className="flex items-center transition-none h-auto py-0 px-0 hover:bg-transparent">
                                      <span>
                                        {formatMeetingTime(selectedMeeting)}
                                        {selectedMeeting.duration && ` · ${formatDuration(selectedMeeting.duration)}`}
                                        {' · '}
                                      </span>
                                      <Users className="mx-1 h-3.5 w-3.5" />
                                      <span>{selectedMeeting.participants.length}</span>
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-56 bg-card border-border p-2">
                                    <div className="space-y-1.5">
                                      {selectedMeeting.participants.map((participant, idx) => (
                                        <div key={idx} className="flex items-center space-x-2">
                                          <Avatar className="h-6 w-6">
                                            <AvatarFallback className={`text-xs ${getSpeakerColor(participant.name)}`}>{getFirstName(participant.name)[0]}</AvatarFallback>
                                          </Avatar>
                                          <span className="text-sm">{participant.name}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </div>
                            {/* Right side actions */}
                            <div className="flex items-center gap-1">
                              {/* Only show these actions for authenticated users (not shared view) */}
                              {!isSharedView && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                    onClick={async () => {
                                      try {
                                        toast({ title: "Generating...", description: "Creating meeting minutes PDF" });
                                        const apiUrl = process.env.REACT_APP_GRAPHQL_URL?.replace('/api/2/graphql', '') || '';
                                        const response = await fetch(`${apiUrl}/api/2/minutes/generate`, {
                                          method: 'POST',
                                          headers: {
                                            'Content-Type': 'application/json',
                                            'Authorization': `Bearer ${token}`,
                                          },
                                          body: JSON.stringify({ meetingId: selectedMeeting.id }),
                                        });

                                        if (!response.ok) {
                                          const error = await response.json();
                                          throw new Error(error.error || 'Failed to generate minutes');
                                        }

                                        // Download the PDF
                                        const blob = await response.blob();
                                        const url = window.URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `${selectedMeeting.title || 'meeting'}-minutes.pdf`;
                                        document.body.appendChild(a);
                                        a.click();
                                        window.URL.revokeObjectURL(url);
                                        document.body.removeChild(a);

                                        toast({ title: "Success", description: "Meeting minutes downloaded" });
                                      } catch (error) {
                                        console.error("Failed to generate minutes:", error);
                                        toast({ variant: "destructive", title: "Error", description: error instanceof Error ? error.message : "Failed to generate minutes" });
                                      }
                                    }}
                                    title="Generate Minutes"
                                  >
                                    <FileText className="h-4 w-4" />
                                  </Button>
                                  {/* Public Link - one click copy, blue if shared */}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`h-8 w-8 ${selectedMeeting.sharingLink?.reach !== 'PRIVATE' && selectedMeeting.sharingLink?.key ? 'text-blue-400 hover:text-blue-300' : 'text-muted-foreground hover:text-foreground'}`}
                                    title={selectedMeeting.sharingLink?.reach !== 'PRIVATE' ? "Copy link" : "Create & copy link"}
                                    onClick={async () => {
                                      try {
                                        if (selectedMeeting.sharingLink?.key) {
                                          const link = `${window.location.origin}/s/${selectedMeeting.sharingLink.key}`;
                                          navigator.clipboard.writeText(link);
                                          toast({ title: "Copied!", description: "Link copied to clipboard" });
                                        } else {
                                          const result = await generateShareLink(selectedMeeting.id);
                                          const link = `${window.location.origin}/s/${result.key}`;
                                          setSelectedMeeting({
                                            ...selectedMeeting,
                                            sharingLink: { key: result.key, reach: 'ANYONE_WITH_LINK', expiry: 0 }
                                          });
                                          navigator.clipboard.writeText(link);
                                          toast({ title: "Link created!", description: "Link copied to clipboard" });
                                        }
                                      } catch (error) {
                                        console.error("Failed to generate share link:", error);
                                        toast({ variant: "destructive", title: "Error", description: "Failed to create link" });
                                      }
                                    }}
                                  >
                                    <Link className="h-4 w-4" />
                                  </Button>
                                  {/* Share Access - Users icon + inline sliding input */}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`h-8 w-8 ${showShareInput ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                    title="Share access"
                                    onClick={() => {
                                      setShowShareInput(!showShareInput);
                                      if (showShareInput) setShareEmail("");
                                    }}
                                  >
                                    <Users className="h-4 w-4" />
                                  </Button>
                                  <div
                                    className={`overflow-hidden transition-all duration-200 ease-out ${showShareInput ? 'w-48 opacity-100' : 'w-0 opacity-0'}`}
                                  >
                                    <div className="relative flex items-center">
                                      <input
                                        ref={(input) => input && showShareInput && input.focus()}
                                        type="email"
                                        placeholder="email"
                                        value={shareEmail}
                                        onChange={(e) => setShareEmail(e.target.value)}
                                        className={`w-full h-8 pl-2 pr-7 text-sm bg-transparent border rounded-lg outline-none focus:ring-0 placeholder:text-muted-foreground/50 transition-colors ${shareSuccess ? 'border-green-400 text-green-400' : 'border-white/30 focus:border-white/30'}`}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && shareEmail.trim()) {
                                            e.preventDefault();
                                            handleShareWithEmail();
                                          }
                                          if (e.key === 'Escape') {
                                            setShowShareInput(false);
                                            setShareEmail("");
                                          }
                                        }}
                                      />
                                      <span className={`absolute right-2 text-xs transition-colors ${shareSuccess ? 'text-green-400' : shareEmail.trim() ? 'text-foreground' : 'text-muted-foreground/40'}`}>
                                        {shareSuccess ? '✓' : '↵'}
                                      </span>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                    onClick={handleStartRename}
                                    title="Rename"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`h-8 w-8 ${showSpeakerStats ? 'text-cyan-400 hover:text-cyan-300' : 'text-muted-foreground hover:text-foreground'}`}
                                onClick={() => setShowSpeakerStats(!showSpeakerStats)}
                                title={showSpeakerStats ? "Hide Speaker Stats" : "Show Speaker Stats"}
                              >
                                <BarChart2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          {/* Inline Speaker Stats */}
                          {showSpeakerStats && (
                            isTranscriptLoading && Object.keys(speakerStats).length === 0 ? (
                              // Speaker stats skeleton during loading
                              <div className="mt-6 space-y-3">
                                <div className="space-y-1">
                                  <div className="flex justify-between">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-4 w-8" />
                                  </div>
                                  <Skeleton className="h-1.5 w-full rounded-full" />
                                </div>
                                <div className="space-y-1">
                                  <div className="flex justify-between">
                                    <Skeleton className="h-4 w-20" />
                                    <Skeleton className="h-4 w-8" />
                                  </div>
                                  <Skeleton className="h-1.5 w-full rounded-full" />
                                </div>
                              </div>
                            ) : transcriptData && transcriptData.speakerDetails.length > 0 ? (() => {
                              const { speakerDetails, segments, meetingDuration } = transcriptData;

                              return (
                                <div className="mt-6 space-y-3">
                                  {speakerDetails.map(({ speaker, percentage }) => {
                                    const speakerColor = getPastelColor(speaker);
                                    // Get segments for this speaker
                                    const speakerSegments = segments.filter(s => s.speaker === speaker);

                                    return (
                                      <div key={speaker} className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                          <span>{speaker}</span>
                                          <span className="text-muted-foreground">{percentage}%</span>
                                        </div>
                                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden relative">
                                          {meetingDuration > 0 ? (
                                            speakerSegments.map((segment, idx) => {
                                              const positionPercent = (segment.startTime / meetingDuration) * 100;
                                              const widthPercent = Math.max((segment.duration / meetingDuration) * 100, 0.3);
                                              return (
                                                <div
                                                  key={idx}
                                                  className={`absolute top-0 h-full ${speakerColor}`}
                                                  style={{
                                                    left: `${positionPercent}%`,
                                                    width: `${widthPercent}%`,
                                                    zIndex: 10
                                                  }}
                                                />
                                              );
                                            })
                                          ) : (
                                            <div
                                              className={`h-full rounded-full transition-all duration-300 ${speakerColor}`}
                                              style={{ width: `${percentage}%` }}
                                            />
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })() : null
                          )}
                        </CardHeader>
                      </Card>
                </div>

                {/* Transcript */}
                <div className="sticky top-[78px] z-10">
                  <Card className="h-[calc(100vh-90px)] flex flex-col overflow-hidden">
                      <CardHeader className="flex flex-row items-center justify-between flex-shrink-0 py-2 px-4 space-y-0">
                        <div className="flex items-center gap-1 h-8">
                          <CardTitle className="text-base leading-none">Transcript</CardTitle>
                          <div className="flex items-center gap-1 ml-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                const transcriptText = messages
                                  .map(m => `${m.speaker}: ${m.content}`)
                                  .join('\n\n');
                                navigator.clipboard.writeText(transcriptText);
                                toast({ title: "Copied", description: "Transcript copied to clipboard" });
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground md:hidden"
                              onClick={() => {
                                // Dispatch custom event to open chat drawer
                                window.dispatchEvent(new CustomEvent('openChatDrawer'));
                              }}
                            >
                              <MessageCircleMore className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="w-32 md:w-44 flex items-center h-8">
                          <div className="relative flex items-center w-full h-full">
                            {searchQuery ? (
                              <X className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground cursor-pointer hover:text-foreground" onClick={clearSearch} />
                            ) : (
                              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                            )}
                            <Input
                              placeholder="Search..."
                              className="h-full pl-7 pr-2 text-xs rounded-md focus:ring-0 focus:outline-none focus-visible:ring-0 border border-white/20 bg-secondary"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              onKeyDown={(e) => e.key === 'Escape' && clearSearch()}
                            />
                            {searchQuery && (
                              <div className="absolute right-1 flex items-center space-x-0.5">
                                <span className="text-[10px] text-muted-foreground">
                                  {searchResults.length > 0 ? `${currentSearchIndex + 1}/${searchResults.length}` : "0/0"}
                                </span>
                                <Button variant="ghost" size="icon" className="h-5 w-5" disabled={searchResults.length === 0} onClick={goToPreviousSearchResult}>
                                  <ChevronUp className="h-2.5 w-2.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-5 w-5" disabled={searchResults.length === 0} onClick={goToNextSearchResult}>
                                  <ChevronDown className="h-2.5 w-2.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <div className={`flex-1 pb-3 px-3 ${messages.length > 0 ? 'overflow-y-auto show-scrollbar' : 'overflow-hidden'}`}>
                        <div className="h-full">
                          {messages.length > 0 ? (
                            <MessageList
                              messages={messages}
                              hoveredDelete={hoveredDelete}
                              onStar={toggleStar}
                              onDelete={deleteMessage}
                              onHoverDelete={setHoveredDelete}
                              searchQuery={debouncedSearchQuery}
                              searchResults={searchResults}
                              currentSearchIndex={currentSearchIndex}
                              isLive={!isSharedView && !selectedMeeting.hasEnded}
                            />
                          ) : isTranscriptLoading ? (
                            <div className="space-y-2">
                              {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="group flex items-start space-x-3 py-2 px-3 rounded-md animate-pulse">
                                  <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700" />
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2">
                                      <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                                      <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                                    </div>
                                    <div className="mt-2 space-y-2">
                                      <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                                      <div className="h-3 w-4/5 bg-gray-200 dark:bg-gray-700 rounded" />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center p-6">
                              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                              <h3 className="text-lg font-medium mb-2">No transcript available</h3>
                              <p className="text-muted-foreground text-sm max-w-md">
                                {!selectedMeeting.hasEnded
                                  ? "Transcript will appear here once the meeting starts recording."
                                  : "No transcript was recorded for this meeting."}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                </div>
              </div>
        ) : ((meetingIdFromUrl || isSharedView) && isInitialLoading) ? (
          // ===== TRANSCRIPT VIEW SKELETON =====
          // Shows skeleton when loading a specific meeting from URL (/t/:id or /s/:shareKey)
          <TranscriptViewSkeleton />
        ) : (
          // ===== TRANSCRIPT LIST VIEW =====
          // Shows all meetings as cards (/ route)
          <MeetingListView
            meetings={meetings || []}
            onMeetingSelect={handleMeetingSelect}
            onMeetingUpdate={handleMeetingsUpdate}
            isLoading={isInitialLoading}
          />
        )}
      </div>
    </div>
  );
};

// Hide scrollbar styles
const style = document.createElement('style');
style.textContent = `.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } .hide-scrollbar::-webkit-scrollbar { display: none; }`;
document.head.appendChild(style);

export default Transcript;
