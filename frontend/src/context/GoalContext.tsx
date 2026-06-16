import {
  createContext, useContext, useState, useEffect, useCallback, ReactNode,
} from 'react';
import { Goal, CreateGoalInput } from '../types';
import * as goalApi from '../api/goals';

interface GoalContextType {
  goals:           Goal[];
  loading:         boolean;
  error:           string | null;
  getGoalForHabit: (habitId: string) => Goal | undefined;
  addGoal:         (input: CreateGoalInput) => Promise<void>;
  editGoal:        (id: string, data: Partial<Pick<CreateGoalInput, 'targetType' | 'targetValue'>>) => Promise<void>;
  removeGoal:      (id: string) => Promise<void>;
  clearError:      () => void;
}

const GoalContext = createContext<GoalContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function GoalProvider({ children }: { children: ReactNode }) {
  const [goals,   setGoals]   = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    goalApi.getGoals()
      .then(data  => { if (alive) setGoals(data); })
      .catch(()   => { if (alive) setError('Failed to load goals.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const getGoalForHabit = useCallback(
    (habitId: string) => goals.find(g => g.habitId === habitId),
    [goals],
  );

  const addGoal = useCallback(async (input: CreateGoalInput) => {
    setError(null);
    try {
      const created = await goalApi.createGoal(input);
      setGoals(prev => [...prev, created]);
    } catch {
      setError('Could not save goal. Please try again.');
      throw new Error('create failed');
    }
  }, []);

  const editGoal = useCallback(async (
    id: string,
    data: Partial<Pick<CreateGoalInput, 'targetType' | 'targetValue'>>,
  ) => {
    setError(null);
    try {
      const updated = await goalApi.updateGoal(id, data);
      setGoals(prev => prev.map(g => (g._id === id ? updated : g)));
    } catch {
      setError('Could not update goal. Please try again.');
      throw new Error('update failed');
    }
  }, []);

  const removeGoal = useCallback(async (id: string) => {
    setGoals(prev => prev.filter(g => g._id !== id)); // optimistic
    try {
      await goalApi.deleteGoal(id);
    } catch {
      setError('Could not delete goal.');
    }
  }, []);

  return (
    <GoalContext.Provider value={{
      goals, loading, error,
      getGoalForHabit, addGoal, editGoal, removeGoal, clearError,
    }}>
      {children}
    </GoalContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useGoalContext(): GoalContextType {
  const ctx = useContext(GoalContext);
  if (!ctx) throw new Error('useGoalContext must be inside GoalProvider');
  return ctx;
}
