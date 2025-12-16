import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { MessageList } from '../components/MessageList';
import { Loader2 } from 'lucide-react';

interface SharedMeetingData {
  id: string;
  title: string;
  platform: string;
  duration: number;
  created: number;
  participants: Array<{
    name: string;
    analytics: { textLength: number; speechDuration?: number };
  }>;
  transcript: {
    blocks: Array<{
      messageId: string;
      speakerName: string;
      transcript: string;
      timestamp: number;
    }>;
  };
}

export default function SharedMeeting() {
  const { shareKey } = useParams<{ shareKey: string }>();
  const [meeting, setMeeting] = useState<SharedMeetingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shareKey) return;

    const fetchSharedMeeting = async () => {
      try {
        const apiUrl = process.env.REACT_APP_GRAPHQL_URL?.replace('/api/2/graphql', '') || '';
        const response = await fetch(`${apiUrl}/s/${shareKey}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('Meeting not found or link has expired.');
          } else {
            setError('Failed to load meeting.');
          }
          return;
        }

        const data = await response.json();
        setMeeting(data);
      } catch (err) {
        console.error('Error fetching shared meeting:', err);
        setError('Failed to load meeting.');
      } finally {
        setLoading(false);
      }
    };

    fetchSharedMeeting();
  }, [shareKey]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">{error || 'Meeting not found.'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const messages = meeting.transcript.blocks.map((block, index) => ({
    id: block.messageId || `msg-${index}`,
    speaker: block.speakerName,
    content: block.transcript,
    timestamp: String(block.timestamp),
  }));

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{meeting.title}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {meeting.participants.length} participants • {Math.round(meeting.duration / 60)} minutes
            </p>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transcript</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[70vh] overflow-auto">
            <MessageList
              messages={messages}
              hoveredDelete={null}
              onStar={() => {}}
              onDelete={() => {}}
              onHoverDelete={() => {}}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
