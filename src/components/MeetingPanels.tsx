import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { Plus, Trash2 } from "lucide-react"
import { ActionItem, Message } from '../types'
import { speakerColors } from '../data/meetings'
import { cn } from '../lib/utils'
import { ScrollArea } from "./ui/scroll-area"

interface ActionItemsProps {
  items: ActionItem[];
  newItem: string;
  onNewItemChange: (value: string) => void;
  onAddItem: () => void;
  onDeleteItem: (id: string) => void;
  onEditItem: (id: string, content: string) => void;
  onSetEditing: (items: ActionItem[]) => void;
}

export function ActionItems({
  items,
  newItem,
  onNewItemChange,
  onAddItem,
  onDeleteItem,
  onEditItem,
  onSetEditing
}: ActionItemsProps) {
  return (
    <Card className="flex flex-col flex-1 overflow-hidden">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle>Action Items</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <div className="p-4 space-y-4 flex flex-col h-full">
          <div className="flex space-x-2 items-center flex-shrink-0">
            <Input
              placeholder="Add new action item..."
              value={newItem}
              onChange={(e) => onNewItemChange(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && onAddItem()}
              className="flex-1 focus:ring-0 focus:outline-none focus:border-transparent"
            />
            <Button 
              onClick={onAddItem} 
              size="icon" 
              className="rounded-full shrink-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-start space-x-2 p-3 rounded-md bg-secondary/50 hover:bg-secondary"
                >
                  {item.isEditing ? (
                    <Input
                      defaultValue={item.content}
                      onBlur={(e) => onEditItem(item.id, e.target.value)}
                      autoFocus
                      className="focus:ring-0 focus:outline-none focus:border-transparent"
                    />
                  ) : (
                    <>
                      <p 
                        className="flex-1 leading-relaxed" 
                        onDoubleClick={() => onSetEditing(
                          items.map(i => i.id === item.id ? {...i, isEditing: true} : i)
                        )}
                      >
                        {item.content}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 -mt-1"
                        onClick={() => onDeleteItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}

interface SpeakerStatsProps {
  stats: Record<string, number>;
  messages: Message[];
}

// Helper function to convert call_time ("MM:SS") to seconds
const timeToSeconds = (time: string): number => {
  if (!time || !time.includes(':')) return 0;
  const [minutes, seconds] = time.split(':').map(Number);
  return minutes * 60 + seconds;
};

// Time formatting helper
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Helper function to get pastel colors for speakers
const getPastelColor = (speaker: string): string => {
  // Define a set of pastel colors (avoiding red and green)
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
  
  // Hash the speaker name to get a consistent index
  const hash = speaker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colorIndex = hash % pastelColors.length;
  
  return pastelColors[colorIndex];
};

export function SpeakerStats({ stats, messages }: SpeakerStatsProps) {
  // Add debug logging
  console.log("SpeakerStats received:", {
    statsCount: Object.keys(stats).length,
    messageCount: messages?.length,
    messagesSample: messages?.slice(0, 3).map(m => ({
      speaker: m.speaker,
      call_time: m.call_time,
      content: m.content?.substring(0, 30)
    }))
  });
  
  // Calculate total messages
  const totalMessages = Object.values(stats).reduce((sum, count) => sum + count, 0);
  
  // Calculate percentages based on message count
  const speakerPercentages = Object.entries(stats).map(([speaker, count]) => ({
    speaker,
    count,
    percentage: totalMessages > 0 ? Math.round((count / totalMessages) * 100) : 0
  }));

  // More debug logging
  console.log("Speaker percentages:", speakerPercentages);

  // Skip timeline processing if no messages
  if (!messages || messages.length === 0) {
    return (
      <Card className="flex flex-col overflow-hidden">
        <CardHeader className="flex-shrink-0">
          <CardTitle>Speaker Stats</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="p-4 max-h-[40vh]">
            <div className="space-y-4">
              {speakerPercentages.map(({ speaker, percentage }) => (
                <div key={speaker} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{speaker}</span>
                    <span className="text-muted-foreground">
                      {percentage}%
                    </span>
                  </div>
                  <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${getPastelColor(speaker)}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  // Get the first and last message times to determine meeting duration
  const messagesWithTime = messages.filter(msg => msg.call_time);
  console.log("Messages with time data:", messagesWithTime.length);
  
  if (messagesWithTime.length === 0) {
    return (
      <Card className="flex flex-col overflow-hidden">
        <CardHeader className="flex-shrink-0">
          <CardTitle>Speaker Stats</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="p-4 max-h-[40vh]">
            <div className="space-y-4">
              {speakerPercentages.map(({ speaker, percentage }) => (
                <div key={speaker} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{speaker}</span>
                    <span className="text-muted-foreground">
                      {percentage}%
                    </span>
                  </div>
                  <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${getPastelColor(speaker)}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="text-xs text-muted-foreground mt-2">Time data not available</div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  // Sort messages by call_time
  const sortedMessages = [...messagesWithTime].sort((a, b) => {
    const timeA = timeToSeconds(a.call_time || "0:00");
    const timeB = timeToSeconds(b.call_time || "0:00");
    return timeA - timeB;
  });

  // Get meeting start and end times in seconds
  const startTime = timeToSeconds(sortedMessages[0].call_time || "0:00");
  const endTime = timeToSeconds(sortedMessages[sortedMessages.length - 1].call_time || "0:00");
  const meetingDuration = endTime - startTime;
  
  console.log("Meeting duration:", {
    startTime,
    endTime,
    meetingDuration,
    startTimeFormatted: formatTime(startTime),
    endTimeFormatted: formatTime(endTime)
  });

  if (meetingDuration <= 0) {
    console.log("Invalid meeting duration detected");
    return (
      <Card className="flex flex-col overflow-hidden">
        <CardHeader className="flex-shrink-0">
          <CardTitle>Speaker Stats</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="p-4 max-h-[40vh]">
            <div className="space-y-4">
              {speakerPercentages.map(({ speaker, percentage }) => (
                <div key={speaker} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{speaker}</span>
                    <span className="text-muted-foreground">
                      {percentage}%
                    </span>
                  </div>
                  <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${getPastelColor(speaker)}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="text-xs text-muted-foreground mt-2">Unable to determine meeting duration</div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  // Change approach: Instead of grouping consecutive messages into segments,
  // we'll treat each message as a discrete speaking event with a short duration (e.g., 4 seconds)
  const SPEECH_DURATION = 2; // Each message represents 4 seconds of speech

  // Organize individual message markers by speaker
  const speakerMarkers: Record<string, Array<{time: number, content: string}>> = {};
  
  // Initialize markers object for each speaker
  Object.keys(stats).forEach(speaker => {
    speakerMarkers[speaker] = [];
  });
  
  // Add each message as a discrete marker
  sortedMessages.forEach(message => {
    const time = timeToSeconds(message.call_time || "0:00");
    
    if (!speakerMarkers[message.speaker]) {
      speakerMarkers[message.speaker] = [];
    }
    
    speakerMarkers[message.speaker].push({
      time,
      content: message.content || ""
    });
  });
  
  // Log speaker markers for debugging
  console.log("Speaker markers:", Object.entries(speakerMarkers).map(([speaker, markers]) => {
    return {
      speaker,
      markerCount: markers.length,
      sampleMarkers: markers.slice(0, 3).map(marker => ({
        time: formatTime(marker.time),
        position: ((marker.time - startTime) / meetingDuration * 100).toFixed(2) + "%"
      }))
    };
  }));

  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader className="flex-shrink-0">
        <CardTitle>Speaker Stats</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="p-4 max-h-[40vh]">
          <div className="space-y-4">
            {speakerPercentages.map(({ speaker, percentage }) => {
              // Get consistent pastel color for this speaker
              const speakerColor = getPastelColor(speaker);
              
              return (
                <div key={speaker} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{speaker}</span>
                    <span className="text-muted-foreground">
                      {percentage}%
                    </span>
                  </div>
                  <div className="h-2.5 bg-secondary rounded-full overflow-hidden relative">
                    {/* Each message is represented as a small fixed-width marker */}
                    {speakerMarkers[speaker]?.map((marker, idx) => {
                      const positionPercent = ((marker.time - startTime) / meetingDuration) * 100;
                      // Set width to represent approximately 4 seconds or a minimum width
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
                          title={`${speaker}: ${formatTime(marker.time)} - "${marker.content.substring(0, 30)}${marker.content.length > 30 ? '...' : ''}"`}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}