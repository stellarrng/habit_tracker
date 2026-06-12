import { useMemo } from 'react';
import { CheckIn, Goal } from '../types';
import { calcCurrentStreak, calcTotalCompletions } from '../utils/streakCalculator';

export type GoalStatus = 'none' | 'on-track' | 'near' | 'achieved';

interface GoalProgressResult {
  currentValue: number;
  pct:          number;
  status:       GoalStatus;
}

/**
 * Derives goal progress from raw check-ins + goal definition.
 * - 'Streak'            → tracks current streak vs targetValue
 * - 'Total Completions' → tracks sum of completedCount vs targetValue
 */
export function useGoalProgress(
  goal:     Goal | undefined,
  checkIns: CheckIn[],
): GoalProgressResult {
  return useMemo(() => {
    if (!goal) return { currentValue: 0, pct: 0, status: 'none' };

    const current =
      goal.targetType === 'Streak'
        ? calcCurrentStreak(checkIns)
        : calcTotalCompletions(checkIns);

    const pct = Math.min(Math.round((current / goal.targetValue) * 100), 100);

    let status: GoalStatus = 'on-track';
    if (pct >= 100) status = 'achieved';
    else if (pct >= 80) status = 'near';

    return { currentValue: current, pct, status };
  }, [goal, checkIns]);
}
