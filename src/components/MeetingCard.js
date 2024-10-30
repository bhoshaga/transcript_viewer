import React from 'react';

const MeetingCard = ({ meeting, onJoin }) => {
  return (
    <div
      className={`meeting-card ${meeting.is_active ? 'active' : ''}`}
      onClick={() => onJoin(meeting)}
    >
      <h3>{meeting.displayName}</h3>
      {meeting.is_active && <div className="live-indicator" />}
      <div className="meeting-details">
        <p>Created by: {meeting.creator}</p>
        <p>Started: {new Date(meeting.start_time).toLocaleTimeString()}</p>
        {meeting.end_time && (
          <p>Ended: {new Date(meeting.end_time).toLocaleTimeString()}</p>
        )}
        <p>Participants: {meeting.participant_count}</p>
      </div>
    </div>
  );
};

export default MeetingCard;