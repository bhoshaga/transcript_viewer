import React, { memo } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
         AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
         AlertDialogTitle } from './ui/alert-dialog';

const formatDateTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

const MeetingCard = memo(({ meeting, username, onUpdate, onClick }) => {
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const handleEndMeeting = async (e) => {
    e.stopPropagation();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://api.stru.ai/api/meetings/${meeting.id}/end`,
        {
          method: 'POST',
          headers: { 'X-Username': username }
        }
      );

      if (!response.ok) throw new Error('Failed to end meeting');

      onUpdate(prev => prev.map(m =>
        m.id === meeting.id
          ? { ...m, is_active: false, end_time: new Date().toISOString() }
          : m
      ));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e) => {
    if (e) e.stopPropagation();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://api.stru.ai/api/meetings/${meeting.id}`,
        {
          method: 'DELETE',
          headers: { 'X-Username': username }
        }
      );

      if (!response.ok) throw new Error('Failed to delete meeting');

      onUpdate(prev => prev.filter(m => m.id !== meeting.id));
      setShowDeleteDialog(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        onClick={onClick}
        className={`
          bg-gray-800 p-6 rounded-lg border transition-all duration-200 cursor-pointer
          hover:border-gray-600 relative overflow-hidden
          ${meeting.is_active ? 'border-green-500/50' : 'border-gray-700'}
        `}
      >
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-gray-100">
            {meeting.name}
          </h3>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-400">
            <span>Created by</span>
            <span className="text-gray-300">{meeting.creator}</span>
          </div>

          <div className="flex justify-between text-gray-400">
            <span>Status</span>
            <span className={meeting.is_active ? 'text-green-400' : 'text-gray-300'}>
              {meeting.is_active ? 'Active' : 'Ended'}
            </span>
          </div>

          <div className="flex justify-between text-gray-400">
            <span>Started</span>
            <span className="text-gray-300">
              {formatDateTime(meeting.start_time)}
            </span>
          </div>

          {meeting.end_time && (
            <div className="flex justify-between text-gray-400">
              <span>Ended</span>
              <span className="text-gray-300">
                {formatDateTime(meeting.end_time)}
              </span>
            </div>
          )}
        </div>

        {/* Status and Action Buttons */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {meeting.is_active && (
            <>
              <div className="flex items-center text-green-400 text-xs font-medium px-2 py-1 rounded-full bg-green-500/10">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-1.5 animate-pulse"></span>
                LIVE
              </div>
              {meeting.creator === username && (
                <button
                  onClick={handleEndMeeting}
                  disabled={loading}
                  className="px-3 py-1 text-sm font-medium rounded-full
                           bg-red-500/10 text-red-400 hover:bg-red-500/20
                           transition-colors disabled:opacity-50"
                >
                  {loading ? '...' : 'End'}
                </button>
              )}
            </>
          )}
          {!meeting.is_active && meeting.creator === username && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteDialog(true);
              }}
              disabled={loading}
              className="text-gray-500 hover:text-red-400 transition-colors"
            >
              ×
            </button>
          )}
        </div>

        {error && (
          <div className="mt-2 text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-gray-800 border border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-100">Delete Meeting</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete this meeting? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={loading}
              className="bg-gray-700 text-gray-100 hover:bg-gray-600"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-red-500 hover:bg-red-600"
            >
              {loading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}, (prevProps, nextProps) => {
  // Only re-render if these properties change
  return (
    prevProps.meeting.is_active === nextProps.meeting.is_active &&
    prevProps.meeting.end_time === nextProps.meeting.end_time &&
    JSON.stringify(prevProps.meeting.participants) === JSON.stringify(nextProps.meeting.participants)
  );
});

export default MeetingCard;