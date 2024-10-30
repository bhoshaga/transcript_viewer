import React from 'react';
import MeetingCard from './MeetingCard';
import { useUser } from '../contexts/UserContext';

// Sample meeting names for demo
const SAMPLE_MEETING_NAMES = [
  'Weekly Strategy Sync',
  'Product Planning',
  'Customer Feedback Review',
  'Engineering Standup',
  'Marketing Campaign Sync',
  'Q4 Planning Session',
  'Team Retrospective',
  'Project Kickoff'
];

const MeetingList = ({ meetings, onJoinMeeting }) => {
  const { user, logout } = useUser();

  // Enrich meetings with display names
  const enrichedMeetings = meetings.map((meeting, index) => ({
    ...meeting,
    displayName: meeting.name || SAMPLE_MEETING_NAMES[index % SAMPLE_MEETING_NAMES.length]
  }));

  return (
    <div className="transcript-viewer">
      <div className="header">
        <h1>Meeting Transcripts</h1>
        <div className="user-info">
          <span>Logged in as {user}</span>
          <button className="control-button" onClick={logout}>Logout</button>
        </div>
      </div>

      <div className="meetings-grid">
        {enrichedMeetings.length === 0 ? (
          <div className="no-meetings">No available meetings found</div>
        ) : (
          enrichedMeetings.map((meeting) => (
            <MeetingCard
              key={meeting.id}
              meeting={meeting}
              onJoin={onJoinMeeting}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default MeetingList;