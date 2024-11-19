import React from 'react';
import MeetingCard from './MeetingCard';
import { Loader2 } from 'lucide-react';

const MeetingList = ({ meetings, loading, onSelect, username, onMeetingsUpdate }) => {
  if (loading && !meetings.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!meetings.length) {
    return (
      <div className="text-center py-16">
        <div className="text-gray-400 text-lg">No meetings available</div>
        <p className="text-gray-500 mt-2">
          Meetings will appear here once they are created
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {meetings.map((meeting) => (
        <MeetingCard
          key={meeting.id}
          meeting={meeting}
          username={username}
          onUpdate={onMeetingsUpdate}
          onClick={() => onSelect(meeting)}
        />
      ))}
      {loading && (
        <div className="fixed bottom-4 right-4 bg-blue-500/10 text-blue-400 
                      px-4 py-2 rounded-lg flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Refreshing...</span>
        </div>
      )}
    </div>
  );
};

export default React.memo(MeetingList);