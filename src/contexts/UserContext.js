import { createContext, useContext, useState, useCallback } from 'react';
import API from '../utils/api';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(async (username) => {
    setIsLoading(true);
    setError(null);
    try {
      await API.login(username);
      setUser(username);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    if (user) {
      try {
        await API.logout(user);
      } catch (error) {
        console.error('Logout error:', error);
      } finally {
        setUser(null);
      }
    }
  }, [user]);

  return (
    <UserContext.Provider value={{ 
      user, 
      login, 
      logout, 
      isLoading, 
      error 
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}