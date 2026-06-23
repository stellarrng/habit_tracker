import { useMemo } from 'react';
import { CheckIn } from '../types';
import { calcCurrentStreak, calcLongestStreak, calcTotalCompletions, calcCompletionRate } from '../utils/streakCalculator';

interface StreakData {
  current:        number;
  longest:        number;
  totalSessions:  number;
  completionRate: number; // last 7 days, 0-100
}

export function useStreaks(checkIns: CheckIn[]): StreakData {
  return useMemo(() => ({
    current:        calcCurrentStreak(checkIns),
    longest:        calcLongestStreak(checkIns),
    totalSessions:  calcTotalCompletions(checkIns),
    completionRate: calcCompletionRate(checkIns, 7),
  }), [checkIns]);
}
