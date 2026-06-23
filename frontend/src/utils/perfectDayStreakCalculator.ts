import type { CheckIn, Habit, WeekDay } from '../types';

const ISO_WEEKDAY_TO_LABEL: WeekDay[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function isHabitScheduledOn(habit: Habit, dateISO: string): boolean {
  if (habit.frequency === 'Daily') return true;
  const date = new Date(dateISO + 'T00:00:00');
  const weekdayLabel = ISO_WEEKDAY_TO_LABEL[date.getDay()];
  return habit.specificDays.includes(weekdayLabel);
}

/**
 * Returns the current consecutive "perfect day" streak — the number of
 * days in a row (counting backwards from today) where EVERY active habit
 * scheduled for that day was fully completed (completedCount >= targetPerDay).
 *
 * Rules:
 * - Days with no scheduled habits are skipped (neutral — neither breaks
 *   nor extends the streak).
 * - Today is lenient: if today isn't fully done yet, we don't break the
 *   streak for it — we just check yesterday instead.
 * - Only habits with status "Active" are considered.
 * - Walks back up to 366 days maximum.
 */
export function calcPerfectDayStreak(
  allCheckIns: CheckIn[],
  habits: Habit[],
  todayISO: string,
): number {
  const activeHabits = habits.filter(h => h.status === 'Active');
  if (!activeHabits.length) return 0;

  // Group check-ins by date → habitId for O(1) lookup
  const checkInsByDate = new Map<string, Map<string, CheckIn>>();
  for (const c of allCheckIns) {
    if (!checkInsByDate.has(c.date)) checkInsByDate.set(c.date, new Map());
    checkInsByDate.get(c.date)!.set(c.habitId, c);
  }

  let streak = 0;
  const anchor = new Date(todayISO + 'T00:00:00');

  for (let i = 0; i < 366; i++) {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() - i);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const scheduledHabits = activeHabits.filter(h =>
      dateKey >= h.createdAt.toString().slice(0, 10) &&
      isHabitScheduledOn(h, dateKey)
    );
    
    // No habits scheduled this day — neutral, skip without breaking
    if (scheduledHabits.length === 0) continue;

    const dayCheckIns = checkInsByDate.get(dateKey);
    const allCompleted = scheduledHabits.every(habit => {
      const checkIn = dayCheckIns?.get(habit._id);
      return checkIn != null && checkIn.completedCount >= habit.targetPerDay;
    });

    if (allCompleted) {
      streak++;
    } else if (i === 0) {
      // Today isn't fully done yet — don't penalise, check yesterday
      continue;
    } else {
      break;
    }
  }

  return streak;
}