import React from 'react';

const MeetingCard = ({ meeting, username, onDelete, onClick }) => {
  const handleDeleteClick = (e) => {
    e.stopPropagation();
    onDelete(meeting);
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
          <button
            className="delete-button"
            onClick={handleDeleteClick}
            title="Delete meeting"
            aria-label="Delete meeting"
          >
            ×
          </button>
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
      </div>
    </div>
  );
};

export default MeetingCard;