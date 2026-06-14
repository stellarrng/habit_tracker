import { CheckIn } from '../types';

/**
 * Returns the current consecutive streak (days) from an array of check-ins.
 * A day "counts" when completedCount > 0 (i.e. at least one completion).
 */
export function calcCurrentStreak(checkIns: CheckIn[]): number {
  if (!checkIns.length) return 0;

  // Build a Set of "YYYY-MM-DD" strings where the habit was completed
  const doneDays = new Set(
    checkIns.filter(c => c.completedCount > 0).map(c => c.date),
  );

  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 366; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);

    if (doneDays.has(key)) {
      streak++;
    } else if (i === 0) {
      // If today has no check-in yet, don't break — check yesterday
      continue;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Returns the longest consecutive streak ever recorded.
 */
export function calcLongestStreak(checkIns: CheckIn[]): number {
  if (!checkIns.length) return 0;

  const doneDays = Array.from(
    new Set(checkIns.filter(c => c.completedCount > 0).map(c => c.date)),
  ).sort(); // ascending

  if (!doneDays.length) return 0;

  let longest = 1;
  let current = 1;

  for (let i = 1; i < doneDays.length; i++) {
    const prev = new Date(doneDays[i - 1]);
    const curr = new Date(doneDays[i]);
    const diffDays = (curr.getTime() - prev.getTime()) / 86_400_000;
    if (diffDays === 1) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  return longest;
}

/**
 * Returns total completed sessions (sum of completedCount across all check-ins).
 */
export function calcTotalCompletions(checkIns: CheckIn[]): number {
  return checkIns.reduce((sum, c) => sum + c.completedCount, 0);
}

/**
 * Returns completion rate as a 0-100 percentage for the last N days.
 */
export function calcCompletionRate(checkIns: CheckIn[], days = 7): number {
  if (!days) return 0;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const recent = checkIns.filter(c => new Date(c.date) >= cutoff);
  if (!recent.length) return 0;
  const done = recent.filter(c => c.completedCount > 0).length;
  return Math.round((done / days) * 100);
}
