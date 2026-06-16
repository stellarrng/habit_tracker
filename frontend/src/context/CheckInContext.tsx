import {
  createContext, useContext, useState, useCallback, ReactNode,
} from 'react';
import { CheckIn, CreateCheckInInput } from '../types';
import * as checkInApi from '../api/checkins';

interface CheckInContextType {
  checkIns:      CheckIn[];
  loading:       boolean;
  error:         string | null;
  fetchByDate:   (date: string, habitId?: string) => Promise<void>;
  upsertCheckIn: (data: CreateCheckInInput) => Promise<CheckIn>;
  removeCheckIn: (id: string) => Promise<void>;
  clearError:    () => void;
}

const CheckInContext = createContext<CheckInContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function CheckInProvider({ children }: { children: ReactNode }) {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const fetchByDate = useCallback(async (date: string, habitId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await checkInApi.getCheckInsByDate(date, habitId);
      setCheckIns(data);
    } catch {
      setError('Failed to load check-ins.');
    } finally {
      setLoading(false);
    }
  }, []);

  const upsertCheckIn = useCallback(async (data: CreateCheckInInput): Promise<CheckIn> => {
    setError(null);
    try {
      const result = await checkInApi.upsertCheckIn(data);
      setCheckIns(prev => {
        const idx = prev.findIndex(c => c.habitId === data.habitId && c.date === data.date);
        return idx >= 0
          ? prev.map((c, i) => (i === idx ? result : c))
          : [...prev, result];
      });
      return result;
    } catch {
      setError('Could not save check-in. Please try again.');
      throw new Error('upsert failed');
    }
  }, []);

  const removeCheckIn = useCallback(async (id: string) => {
    setCheckIns(prev => prev.filter(c => c._id !== id)); // optimistic
    try {
      await checkInApi.deleteCheckIn(id);
    } catch {
      setError('Could not delete check-in.');
    }
  }, []);

  return (
    <CheckInContext.Provider value={{
      checkIns, loading, error,
      fetchByDate, upsertCheckIn, removeCheckIn, clearError,
    }}>
      {children}
    </CheckInContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useCheckInContext(): CheckInContextType {
  const ctx = useContext(CheckInContext);
  if (!ctx) throw new Error('useCheckInContext must be inside CheckInProvider');
  return ctx;
}
