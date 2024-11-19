import { API_BASE_URL } from '../config';

export const login = async (username) => {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Username': username
    },
    body: JSON.stringify({ username })
  });

  if (!response.ok) {
    throw new Error(await response.text() || 'Login failed');
  }

  return response.json();
};

export const logout = async (username) => {
  const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Username': username
    },
    body: JSON.stringify({ username })
  });

  if (!response.ok) {
    throw new Error(await response.text() || 'Logout failed');
  }

  return response.json();
};