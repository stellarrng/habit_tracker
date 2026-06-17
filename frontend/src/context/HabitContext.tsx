import {
  createContext, useContext, useState, useEffect, useCallback,
  useMemo, ReactNode,
} from 'react';
import { Habit, HabitCategory, HabitFrequency, HabitPriority, HabitStatus, CreateHabitInput, UpdateHabitInput } from '../types';
import * as habitApi from '../api/habits';
import { useAuth } from './AuthContext';

// ─── Filter state ─────────────────────────────────────────────────────────
export interface FilterState {
  category:  HabitCategory  | 'All';
  frequency: HabitFrequency | 'All';
  priority:  HabitPriority  | 'All';
  status:    HabitStatus    | 'All';
  search:    string;
}

const DEFAULT_FILTERS: FilterState = {
  category: 'All', frequency: 'All', priority: 'All', status: 'All', search: '',
};

// ─── Context type ─────────────────────────────────────────────────────────
interface HabitContextType {
  habits:         Habit[];
  filteredHabits: Habit[];
  filters:        FilterState;
  loading:        boolean;
  error:          string | null;
  setFilters:     (f: Partial<FilterState>) => void;
  addHabit:       (input: CreateHabitInput) => Promise<void>;
  editHabit:      (id: string, input: UpdateHabitInput) => Promise<void>;
  removeHabit:    (id: string) => Promise<void>;
  changeStatus:   (id: string, status: HabitStatus) => Promise<void>;
  clearError:     () => void;
}

const HabitContext = createContext<HabitContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────
export function HabitProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [habits, setHabits]   = useState<Habit[]>([]);
  const [filters, _setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  // Fetch whenever the auth token changes (covers login and logout)
  useEffect(() => {
    if (!token) {
      setHabits([]);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    habitApi.getHabits()
      .then(data => { if (alive) setHabits(data); })
      .catch(() => { if (alive) setError('Failed to load habits.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [token]);

  const setFilters = useCallback((partial: Partial<FilterState>) => {
    _setFilters(prev => ({ ...prev, ...partial }));
  }, []);

  const clearError = useCallback(() => setError(null), []);

  // Derived: filtered habits (memo-ised to avoid re-renders)
  const filteredHabits = useMemo(() => {
    return habits.filter(h => {
      if (filters.category  !== 'All' && h.category  !== filters.category)  return false;
      if (filters.frequency !== 'All' && h.frequency !== filters.frequency) return false;
      if (filters.priority  !== 'All' && h.priority  !== filters.priority)  return false;
      
      // If status is 'All', exclude archived by default
      if (filters.status === 'All' && h.status === 'Archived') return false;
      // If status is specific, only match that status
      if (filters.status !== 'All' && h.status !== filters.status) return false;
      
      if (filters.search && filters.search.trim() !== '') {
        const query = filters.search.toLowerCase().trim();
        if (!h.name.toLowerCase().includes(query)) return false;
      }
      return true;
    });
  }, [habits, filters]);

  const addHabit = useCallback(async (input: CreateHabitInput) => {
    setError(null);
    try {
      const created = await habitApi.createHabit(input);
      setHabits(prev => [created, ...prev]);
    } catch {
      setError('Could not save habit. Please try again.');
      throw new Error('create failed');
    }
  }, []);

  const editHabit = useCallback(async (id: string, input: UpdateHabitInput) => {
    setError(null);
    try {
      const updated = await habitApi.updateHabit(id, input);
      setHabits(prev => prev.map(h => h._id === id ? updated : h));
    } catch {
      setError('Could not update habit. Please try again.');
      throw new Error('update failed');
    }
  }, []);

  const removeHabit = useCallback(async (id: string) => {
    setHabits(prev => prev.filter(h => h._id !== id)); // optimistic
    try {
      await habitApi.deleteHabit(id);
    } catch {
      // already removed locally — that's fine
    }
  }, []);

  const changeStatus = useCallback(async (id: string, status: HabitStatus) => {
    setHabits(prev => prev.map(h => h._id === id ? { ...h, status } : h)); // optimistic
    try {
      await habitApi.updateHabit(id, { status });
    } catch {
      // local already updated
    }
  }, []);

  return (
    <HabitContext.Provider value={{
      habits, filteredHabits, filters, loading, error,
      setFilters, addHabit, editHabit, removeHabit, changeStatus, clearError,
    }}>
      {children}
    </HabitContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────
export function useHabitContext(): HabitContextType {
  const ctx = useContext(HabitContext);
  if (!ctx) throw new Error('useHabitContext must be inside HabitProvider');
  return ctx;
}
