import { useState, useEffect, useCallback } from "react";
import type { Habit, CheckIn, Goal, CheckInStatus, WeekStripDay, WeekDay } from "../../types";
import { getCheckInsByDate, upsertCheckIn } from "../../api/checkins";
import { getGoals } from "../../api/goals";
import styles from "./TodayPage.module.css";
import WeekStrip from "@/components/WeekStrip/WeekStrip";
import AppLayout from "@/components/layout/AppLayout";
import { useHabitContext } from "../../context/HabitContext";
import { useNavigate } from "react-router-dom";
import HabitCategoryIcon from "@/components/shared/HabitCategoryIcon";

// ── Types ─────────────────────────────────────────────────────────────────────

interface HabitWithCheckIn {
  habit: Habit;
  checkIn: CheckIn;
  goal: Goal | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function deriveStatus(completedCount: number, targetPerDay: number): CheckInStatus {
  if (completedCount <= 0) return "Not Started";
  if (completedCount >= targetPerDay) return "Completed";
  return "In Progress";
}

function buildWeekDays(todayStr: string): WeekStripDay[] {
  const today = new Date(todayStr + "T00:00:00");
  const mondayOffset = (today.getDay() + 6) % 7;
  const labels: WeekDay[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - mondayOffset + i);

    return {
      label: labels[d.getDay()],
      date: d.getDate(),
      iso: formatLocalDate(d),
    };
  });
}

function greeting(name: string) {
  const h = new Date().getHours();
  const time = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
  return `Good ${time}, ${name}!`;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className={styles.skeletonRow}>
      <div className={styles.skeletonLeft}>
        <div className={`${styles.skeletonBox} ${styles.skeletonIcon}`} />
        <div className={styles.skeletonLines}>
          <div className={`${styles.skeletonBox} ${styles.skeletonTitle}`} />
          <div className={`${styles.skeletonBox} ${styles.skeletonSub}`} />
        </div>
      </div>
      <div className={`${styles.skeletonBox} ${styles.skeletonCounter}`} />
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.skeletonHeader}>
          <div className={`${styles.skeletonBox} ${styles.skeletonGreeting}`} />
          <div className={`${styles.skeletonBox} ${styles.skeletonSub}`} />
        </div>
        <div className={`${styles.skeletonBox} ${styles.skeletonProgress}`} />
        <div className={styles.skeletonWeek}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className={`${styles.skeletonBox} ${styles.skeletonDay}`} />
          ))}
        </div>
        <div className={styles.habitList}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusLine({ status, completedCount, targetPerDay, goal }: {
  status: CheckInStatus;
  completedCount: number;
  targetPerDay: number;
  goal: Goal | null;
}) {
  // ── Completed ──────────────────────────────────────────────────────────────
  if (status === "Completed") {
    // Show goal progress underneath the completed state
    if (goal?.targetType === "Streak") {
      const mockCurrentStreak = 5; // TODO: derive from real check-in history
      return (
        <span className={`${styles.statusLine} ${styles.statusCompleted}`}>
          <span className={styles.statusDot} />
          Done · 🔥 {mockCurrentStreak} day streak
        </span>
      );
    }
    if (goal?.targetType === "Total Completions") {
      // Mock: assume completedCount today counts toward total
      const mockTotalSoFar = 14; // TODO: derive from all-time check-ins
      const remaining = Math.max(0, goal.targetValue - mockTotalSoFar);
      return (
        <span className={`${styles.statusLine} ${styles.statusCompleted}`}>
          <span className={styles.statusDot} />
          Done · {remaining > 0 ? `${remaining} more to goal` : "Goal reached! 🎉"}
        </span>
      );
    }
    // No goal — just show completed
    return (
      <span className={`${styles.statusLine} ${styles.statusCompleted}`}>
        <span className={styles.statusDot} />
        Completed
      </span>
    );
  }

  // ── Not Started ────────────────────────────────────────────────────────────
  if (status === "Not Started") {
    if (goal?.targetType === "Streak") {
      return (
        <span className={`${styles.statusLine} ${styles.statusAtRisk}`}>
          ⚠ At risk of breaking streak
        </span>
      );
    }
    if (goal?.targetType === "Total Completions") {
      const mockTotalSoFar = 14;
      const remaining = Math.max(0, goal.targetValue - mockTotalSoFar);
      return (
        <span className={`${styles.statusLine} ${styles.statusNotStarted}`}>
          {remaining > 0 ? `${remaining} more to reach goal` : "Goal reached! 🎉"}
        </span>
      );
    }
    return (
      <span className={`${styles.statusLine} ${styles.statusAtRisk}`}>
        ⚠ Not started
      </span>
    );
  }

  // ── In Progress ────────────────────────────────────────────────────────────
  if (goal?.targetType === "Streak") {
    const mockCurrentStreak = 5;
    return (
      <span className={`${styles.statusLine} ${styles.statusInProgress}`}>
        🔥 {mockCurrentStreak} day streak · {targetPerDay - completedCount} left today
      </span>
    );
  }
  if (goal?.targetType === "Total Completions") {
    const mockTotalSoFar = 14;
    const remaining = Math.max(0, goal.targetValue - mockTotalSoFar);
    return (
      <span className={`${styles.statusLine} ${styles.statusInProgress}`}>
        {remaining > 0 ? `${remaining} more to goal` : "Goal reached!"} · {targetPerDay - completedCount} left today
      </span>
    );
  }
  return (
    <span className={`${styles.statusLine} ${styles.statusInProgress}`}>
      In Progress · {targetPerDay - completedCount} left
    </span>
  );
}

function HabitRow({ row, onIncrement, onDecrement, isPending }: {
  row: HabitWithCheckIn;
  onIncrement: (row: HabitWithCheckIn) => void;
  onDecrement: (row: HabitWithCheckIn) => void;
  isPending: boolean;
}) {
  const { habit, checkIn, goal } = row;
  const status = deriveStatus(checkIn.completedCount, habit.targetPerDay);
  const isCompleted = status === "Completed";
  const isAtRisk = status === "Not Started";
  const isBinary = habit.targetPerDay === 1;

  const progress = Math.min((checkIn.completedCount / habit.targetPerDay) * 100, 100);

  const rowClass = [
    styles.habitRow,
    styles[`priority${habit.priority}`],
    isCompleted ? styles.habitRowCompleted : "",
    isAtRisk ? styles.habitRowAtRisk : "",
  ].join(" ");

  return (
    <div className={rowClass}>
      <div
        className={styles.habitProgressFill}
        style={{ width: `${progress}%` }}
      />
      <div className={styles.habitLeft}>
        <HabitCategoryIcon
          category={habit.category}
          size={40}
          completed={isCompleted}
        />
        <div className={styles.habitInfo}>
          <div className={styles.habitNameRow}>
            <span className={styles.habitName}>{habit.name}</span>
            <span
              className={`${styles.priorityBadge} ${styles[`priorityBadge${habit.priority}`]
                }`}
            >
              {habit.priority.toUpperCase()}
            </span>
          </div>
          <StatusLine
            status={status}
            completedCount={checkIn.completedCount}
            targetPerDay={habit.targetPerDay}
            goal={goal}
          />
        </div>
      </div>
      <div className={styles.counter}>
        {isBinary ? (
          <button
            className={`${styles.checkBtn} ${checkIn.completedCount > 0 ? styles.checkBtnDone : ""}`}
            onClick={() => checkIn.completedCount > 0 ? onDecrement(row) : onIncrement(row)}
            disabled={isPending}
            aria-label={checkIn.completedCount > 0 ? `Undo ${habit.name}` : `Complete ${habit.name}`}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3.5 9 7.5 13 14.5 5" />
            </svg>
          </button>
        ) : (
          <div className={styles.counterPill}>
            <button
              className={styles.counterBtn}
              onClick={() => onDecrement(row)}
              disabled={isPending || checkIn.completedCount <= 0}
              aria-label={`Decrease ${habit.name}`}
            >−</button>
            <span className={styles.counterValue}>
              {checkIn.completedCount}
              <span className={styles.counterTotal}> / {habit.targetPerDay}</span>
            </span>
            <button
              className={styles.counterBtn}
              onClick={() => onIncrement(row)}
              disabled={isPending || isCompleted}
              aria-label={`Increase ${habit.name}`}
            >+</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.min(percent, 100);
  return (
    <div className={styles.progressTrack}>
      <div
        className={styles.progressFill}
        style={{ width: `${clamped}%` }}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span className={styles.progressGlow} />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TODAY = formatLocalDate(new Date());

export default function TodayPage() {
  const { habits, loading: habitsLoading, error: habitsError } = useHabitContext();
  const [rows, setRows] = useState<HabitWithCheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const navigate = useNavigate();

  const [pendingId, setPendingId] = useState<string | null>(null); // habitId currently saving
  const [lastAction, setLastAction] = useState<{ habitId: string, delta: number; } | null>(null);

  const weekDays = buildWeekDays(TODAY);

  const priorityOrder = {
    High: 0,
    Medium: 1,
    Low: 2,
  };

  const activeHabits = rows
    .filter(r => r.habit.status === "Active")
    .sort(
      (a, b) =>
        priorityOrder[a.habit.priority] -
        priorityOrder[b.habit.priority]
    );
  const totalGoal = activeHabits.reduce((s, r) => s + r.habit.targetPerDay, 0);
  const totalDone = activeHabits.reduce((s, r) => s + Math.min(r.checkIn.completedCount, r.habit.targetPerDay), 0);
  const progressPct = totalGoal > 0 ? Math.round((totalDone / totalGoal) * 100) : 0;
  const pageError = error ?? habitsError;
  const isLoading = loading || habitsLoading;

  // ── Fetch today's data ──────────────────────────────────────────────────────

  const fetchData = useCallback(async (date: string) => {
    try {
      setLoading(true);
      setError(null);

      const activeHabits = habits.filter(h => h.status === "Active");
      const [checkIns, goals] = await Promise.all([
        getCheckInsByDate(date),
        getGoals(),
      ]);

      // For habits with no check-in today, create a default one optimistically
      const checkInMap = new Map(checkIns.map(c => [c.habitId, c]));
      const goalMap = new Map(goals.map(g => [g.habitId, g]));

      const combined: HabitWithCheckIn[] = activeHabits.map(habit => {
        const checkIn = checkInMap.get(habit._id) ?? {
          _id: "",
          userId: habit.userId,
          habitId: habit._id,
          date,
          completedCount: 0,
          status: "Not Started" as CheckInStatus,
          note: "",
        };
        return {
          habit,
          checkIn,
          goal: goalMap.get(habit._id) ?? null,
        };
      });

      setRows(combined);
    } catch (err) {
      console.error(err);
      setError("Failed to load habits. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [habits]);

  useEffect(() => {
    if (!habitsLoading) {
      fetchData(selectedDate);
    }
  }, [fetchData, habitsLoading, selectedDate]);

  // ── Update count ────────────────────────────────────────────────────────────

  async function updateCount(row: HabitWithCheckIn, delta: number, trackUndo = true) {
    const { habit, checkIn } = row;
    const raw = checkIn.completedCount + delta;
    const count = Math.max(0, delta > 0 ? Math.min(raw, habit.targetPerDay) : raw);

    // Optimistic update
    setRows(prev => prev.map(r =>
      r.habit._id !== habit._id
        ? r
        : {
          ...r,
          checkIn: {
            ...r.checkIn,
            completedCount: count,
            status: deriveStatus(count, habit.targetPerDay),
          },
        }
    ));

    if (trackUndo) {
      setLastAction({ habitId: habit._id, delta });
    }
    setPendingId(habit._id);

    try {
      // Backend uses upsert — always POST with full data
      const updated = await upsertCheckIn({
        habitId: habit._id,
        date: selectedDate,
        completedCount: count,
        note: checkIn.note,
      });
      // Sync with server response (gets real _id if it was a new check-in)
      setRows(prev => prev.map(r =>
        r.habit._id !== habit._id ? r : { ...r, checkIn: updated }
      ));
    } catch (err) {
      console.error(err);
      // Roll back on failure
      setRows(prev => prev.map(r =>
        r.habit._id !== habit._id ? r : { ...r, checkIn }
      ));
      setError("Failed to save. Please try again.");
    } finally {
      setPendingId(null);
    }
  }

  async function undoLast() {
    if (!lastAction) return;

    const row = rows.find(r => r.habit._id === lastAction.habitId);
    if (!row) return;

    const action = lastAction;
    setLastAction(null);
    await updateCount(row, -action.delta, false);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (pageError) return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.errorBox}>
          <p className={styles.errorText}>{pageError}</p>
          <button
            className={styles.retryBtn}
            onClick={() => {
              if (error) {
                fetchData(selectedDate);
                return;
              }
              window.location.reload();
            }}
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <AppLayout onNewHabit={() => navigate("/habits")}>
      {isLoading ? (
        <PageSkeleton />
      ) : (
        <div className={styles.page}>
          <div className={styles.container}>

            {/* Header */}
            <div className={styles.header}>
              <div>
                <h1 className={styles.greeting}>{greeting("Alex")}</h1>
                <p className={styles.subheading}>You're {progressPct}% of the way to your daily goal.</p>
              </div>
              {lastAction && (
                <button className={styles.undoBtn} onClick={undoLast}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M2 8a6 6 0 1 0 1.5-4L2 2" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="2,2 2,6 6,6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Undo last action
                </button>
              )}
            </div>

            <ProgressBar percent={progressPct} />

            {/* Week strip */}
            <WeekStrip
              days={weekDays}
              selectedDate={selectedDate}
              today={TODAY}
              onSelectDate={setSelectedDate}
            />

            {/* Habits */}
            <section>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>Active Habits</span>
                <span className={styles.sectionCount}>{activeHabits.length} items</span>
              </div>
              <div className={styles.habitList}>
                {activeHabits.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p>No active habits yet.</p>
                    <p>Create one to get started!</p>
                  </div>
                ) : (
                  activeHabits.map(row => (
                    <HabitRow
                      key={row.habit._id}
                      row={row}
                      onIncrement={r => updateCount(r, 1)}
                      onDecrement={r => updateCount(r, -1)}
                      isPending={pendingId === row.habit._id}
                    />
                  ))
                )}
              </div>
            </section>

            {/* Bottom cards */}
            <div className={styles.bottomCards}>
              <div className={styles.tipCard}>
                <div className={styles.tipHeader}>
                  <span>💡</span>
                  <span className={styles.tipTitle}>Consistency Tip</span>
                </div>
                <p className={styles.tipBody}>
                  Drinking water right after you wake up helps anchor your morning routine.
                </p>
              </div>

              <div className={styles.statsCard}>
                <div className={styles.statsHeader}>
                  <span>📊</span>
                  <span className={styles.statsTitle}>Today at a Glance</span>
                </div>
                <div className={styles.statsGrid}>
                  <div className={styles.statsItem}>
                    <span className={styles.statsValue}>{activeHabits.length}</span>
                    <span className={styles.statsLabel}>active habits</span>
                  </div>
                  <div className={styles.statsItem}>
                    <span className={styles.statsValue}>{progressPct}%</span>
                    <span className={styles.statsLabel}>daily progress</span>
                  </div>
                  <div className={styles.statsItem}>
                    <span className={styles.statsValue}>{totalDone}</span>
                    <span className={styles.statsLabel}>goal points done</span>
                  </div>
                  <div className={styles.statsItem}>
                    <span className={styles.statsValue}>{Math.max(totalGoal - totalDone, 0)}</span>
                    <span className={styles.statsLabel}>left to reach target</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}