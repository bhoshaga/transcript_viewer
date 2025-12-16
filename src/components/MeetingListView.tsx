import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Clock, Users, X } from "lucide-react";
import { Meeting } from "../types";
import { speakerColors } from "../data/meetings";
import { archiveMeeting } from "../apis/meetings";
import { Button } from "./ui/button";
import { Skeleton } from "../components/ui/skeleton";

interface MeetingListViewProps {
  meetings: Meeting[];
  onMeetingSelect: (meeting: Meeting) => void;
  onMeetingUpdate?: (updatedMeetings: Meeting[]) => void;
  isLoading?: boolean;
}

// Helper function to format meeting time
const formatMeetingTime = (timestamp?: number) => {
  if (!timestamp) return "—";

  const date = new Date(timestamp);
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Format duration in seconds to human readable
const formatDuration = (seconds?: number) => {
  if (!seconds) return "";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h ${remainingMins}m`;
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

  // Function to handle archiving (deleting) a meeting
  const handleArchiveMeeting = async (event: React.MouseEvent, meetingId: string) => {
    event.stopPropagation();

    // Optimistic update
    const optimisticMeetings = meetings.filter(m => m.id !== meetingId);
    if (onMeetingUpdate) {
      onMeetingUpdate(optimisticMeetings);
    }

    try {
      await archiveMeeting(meetingId);
    } catch (error) {
      console.error("Failed to archive meeting:", error);
      // Revert on error
      if (onMeetingUpdate) {
        onMeetingUpdate(meetings);
      }
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

  // Render actual meeting cards
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {meetings.map((meeting) => (
        <div key={meeting.id} className="relative w-full group">
          {/* Live indicator for active meetings */}
          {!meeting.hasEnded && (
            <div className="absolute top-3 right-3 flex items-center space-x-2 z-10">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-muted-foreground">Live</span>
            </div>
          )}

          {/* Delete button for ended meetings */}
          {meeting.hasEnded && (
            <div className="absolute top-3 right-3 z-10 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-white hover:bg-gray-700 rounded-full"
                onClick={(e) => handleArchiveMeeting(e, meeting.id)}
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
              <CardTitle className="text-lg">{meeting.title}</CardTitle>
              <div className="flex flex-col space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>
                    {formatMeetingTime(meeting.created)}
                    {meeting.duration && ` (${formatDuration(meeting.duration)})`}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>{meeting.participants.length} Participants</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs px-2 py-1 bg-secondary rounded">
                    {meeting.platform.replace('_', ' ')}
                  </span>
                  {meeting.hasAiOutputs && (
                    <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded">
                      AI
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex -space-x-2">
                {meeting.participants.slice(0, 4).map((participant, i) => (
                  <Avatar
                    key={i}
                    className={`border-2 border-background ${speakerColors[participant.name] || 'bg-primary'}`}
                  >
                    <AvatarFallback>{participant.name[0]}</AvatarFallback>
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
