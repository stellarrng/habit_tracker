import {
  createContext, useContext, useMemo, useCallback, ReactNode,
} from 'react';
import { Goal, CreateGoalInput } from '../types';
import { useHabitContext } from './HabitContext';

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
// Goals are stored as fields on the Habit document (goalTargetType / goalTargetValue).
// This context derives Goal objects from the already-loaded habits so there is a
// single source of truth and no separate Goal-collection API call is needed.
export function GoalProvider({ children }: { children: ReactNode }) {
  const { habits, loading, error, editHabit, clearError } = useHabitContext();

  const goals = useMemo<Goal[]>(() =>
    habits
      .filter(h => h.goalTargetType && h.goalTargetValue)
      .map(h => ({
        _id:         h._id,
        userId:      h.userId,
        habitId:     h._id,
        targetType:  h.goalTargetType!,
        targetValue: h.goalTargetValue!,
      })),
    [habits],
  );

  const getGoalForHabit = useCallback(
    (habitId: string) => goals.find(g => g.habitId === habitId),
    [goals],
  );

  // Saves goal by updating the parent habit's embedded fields.
  const addGoal = useCallback(async (input: CreateGoalInput) => {
    await editHabit(input.habitId, {
      goalTargetType:  input.targetType,
      goalTargetValue: input.targetValue,
    });
  }, [editHabit]);

  // id === habit._id (we use habit._id as the goal's synthetic _id).
  const editGoal = useCallback(async (
    id: string,
    data: Partial<Pick<CreateGoalInput, 'targetType' | 'targetValue'>>,
  ) => {
    await editHabit(id, {
      ...(data.targetType  !== undefined ? { goalTargetType:  data.targetType  } : {}),
      ...(data.targetValue !== undefined ? { goalTargetValue: data.targetValue } : {}),
    });
  }, [editHabit]);

  // Clears the goal from the habit.
  const removeGoal = useCallback(async (id: string) => {
    await editHabit(id, { goalTargetType: null, goalTargetValue: null });
  }, [editHabit]);

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
