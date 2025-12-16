import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, onAuthStateChanged, getRedirectResult } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  refreshToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  refreshToken: async () => null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshToken = useCallback(async (): Promise<string | null> => {
    if (!user) return null;
    const newToken = await user.getIdToken(true);
    setToken(newToken);
    return newToken;
  }, [user]);

  // Handle redirect result on mount
  useEffect(() => {
    console.log('[Auth] Checking redirect result...');
    getRedirectResult(auth)
      .then(async (result) => {
        console.log('[Auth] Redirect result:', result);
        if (result?.user) {
          console.log('[Auth] Redirect result user:', result.user.email);
          setUser(result.user);
          const idToken = await result.user.getIdToken();
          setToken(idToken);
          setLoading(false);
        } else {
          console.log('[Auth] No redirect result (user came directly to page)');
        }
      })
      .catch((error) => {
        console.error('[Auth] Redirect result error:', error.code, error.message);
      });
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('[Auth] Auth state changed:', firebaseUser?.email || 'null');
      setUser(firebaseUser);
      if (firebaseUser) {
        const idToken = await firebaseUser.getIdToken();
        setToken(idToken);
      } else {
        setToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Refresh token every 55 minutes (tokens expire after 1 hour)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      const newToken = await user.getIdToken(true);
      setToken(newToken);
    }, 55 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, token, loading, refreshToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
