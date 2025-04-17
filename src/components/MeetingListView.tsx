import React, { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Clock, Users, X } from "lucide-react";
import { Meeting } from "../types";
import { speakerColors } from "../data/meetings";
import { fetchMeetings, endMeeting, deleteMeeting } from "../apis/meeting";
import { Button } from "./ui/button";
import { Skeleton } from "../components/ui/skeleton";
import MeetingStatusWebsocket from "../apis/meetingStatusWebsocket";

interface MeetingListViewProps {
  meetings: Meeting[];
  onMeetingSelect: (meeting: Meeting) => void;
  onMeetingUpdate?: (updatedMeetings: Meeting[]) => void;
  isLoading?: boolean;
}

// Helper function to format meeting time to a user-friendly format
const formatMeetingTime = (timeString: string | null | undefined) => {
  // If not set
  if (!timeString) return "—";
  
  // For simple time format like "10:00 AM", just return as is
  if (/^\d{1,2}:\d{2}(?:\s?[AP]M)?$/i.test(timeString)) {
    return timeString;
  }
  
  // For ISO or full date format, try to parse and format
  try {
    const date = new Date(timeString);
    if (isNaN(date.getTime())) {
      return timeString; // Invalid date, return original
    }
    
    // Format to include date and time
    return date.toLocaleTimeString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.log(`Error formatting time: ${timeString}`, error);
    return timeString;
  }
};

// Skeleton card component for loading state
const MeetingCardSkeleton = () => (
  <div className="relative w-full">
    <Card className="w-full overflow-hidden h-[200px]">
      <CardHeader>
        <Skeleton className="h-6 w-3/4 mb-2" />
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex -space-x-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-8 rounded-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);

export function MeetingListView({
  meetings,
  onMeetingSelect,
  onMeetingUpdate,
  isLoading = false
}: MeetingListViewProps) {
  const username = localStorage.getItem("username");
  const websocketsRef = useRef<{ [key: string]: MeetingStatusWebsocket }>({});
  
  // Setup WebSocket connections for active meetings
  useEffect(() => {
    // Only setup WebSockets if we have a username and meetings
    if (!username || !meetings?.length) return;
    
    // Clear any existing connections first
    Object.values(websocketsRef.current).forEach(ws => {
      ws.disconnect();
    });
    websocketsRef.current = {};
    
    // Get active meetings
    const activeMeetings = meetings.filter(m => m.is_active);
    
    // If there are no active meetings, don't create any WebSockets
    if (activeMeetings.length === 0) return;
    
    // Sort active meetings by start time (most recent first)
    const sortedActiveMeetings = [...activeMeetings].sort((a, b) => {
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
    
    // Only take the most recent active meeting
    const mostRecentMeeting = sortedActiveMeetings[0];
    
    // Create handlers for the meeting
    const handlers = {
      onMeetingEnded: (meetingId: string, endTime: string) => {
        console.log(`Meeting ${meetingId} ended via WebSocket notification`);
        
        // Update meeting status via the update callback
        if (onMeetingUpdate) {
          onMeetingUpdate(
            meetings.map(m => 
              m.id === meetingId 
                ? { ...m, is_active: false, end_time: endTime }
                : m
            )
          );
        }
        
        // Clean up the WebSocket
        if (websocketsRef.current[meetingId]) {
          websocketsRef.current[meetingId].disconnect();
          delete websocketsRef.current[meetingId];
        }
      }
    };
    
    // Create and store the WebSocket only for the most recent meeting
    const ws = new MeetingStatusWebsocket(mostRecentMeeting.id, username, handlers);
    websocketsRef.current[mostRecentMeeting.id] = ws;
    
    // Connect to the WebSocket
    ws.connect();
    console.log(`Connected to WebSocket for most recent meeting: ${mostRecentMeeting.name}`);
    
    // Cleanup function to disconnect WebSockets
    return () => {
      Object.values(websocketsRef.current).forEach(ws => {
        ws.disconnect();
      });
      websocketsRef.current = {};
    };
  }, [meetings, username, onMeetingUpdate]);
  
  // Function to handle ending a meeting with optimistic UI update
  const handleEndMeeting = async (event: React.MouseEvent, meetingId: string) => {
    event.stopPropagation(); // Prevent card click from triggering
    
    if (!username) return;
    
    // Find the meeting to end
    const meetingToEnd = meetings.find(m => m.id === meetingId);
    if (!meetingToEnd) return;
    
    // Create a copy of the meeting with is_active set to false
    const updatedMeeting = { ...meetingToEnd, is_active: false };
    
    // Create a new array with the updated meeting
    const optimisticMeetings = meetings.map(m => 
      m.id === meetingId ? updatedMeeting : m
    );
    
    // Update UI immediately with optimistic data
    if (onMeetingUpdate) {
      onMeetingUpdate(optimisticMeetings);
    }
    
    // Make the actual API call
    try {
      await endMeeting(meetingId, username);
      
      // If successful, fetch the latest data in the background
      if (username) {
        fetchMeetings(username)
          .then((refreshedMeetings: Meeting[]) => {
            if (onMeetingUpdate) {
              onMeetingUpdate(refreshedMeetings);
            }
          })
          .catch((error: Error) => console.error("Background refresh failed:", error));
      }
    } catch (error: unknown) {
      console.error("Failed to end meeting:", error);
      
      // If the API call fails, revert to original state
      if (onMeetingUpdate) {
        onMeetingUpdate(meetings);
      }
      
      // Show error to user
      alert("Failed to end meeting. Please try again.");
    }
  };
  
  // Function to handle deleting a meeting with optimistic UI update
  const handleDeleteMeeting = async (event: React.MouseEvent, meetingId: string) => {
    event.stopPropagation(); // Prevent card click from triggering
    
    if (!username) return;
    
    // Create a new array without the deleted meeting
    const optimisticMeetings = meetings.filter(m => m.id !== meetingId);
    
    // Update UI immediately with optimistic data
    if (onMeetingUpdate) {
      onMeetingUpdate(optimisticMeetings);
    }
    
    // Make the actual API call
    try {
      await deleteMeeting(meetingId, username);
      
      // If successful, no need to do anything else - UI is already updated
    } catch (error: unknown) {
      console.error("Failed to delete meeting:", error);
      
      // If the API call fails, revert to original state
      if (onMeetingUpdate) {
        onMeetingUpdate(meetings);
      }
      
      // Show error to user
      alert("Failed to delete meeting. Please try again.");
    }
  };
  
  // Render skeleton cards if loading
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, index) => (
          <MeetingCardSkeleton key={index} />
        ))}
      </div>
    );
  }
  
  // Render actual meeting cards if data is loaded
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {meetings.map((meeting) => (
        <div key={meeting.id} className="relative w-full group">
          {/* Show controls based on meeting state */}
          {meeting.is_active ? (
            // Active meeting - show End button
            <div className="absolute top-3 right-3 flex items-center space-x-2 z-10">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 px-2 text-xs text-red-400 hover:bg-red-100 hover:text-red-600"
                onClick={(e) => handleEndMeeting(e, meeting.id)}
              >
                End
              </Button>
            </div>
          ) : (
            // Inactive meeting - show Delete button (hidden by default, visible on hover)
            <div className="absolute top-3 right-3 z-10 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-white hover:bg-gray-700 rounded-full"
                onClick={(e) => handleDeleteMeeting(e, meeting.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          <Card
            className="cursor-pointer hover:bg-secondary/50 transition-colors w-full"
            onClick={() => onMeetingSelect(meeting)}
          >
            <CardHeader>
              <CardTitle className="text-lg">{meeting.name}</CardTitle>
              <div className="flex flex-col space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>
                    {(() => {
                      // Check if we have both start and end times as dates
                      if (meeting.start_time && meeting.end_time) {
                        try {
                          // Try to parse both as dates (only for ISO format strings)
                          // For simple time format like "10:00 AM", use the existing date
                          const isStartISO = !/^\d{1,2}:\d{2}(?:\s?[AP]M)?$/i.test(meeting.start_time);
                          const isEndISO = !/^\d{1,2}:\d{2}(?:\s?[AP]M)?$/i.test(meeting.end_time);
                          
                          if (isStartISO && isEndISO) {
                            const startDate = new Date(meeting.start_time);
                            const endDate = new Date(meeting.end_time);
                            
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
                          }
                        } catch (e) {
                          // If parsing fails, fall back to original format
                          console.log("Error parsing dates:", e);
                        }
                      }
                      
                      // Fall back to original format with date from the meeting
                      return `${meeting.date} | ${formatMeetingTime(meeting.start_time)} - ${formatMeetingTime(meeting.end_time)}`;
                    })()}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>{meeting.participants.length} Participants</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex -space-x-2">
                {meeting.participants.slice(0, 4).map((participant, i) => (
                  <Avatar
                    key={i}
                    className={`border-2 border-background ${speakerColors[participant]}`}
                  >
                    <AvatarFallback>{participant[0]}</AvatarFallback>
                  </Avatar>
                ))}
                {meeting.participants.length > 4 && (
                  <Avatar className="border-2 border-background bg-secondary">
                    <AvatarFallback>
                      +{meeting.participants.length - 4}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}
