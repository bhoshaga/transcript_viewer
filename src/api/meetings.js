import { API_BASE_URL } from '../config';

export const fetchUserMeetings = async (username) => {
  const response = await fetch(`${API_BASE_URL}/api/meetings/user`, {
    headers: {
      'X-Username': username
    }
  });

  if (!response.ok) {
    throw new Error(await response.text() || 'Failed to fetch meetings');
  }

  return response.json();
};

export const endMeeting = async (meetingId, username) => {
  const response = await fetch(`${API_BASE_URL}/api/meetings/${meetingId}/end`, {
    method: 'POST',
    headers: {
      'X-Username': username
    }
  });

  if (!response.ok) {
    throw new Error(await response.text() || 'Failed to end meeting');
  }

  return response.json();
};

export const deleteMeeting = async (meetingId, username) => {
  const response = await fetch(`${API_BASE_URL}/api/meetings/${meetingId}`, {
    method: 'DELETE',
    headers: {
      'X-Username': username
    }
  });

  if (!response.ok) {
    if (response.status === 409) {
      throw new Error('Cannot delete an active meeting');
    }
    throw new Error(await response.text() || 'Failed to delete meeting');
  }

  return response.json();
};

export const getMeetingTranscript = async (meetingId, username) => {
  const response = await fetch(`${API_BASE_URL}/api/meetings/${meetingId}/transcript`, {
    headers: {
      'X-Username': username
    }
  });

  if (!response.ok) {
    throw new Error(await response.text() || 'Failed to fetch transcript');
  }

  return response.json();
};