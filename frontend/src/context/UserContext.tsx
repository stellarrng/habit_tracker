import {
  createContext, useContext, useState, useCallback, ReactNode,
} from 'react';
import { User } from '../types';
import { getMe } from '../api/auth';
import { useAuth } from './AuthContext';

interface UserContextType {
  profile:     User | null;
  loading:     boolean;
  error:       string | null;
  refreshUser: () => Promise<void>;
  clearError:  () => void;
}

const UserContext = createContext<UserContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
// Must be rendered inside <AuthProvider> so useAuth() is available.
export function UserProvider({ children }: { children: ReactNode }) {
  const { user, token, login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const fresh = await getMe();
      login(fresh, token);
    } catch {
      setError('Failed to refresh user profile.');
    } finally {
      setLoading(false);
    }
  }, [token, login]);

  return (
    <UserContext.Provider value={{
      profile: user,
      loading,
      error,
      refreshUser,
      clearError,
    }}>
      {children}
    </UserContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useUserContext(): UserContextType {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUserContext must be inside UserProvider');
  return ctx;
}
