import React, { memo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Trash2 } from "lucide-react";
import { Meeting } from "../types";
import { getSpeakerColor } from "../data/meetings";
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

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }
  if (mins > 0) {
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  return `${secs}s`;
};

// Get first name from full name
const getFirstName = (name: string) => {
  return name.split(' ')[0];
};

// Format participants list with "you" for current user
const formatParticipants = (participants: { name: string }[]) => {
  const currentUser = localStorage.getItem("username") || "";

  const formatted = participants.map(p => {
    // Check if this participant is the current user (by name match)
    const isCurrentUser = currentUser &&
      (p.name.toLowerCase().includes(currentUser.toLowerCase()) ||
       currentUser.toLowerCase().includes(p.name.split(' ')[0].toLowerCase()));
    return isCurrentUser ? "you" : getFirstName(p.name);
  });

  if (formatted.length <= 3) {
    return formatted.join(", ");
  }

  const firstThree = formatted.slice(0, 3);
  const remaining = formatted.length - 3;
  return `${firstThree.join(", ")} and ${remaining} other${remaining > 1 ? 's' : ''}`;
};

// Skeleton card component for loading state
const MeetingCardSkeleton = memo(() => (
  <div className="relative w-full">
    <Card className="w-full overflow-hidden">
      <CardHeader className="p-3 pb-2">
        <Skeleton className="h-4 w-3/4 mb-2" />
        <div className="flex flex-col space-y-1.5">
          <div className="flex items-center space-x-1.5">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <div className="flex items-center space-x-1.5">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="flex -space-x-1.5">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-6 w-6 rounded-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
));
MeetingCardSkeleton.displayName = "MeetingCardSkeleton";

export const MeetingListView = memo(function MeetingListView({
  meetings,
  onMeetingSelect,
  onMeetingUpdate,
  isLoading = false
}: MeetingListViewProps) {

  // Function to handle archiving (deleting) a meeting
  const handleArchiveMeeting = useCallback(async (event: React.MouseEvent, meetingId: string) => {
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
  }, [meetings, onMeetingUpdate]);

  // Render skeleton cards if loading
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {[...Array(6)].map((_, index) => (
          <MeetingCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  // Render actual meeting cards
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {meetings.map((meeting) => (
        <div key={meeting.id} className="relative w-full group">
          <Card
            className="cursor-pointer bg-white/5 hover:bg-white/10 transition-colors duration-75 w-full shadow-md hover:shadow-lg border-white/10"
            onClick={() => onMeetingSelect(meeting)}
          >
            <CardHeader className="p-3 pb-2">
              <div className="flex items-center justify-between gap-2">
                {/* Left: Logo + Title */}
                <div className="flex items-center gap-2 min-w-0">
                  {meeting.platform === 'GOOGLE_MEET' && (
                    <img src="/google-meet.png" alt="Google Meet" className="h-5 w-5 flex-shrink-0" />
                  )}
                  <CardTitle className="text-base font-semibold leading-tight truncate">{meeting.title}</CardTitle>
                </div>
                {/* Right: Duration + Delete/Live */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {meeting.duration && (
                    <span className="text-base font-semibold text-foreground">{formatDuration(meeting.duration)}</span>
                  )}
                  {!meeting.hasEnded ? (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[10px] text-foreground">Live</span>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-white hover:bg-white/10 rounded"
                      onClick={(e) => handleArchiveMeeting(e, meeting.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex flex-col space-y-0.5 mt-1 text-xs text-muted-foreground pl-7">
                <span>{formatMeetingTime(meeting.created)}</span>
                <span>
                  {formatParticipants(meeting.participants)}
                  {meeting.hasAiOutputs && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded ml-1">
                      AI
                    </span>
                  )}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="flex -space-x-1.5">
                {meeting.participants.slice(0, 3).map((participant, i) => (
                  <Avatar
                    key={i}
                    className="h-6 w-6 border border-background"
                  >
                    <AvatarFallback className={`text-[10px] ${getSpeakerColor(participant.name)}`}>{participant.name[0]}</AvatarFallback>
                  </Avatar>
                ))}
                {meeting.participants.length > 3 && (
                  <Avatar className="h-6 w-6 border border-background bg-secondary">
                    <AvatarFallback className="text-[10px]">
                      +{meeting.participants.length - 3}
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
});
MeetingListView.displayName = "MeetingListView";
