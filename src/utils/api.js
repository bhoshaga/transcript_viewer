const BASE_URL = process.env.REACT_APP_ENV === 'production' 
  ? 'https://api.stru.ai' 
  : 'http://localhost:8000';

// Common fetch options for all requests
const createFetchOptions = (method, username, body = null) => {
  const options = {
    method,
    credentials: 'include',  // Important for CORS with credentials
    headers: {
      'Content-Type': 'application/json',
      'X-Username': username,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  return options;
};

const handleResponse = async (response) => {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || response.statusText);
  }
  return response.json();
};

const API = {
  login: async (username) => {
    const response = await fetch(`${BASE_URL}/api/auth/login`, 
      createFetchOptions('POST', username, { username })
    );
    return handleResponse(response);
  },

  logout: async (username) => {
    const response = await fetch(`${BASE_URL}/api/auth/logout`,
      createFetchOptions('POST', username, { username })
    );
    return handleResponse(response);
  },

  getUserMeetings: async (username) => {
    const response = await fetch(`${BASE_URL}/api/meetings/user`,
      createFetchOptions('GET', username)
    );
    return handleResponse(response);
  },

  createMeeting: async (name, creator) => {
    const response = await fetch(`${BASE_URL}/api/meetings/create`,
      createFetchOptions('POST', creator, { name, creator })
    );
    return handleResponse(response);
  },

  joinMeeting: async (meetingId, username) => {
    const response = await fetch(`${BASE_URL}/api/meetings/${meetingId}/participants/add`,
      createFetchOptions('POST', username, { username, meeting_id: meetingId })
    );
    return handleResponse(response);
  },

  endMeeting: async (meetingId, username) => {
    const response = await fetch(`${BASE_URL}/api/meetings/${meetingId}/end`,
      createFetchOptions('POST', username)
    );
    return handleResponse(response);
  },
};

export default API;