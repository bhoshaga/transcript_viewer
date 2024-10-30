const BASE_URL = 'https://api.stru.ai' 

const API = {
  login: async (username) => {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username }),
    });
    if (!response.ok) throw new Error('Login failed');
    return response.json();
  },

  logout: async (username) => {
    const response = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username }),
    });
    if (!response.ok) throw new Error('Logout failed');
    return response.json();
  },

  getUserMeetings: async (username) => {
    const response = await fetch(`${BASE_URL}/api/meetings/user`, {
      headers: {
        'X-Username': username,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch meetings');
    return response.json();
  },

  joinMeeting: async (meetingId, username) => {
    const response = await fetch(`${BASE_URL}/api/meetings/${meetingId}/participants/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Username': username,
      },
      body: JSON.stringify({
        username,
        meeting_id: meetingId,
      }),
    });
    if (!response.ok) throw new Error('Failed to join meeting');
    return response.json();
  },
};

export default API;