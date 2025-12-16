import React, { useState, useEffect, useCallback, useRef } from "react";
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
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import {
  Clock,
  Users,
  Search,
  FileText,
  FileSearch,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { speakerColors } from "../data/meetings";
import { Meeting, TranscriptBlock } from "../types";
import { MeetingListView } from "../components/MeetingListView";
import { MessageList } from "../components/MessageList";
import { ActionItems, SpeakerStats } from "../components/MeetingPanels";
import { listMeetings, getMeetingWithTranscript, archiveMeeting } from "../apis/meetings";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { toast } from '../components/ui/toast';
import { useBreadcrumb } from "../lib/BreadcrumbContext";
import { useTranscript } from '../lib/TranscriptContext';
import { getEnv } from "../lib/useEnv";

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

interface ActionItem {
  id: string;
  content: string;
  isInferred: boolean;
  isEditing: boolean;
}

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

  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [newActionItem, setNewActionItem] = useState("");
  const [hoveredDelete, setHoveredDelete] = useState<string | null>(null);
  const [speakerStats, setSpeakerStats] = useState<Record<string, number>>({});

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);

  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ id?: string }>();
  const meetingIdFromUrl = params.id;
  const { registerNavigateHandler } = useBreadcrumb();

  // Track if we've loaded from URL to prevent re-triggering
  const hasLoadedFromUrl = useRef(false);

  // Fetch meetings list
  useEffect(() => {
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
  }, [meetingIdFromUrl]);

  // Polling for meeting list updates (only when in list view)
  useEffect(() => {
    if (selectedMeeting) return;

    const pollingInterval = setInterval(async () => {
      try {
        const response = await listMeetings('MyMeetings');
        setMeetings(response.meetings);
      } catch (error) {
        console.error("Error refreshing meetings:", error);
      }
    }, 30000);

    return () => clearInterval(pollingInterval);
  }, [selectedMeeting]);

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

  const addToActionItems = async (content: string, messageId: string) => {
    const message = messages.find(msg => msg.id === messageId);
    if (!message) return;

    const tempId = crypto.randomUUID();
    setActionItems(items => [
      ...items,
      { id: tempId, content, isInferred: false, isEditing: false },
    ]);
    // TODO: Call createTask mutation
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
    <div className={selectedMeeting ? "h-full flex flex-col overflow-hidden" : "min-h-screen"}>
      <div className={selectedMeeting ? "flex-1 overflow-hidden" : ""}>
        {selectedMeeting ? (
          <div className="container mx-auto px-4 py-8 h-full flex flex-col overflow-hidden">
            <div className="grid gap-8 h-full overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full overflow-hidden">
                <div className="lg:col-span-8 flex flex-col overflow-hidden h-full">
                  <div className="min-w-0 flex flex-col overflow-hidden flex-1">
                    <div className="relative flex-shrink-0">
                      {!selectedMeeting.hasEnded && (
                        <div className="absolute top-6 right-6 flex items-center space-x-2 z-10">
                          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-xs text-muted-foreground">Live</span>
                        </div>
                      )}
                      <Card className="overflow-hidden">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle>{selectedMeeting.title}</CardTitle>
                              <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-2">
                                <div className="flex items-center">
                                  <Clock className="mr-2 h-4 w-4" />
                                  <span>
                                    {formatMeetingTime(selectedMeeting)}
                                    {selectedMeeting.duration && ` (${formatDuration(selectedMeeting.duration)})`}
                                  </span>
                                </div>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="ghost" size="sm" className="flex items-center">
                                      <Users className="mr-2 h-4 w-4" />
                                      <span>{selectedMeeting.participants.length} Participants</span>
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-64 bg-card border-border">
                                    <div className="space-y-2">
                                      {selectedMeeting.participants.map((participant, idx) => (
                                        <div key={idx} className="flex items-center space-x-2">
                                          <Avatar className={speakerColors[participant.name] || 'bg-primary'}>
                                            <AvatarFallback>{getFirstName(participant.name)[0]}</AvatarFallback>
                                          </Avatar>
                                          <span>{participant.name}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                                <span className="text-xs px-2 py-1 bg-secondary rounded">
                                  {selectedMeeting.platform.replace('_', ' ')}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2 mt-4">
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
                        </CardHeader>
                      </Card>
                    </div>

                    <Card className="flex-1 flex flex-col overflow-hidden mt-4">
                      <CardHeader className="flex flex-row items-center justify-between flex-shrink-0">
                        <CardTitle>Transcript</CardTitle>
                        <div className="w-64">
                          <div className="relative flex items-center">
                            {searchQuery ? (
                              <X className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground" onClick={clearSearch} />
                            ) : (
                              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            )}
                            <Input
                              placeholder="Search..."
                              className="pl-8"
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
                      <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
                        <div className="flex-1 p-4 overflow-y-auto hide-scrollbar">
                          {messages.length > 0 ? (
                            <MessageList
                              messages={messages}
                              hoveredDelete={hoveredDelete}
                              onStar={toggleStar}
                              onAddToActionItems={addToActionItems}
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
                      </CardContent>
                    </Card>
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
                                { id: crypto.randomUUID(), content: newActionItem, isInferred: false, isEditing: false },
                              ]);
                              setNewActionItem("");
                            }
                          }}
                          onDeleteItem={(id: string) => setActionItems(items => items.filter(item => item.id !== id))}
                          onEditItem={(id: string, content: string) => setActionItems(items => items.map(item => item.id === id ? { ...item, content, isEditing: false } : item))}
                          onSetEditing={setActionItems}
                        />
                      </>
                    ) : isTranscriptLoading ? (
                      <>
                        <div className="bg-background rounded-lg border p-4 animate-pulse">
                          <div className="mb-4"><div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded" /></div>
                          <div className="space-y-3">
                            {Array.from({ length: 3 }).map((_, i) => (
                              <div key={i} className="flex items-center space-x-2">
                                <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700" />
                                <div className="flex-1">
                                  <div className="h-4 w-24 mb-1 bg-gray-200 dark:bg-gray-700 rounded" />
                                  <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full"><div className={`h-full ${i === 0 ? 'w-2/3' : i === 1 ? 'w-1/2' : 'w-1/4'} bg-gray-200 dark:bg-gray-700`} /></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="bg-background rounded-lg border flex-1 animate-pulse">
                          <div className="p-4 border-b"><div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded" /></div>
                          <div className="p-4 space-y-3">
                            {Array.from({ length: 3 }).map((_, i) => (
                              <div key={i} className="flex items-start space-x-2">
                                <div className="h-4 w-4 mt-1 rounded bg-gray-200 dark:bg-gray-700" />
                                <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <SpeakerStats stats={{}} messages={[]} />
                        <ActionItems items={[]} newItem="" onNewItemChange={() => {}} onAddItem={() => {}} onDeleteItem={() => {}} onEditItem={() => {}} onSetEditing={() => {}} />
                      </>
                    )}
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

// Hide scrollbar styles
const style = document.createElement('style');
style.textContent = `.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } .hide-scrollbar::-webkit-scrollbar { display: none; }`;
document.head.appendChild(style);

export default Transcript;
