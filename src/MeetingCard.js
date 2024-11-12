// MeetingCard.js
import React, { useState } from 'react';

const MeetingCard = ({ meeting, username, onDelete, onEndMeeting, onClick }) => {
  const [isEnding, setIsEnding] = useState(false);

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    onDelete(meeting);
  };

  const handleEndMeetingClick = async (e) => {
    e.stopPropagation();
    setIsEnding(true);
    await onEndMeeting(meeting);
    setIsEnding(false);
  };

  return (
    <div
      className={`meeting-card ${meeting.is_active ? 'active' : 'ended'}`}
      onClick={onClick}
    >
      <div className="meeting-header">
        <div className="meeting-title-wrapper">
          <h2>{meeting.name}</h2>
          {meeting.is_active && (
            <div className="live-indicator">
              <span className="pulse-dot"></span>
              LIVE
            </div>
          )}
        </div>
        {meeting.creator === username && (
          meeting.is_active ? (
            <button
              className="end-meeting-button"
              onClick={handleEndMeetingClick}
              disabled={isEnding}
              title="End meeting"
              aria-label="End meeting"
            >
              {isEnding ? '...' : 'End'} {/* Using a stop symbol or you could use 'End' */}
            </button>
          ) : (
            <button
              className="delete-button"
              onClick={handleDeleteClick}
              title="Delete meeting"
              aria-label="Delete meeting"
            >
              ×
            </button>
          )
        )}
      </div>
      <div className="meeting-info">
        <p>
          <span>Created by</span>
          <span>{meeting.creator}</span>
        </p>
        <p>
          <span>Participants</span>
          <span>{meeting.participant_count}</span>
        </p>
        <p>
          <span>Status</span>
          <span>{meeting.is_active ? 'Active' : 'Ended'}</span>
        </p>
        <p>
          <span>Started</span>
          <span>{new Date(meeting.start_time).toLocaleString()}</span>
        </p>
        {meeting.end_time && (
          <p>
            <span>Ended</span>
            <span>{new Date(meeting.end_time).toLocaleString()}</span>
          </p>
        )}
        {meeting.end_reason && (
          <p>
            <span>End Reason</span>
            <span>{meeting.end_reason}</span>
          </p>
        )}
      </div>
    </div>
  );
};

export default MeetingCard;
