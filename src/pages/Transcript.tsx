import React, { useState, useEffect, useCallback, useRef } from "react";
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
  FileSearch,
  X,
  ChevronDown,
  ChevronUp,
  Mail,
  Link,
  Pencil,
  Copy,
} from "lucide-react";
import { getSpeakerColor } from "../data/meetings";
import { Meeting, TranscriptBlock } from "../types";
import { MeetingListView } from "../components/MeetingListView";
import { MessageList } from "../components/MessageList";
// ActionItems and SpeakerStats removed - speaker stats now inline in header
import { listMeetings, getMeetingWithTranscript, archiveMeeting, updateMeeting, generateShareLink, getSharedMeeting } from "../apis/meetings";
import { useNavigate, useLocation, useParams, useMatch } from "react-router-dom";
import { toast } from '../components/ui/toast';
import { useBreadcrumb } from "../lib/BreadcrumbContext";
import { useTranscript } from '../lib/TranscriptContext';
import { getEnv } from "../lib/useEnv";

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

// Helper function to convert call_time ("MM:SS") to seconds
const timeToSeconds = (time: string): number => {
  if (!time || !time.includes(':')) return 0;
  const [minutes, seconds] = time.split(':').map(Number);
  return minutes * 60 + seconds;
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

// Convert TranscriptBlock to legacy Message format for UI components
const blockToMessage = (block: TranscriptBlock, index: number) => {
  const date = new Date(block.timestamp);
  const minutes = Math.floor(block.timestamp / 60000);
  const seconds = Math.floor((block.timestamp % 60000) / 1000);
  const callTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return {
    id: `block-${index}`,
    speaker: block.speakerName,
    content: block.transcript,
    timestamp: date.toISOString(),
    call_time: callTime,
    capture_time: date.toISOString(),
    isStarred: false,
    isComplete: true,
  };
};

const Transcript = () => {
  const { USER_NAME } = getEnv();
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isTranscriptLoading, setIsTranscriptLoading] = useState(false);
  const [messages, setMessages] = useState<ReturnType<typeof blockToMessage>[]>([]);
  const {
    setTranscriptData,
    navigateToMeetingDetail,
    navigateToMeetingList,
    setMeetingName
  } = useTranscript();

  const [hoveredDelete, setHoveredDelete] = useState<string | null>(null);
  const [speakerStats, setSpeakerStats] = useState<Record<string, number>>({});

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");

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

        if (meeting.transcript?.blocks) {
          const msgs = meeting.transcript.blocks.map((block: TranscriptBlock, index: number) =>
            blockToMessage(block, index)
          );
          setMessages(msgs);
          setTranscriptData(msgs as any);

          // Calculate speaker stats
          const stats: Record<string, number> = {};
          meeting.transcript.blocks.forEach((block: TranscriptBlock) => {
            const textLength = block.transcript?.length || 0;
            stats[block.speakerName] = (stats[block.speakerName] || 0) + textLength;
          });
          setSpeakerStats(stats);
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

  // Fetch meetings list (authenticated)
  useEffect(() => {
    if (isSharedView) return; // Skip for shared view

    const fetchMeetingsData = async () => {
      try {
        setIsInitialLoading(true);
        const response = await listMeetings('MyMeetings');
        setMeetings(response.meetings);

        // If we have a meetingId in the URL and haven't loaded yet, load that meeting
        if (meetingIdFromUrl && !hasLoadedFromUrl.current) {
          const matchingMeeting = response.meetings.find(m => m.id === meetingIdFromUrl);
          if (matchingMeeting) {
            hasLoadedFromUrl.current = true;
            handleMeetingSelect(matchingMeeting);
          } else {
            navigateToMeetingList();
          }
        }
      } catch (error) {
        console.error("Error fetching meetings:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch meetings. Please try again.",
        });
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchMeetingsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingIdFromUrl, isSharedView]);

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

    // Navigate to meeting detail URL
    if (!meetingIdFromUrl || meetingIdFromUrl !== meeting.id) {
      navigateToMeetingDetail(meeting.id);
    }

    try {
      // Fetch meeting with transcript using GraphQL
      const meetingWithTranscript = await getMeetingWithTranscript(meeting.id);

      if (meetingWithTranscript.transcript?.blocks) {
        const blocks = meetingWithTranscript.transcript.blocks;
        const msgs = blocks.map((block, index) => blockToMessage(block, index));

        setMessages(msgs);
        setTranscriptData(msgs as any);

        // Calculate speaker stats
        const stats: Record<string, number> = {};
        msgs.forEach(msg => {
          stats[msg.speaker] = (stats[msg.speaker] || 0) + 1;
        });
        setSpeakerStats(stats);
      } else {
        setMessages([]);
        setTranscriptData(null);
        setSpeakerStats({});
      }
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

  const toggleStar = async (id: string) => {
    setMessages(msgs =>
      msgs.map(msg => msg.id === id ? { ...msg, isStarred: !msg.isStarred } : msg)
    );
    // TODO: Call updateMeeting mutation to persist pin state
  };

  const deleteMessage = (id: string) => {
    setMessages(msgs => msgs.filter(msg => msg.id !== id));
  };

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

  // Search functionality
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setCurrentSearchIndex(0);
      return;
    }

    const results = messages.reduce<number[]>((matches, message, index) => {
      if (message.content?.toLowerCase().includes(searchQuery.toLowerCase())) {
        matches.push(index);
      }
      return matches;
    }, []);

    setSearchResults(results);
    setCurrentSearchIndex(results.length > 0 ? 0 : -1);
  }, [searchQuery, messages]);

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

  return (
    <div className={selectedMeeting ? "h-full flex flex-col" : "min-h-screen"}>
      <div className={selectedMeeting ? "flex-1 overflow-auto" : ""}>
        {selectedMeeting ? (
          <div className="flex flex-col gap-3 pb-4">
                {/* Meeting Header */}
                <div className="flex-shrink-0 relative">
                  {!selectedMeeting.hasEnded && (
                    <div className="absolute top-6 right-6 flex items-center space-x-2 z-10">
                      <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs text-muted-foreground">Live</span>
                    </div>
                  )}
                  <Card className="overflow-hidden h-full">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-3">
                                {selectedMeeting.platform === 'GOOGLE_MEET' && (
                                  <img src="/google-meet.png" alt="Google Meet" className="h-6 w-6 flex-shrink-0" />
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
                                    className="text-2xl font-semibold h-auto py-0 px-1 border-none focus:ring-0"
                                  />
                                ) : (
                                  <CardTitle>{selectedMeeting.title}</CardTitle>
                                )}
                              </div>
                              <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-2">
                                <span>
                                  {formatMeetingTime(selectedMeeting)}
                                  {selectedMeeting.duration && ` · ${formatDuration(selectedMeeting.duration)}`}
                                </span>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="ghost" size="sm" className="flex items-center">
                                      <Users className="mr-2 h-4 w-4" />
                                      <span>{selectedMeeting.participants.length} Participants</span>
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
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={() => toast({ title: "Coming Soon", description: "Email feature is in development", variant: "info" })}
                              >
                                <Mail className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={async () => {
                                  try {
                                    const result = await generateShareLink(selectedMeeting.id);
                                    const shareUrl = `${window.location.origin}/s/${result.key}`;
                                    navigator.clipboard.writeText(shareUrl);
                                    toast({ title: "Link Copied", description: "Share link copied to clipboard" });
                                  } catch (error) {
                                    console.error("Failed to generate share link:", error);
                                    toast({ variant: "destructive", title: "Error", description: "Failed to generate share link" });
                                  }
                                }}
                              >
                                <Link className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={handleStartRename}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex space-x-2 mt-4 pb-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => toast({ title: "Coming Soon", description: "This feature is in development", variant: "info" })}
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              Generate Minutes
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => toast({ title: "Coming Soon", description: "This feature is in development", variant: "info" })}
                            >
                              <FileSearch className="mr-2 h-4 w-4" />
                              Detailed Summary
                            </Button>
                          </div>
                          {/* Inline Speaker Stats */}
                          {Object.keys(speakerStats).length > 0 && (() => {
                            const totalMessages = Object.values(speakerStats).reduce((sum, c) => sum + c, 0);
                            const speakerPercentages = Object.entries(speakerStats).map(([speaker, count]) => ({
                              speaker,
                              count,
                              percentage: totalMessages > 0 ? Math.round((count / totalMessages) * 100) : 0
                            }));

                            // Get messages with time data for timeline
                            const messagesWithTime = messages.filter(msg => msg.call_time);
                            const sortedMessages = [...messagesWithTime].sort((a, b) =>
                              timeToSeconds(a.call_time || "0:00") - timeToSeconds(b.call_time || "0:00")
                            );

                            const hasTimeData = sortedMessages.length > 0;
                            const startTime = hasTimeData ? timeToSeconds(sortedMessages[0].call_time || "0:00") : 0;
                            const endTime = hasTimeData ? timeToSeconds(sortedMessages[sortedMessages.length - 1].call_time || "0:00") : 0;
                            const meetingDuration = endTime - startTime;
                            const SPEECH_DURATION = 2;

                            // Build speaker markers
                            const speakerMarkers: Record<string, Array<{time: number}>> = {};
                            Object.keys(speakerStats).forEach(speaker => {
                              speakerMarkers[speaker] = [];
                            });
                            sortedMessages.forEach(message => {
                              const time = timeToSeconds(message.call_time || "0:00");
                              if (!speakerMarkers[message.speaker]) {
                                speakerMarkers[message.speaker] = [];
                              }
                              speakerMarkers[message.speaker].push({ time });
                            });

                            return (
                              <div className="mt-6 space-y-3">
                                {speakerPercentages.map(({ speaker, percentage }) => {
                                  const speakerColor = getPastelColor(speaker);
                                  return (
                                    <div key={speaker} className="space-y-1">
                                      <div className="flex justify-between text-sm">
                                        <span>{speaker}</span>
                                        <span className="text-muted-foreground">{percentage}%</span>
                                      </div>
                                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden relative">
                                        {hasTimeData && meetingDuration > 0 ? (
                                          speakerMarkers[speaker]?.map((marker, idx) => {
                                            const positionPercent = ((marker.time - startTime) / meetingDuration) * 100;
                                            const widthPercent = Math.max((SPEECH_DURATION / meetingDuration) * 100, 0.5);
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
                          })()}
                        </CardHeader>
                      </Card>
                </div>

                {/* Transcript */}
                <div className="min-h-[500px]">
                  <Card className="h-full flex flex-col">
                      <CardHeader className="flex flex-row items-center justify-between flex-shrink-0 py-3 px-6">
                        <div className="flex items-center gap-2">
                          <CardTitle>Transcript</CardTitle>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground opacity-50 hover:opacity-100"
                            onClick={() => {
                              const transcriptText = messages
                                .map(m => `${m.speaker}: ${m.content}`)
                                .join('\n\n');
                              navigator.clipboard.writeText(transcriptText);
                              toast({ title: "Copied", description: "Transcript copied to clipboard" });
                            }}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="w-64">
                          <div className="relative flex items-center">
                            {searchQuery ? (
                              <X className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground" onClick={clearSearch} />
                            ) : (
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            )}
                            <Input
                              placeholder="Search..."
                              className="pl-10 rounded-lg focus:ring-0 focus:outline-none focus-visible:ring-0 !border-0"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              onKeyDown={(e) => e.key === 'Escape' && clearSearch()}
                            />
                            {searchQuery && (
                              <div className="absolute right-2 flex items-center space-x-1">
                                <span className="text-xs text-muted-foreground">
                                  {searchResults.length > 0 ? `${currentSearchIndex + 1}/${searchResults.length}` : "0/0"}
                                </span>
                                <Button variant="ghost" size="icon" className="h-6 w-6" disabled={searchResults.length === 0} onClick={goToPreviousSearchResult}>
                                  <ChevronUp className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6" disabled={searchResults.length === 0} onClick={goToNextSearchResult}>
                                  <ChevronDown className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <div className="flex-1 overflow-y-auto pb-6 hide-scrollbar">
                        <div className="h-full">
                          {messages.length > 0 ? (
                            <MessageList
                              messages={messages}
                              hoveredDelete={hoveredDelete}
                              onStar={toggleStar}
                              onDelete={deleteMessage}
                              onHoverDelete={setHoveredDelete}
                              searchQuery={searchQuery}
                              searchResults={searchResults}
                              currentSearchIndex={currentSearchIndex}
                              isLive={!selectedMeeting.hasEnded}
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
        ) : (
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
