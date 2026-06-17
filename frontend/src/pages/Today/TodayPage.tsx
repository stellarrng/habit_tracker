import { useState, useEffect, useCallback } from "react";
import type { CheckInStatus, WeekStripDay, WeekDay } from "../../types";
import { getCheckInsByDate, upsertCheckIn } from "../../api/checkins";
import { getGoals } from "../../api/goals";
import styles from "./TodayPage.module.css";
import AppLayout from "@/components/layout/AppLayout";
import { useHabitContext } from "../../context/HabitContext";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import WeekStrip from "@/components/today/WeekStrip";
import HabitRow, { deriveStatus, type HabitWithCheckIn } from "@/components/today/HabitRow";


// ── Helpers ───────────────────────────────────────────────────────────────────

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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

// ── ProgressBar ───────────────────────────────────────────────────────────────

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
  const { user } = useAuth();
  const { habits, loading: habitsLoading, error: habitsError } = useHabitContext();

  const [rows, setRows] = useState<HabitWithCheckIn[]>([]);          // selectedDate
  const [todayRows, setTodayRows] = useState<HabitWithCheckIn[]>([]); // always TODAY
  const [loading, setLoading] = useState(true);
  const [todayLoading, setTodayLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const navigate = useNavigate();

  const [pendingId, setPendingId] = useState<string | null>(null); // habitId currently saving
  const [lastAction, setLastAction] = useState<{ habitId: string, delta: number; } | null>(null);

  const weekDays = buildWeekDays(TODAY);

  const priorityOrder = { High: 0, Medium: 1, Low: 2 };


  // Habit list — reflects whatever date is selected
  const activeHabits = rows
    .filter(r => r.habit.status === "Active")
    .sort((a, b) => priorityOrder[a.habit.priority] - priorityOrder[b.habit.priority]);


  // Progress bar + stats card — ALWAYS reflect today, never selectedDate
  const todayActiveHabits = todayRows.filter(r => r.habit.status === "Active");
  const totalGoal = todayActiveHabits.reduce((s, r) => s + r.habit.targetPerDay, 0);
  const totalDone = todayActiveHabits.reduce((s, r) => s + Math.min(r.checkIn.completedCount, r.habit.targetPerDay), 0);
  const progressPct = totalGoal > 0 ? Math.round((totalDone / totalGoal) * 100) : 0;

  const pageError = error ?? habitsError;
  const isInitialLoading = habitsLoading;

  // ── Fetch habits data based on selected date and today ──────────────────────

  const buildRows = useCallback(async (date: string): Promise<HabitWithCheckIn[]> => {
    const activeHabitsList = habits.filter(h => h.status === "Active");
    const [checkIns, goals] = await Promise.all([
      getCheckInsByDate(date),
      getGoals(),
    ]);

    const checkInMap = new Map(checkIns.map(c => [c.habitId, c]));
    const goalMap = new Map(goals.map(g => [g.habitId, g]));

    return activeHabitsList.map(habit => {
      const checkIn = checkInMap.get(habit._id) ?? {
        _id: "",
        userId: habit.userId,
        habitId: habit._id,
        date,
        completedCount: 0,
        status: "Not Started" as CheckInStatus,
        note: "",
      };
      return { habit, checkIn, goal: goalMap.get(habit._id) ?? null };
    });
  }, [habits]);

  // Fetch for whichever date is selected (drives the habit list)
  const fetchSelectedDate = useCallback(async (date: string) => {
    try {
      setLoading(true);
      setError(null);
      const combined = await buildRows(date);
      setRows(combined);
    } catch (error) {
      console.error(error);
      setError("Failed to load habits. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [buildRows]);

  // Fetch TODAY specifically (drives progress bar + stats card)
  const fetchToday = useCallback(async () => {
    try {
      setTodayLoading(true);
      const combined = await buildRows(TODAY);
      setTodayRows(combined);
    } catch (err) {
      console.error(err);
      // Don't block the page on this — today stats just won't update
    } finally {
      setTodayLoading(false);
    }
  }, [buildRows]);

  // Fetch today's snapshot once habits are ready (for progress bar + stats)
  useEffect(() => {
    if (!habitsLoading) {
      fetchToday();
    }
  }, [habitsLoading, fetchToday]);

  // Fetch selected date's habits whenever it changes (for the habit list)
  useEffect(() => {
    if (!habitsLoading) {
      fetchSelectedDate(selectedDate);
    }
  }, [habitsLoading, selectedDate, fetchSelectedDate]);

  // ── Update count ────────────────────────────────────────────────────────────

  async function updateCount(row: HabitWithCheckIn, delta: number, trackUndo = true) {
    const { habit, checkIn } = row;
    const raw = checkIn.completedCount + delta;
    const count = Math.max(0, delta > 0 ? Math.min(raw, habit.targetPerDay) : raw);
    const isToday = selectedDate === TODAY;

    // Optimistic update — habit list (always, since the row being edited is in `rows`)
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

    // Optimistic update — today snapshot too, ONLY if we're actually editing today
    if (isToday) {
      setTodayRows(prev => prev.map(r =>
        r.habit._id !== habit._id
          ? r
          : {
            ...r,
            checkIn: {
              ...r.checkIn,
              completedCount: count,
              status: deriveStatus(count, habit.targetPerDay),
            }
          }
      ))
    }

    if (trackUndo) setLastAction({ habitId: habit._id, delta });
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
      setRows(prev => prev.map(r => r.habit._id !== habit._id ? r : { ...r, checkIn: updated }));
      if (isToday) {
        setTodayRows(prev => prev.map(r => r.habit._id !== habit._id ? r : { ...r, checkIn: updated }));
      }
    } catch (err) {
      console.error(err);
      // Roll back on failure
      setRows(prev => prev.map(r => r.habit._id !== habit._id ? r : { ...r, checkIn }));
      if (isToday) {
        setTodayRows(prev => prev.map(r => r.habit._id !== habit._id ? r : { ...r, checkIn }));
      }
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
                fetchSelectedDate(selectedDate);
                fetchToday();
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
      {isInitialLoading ? (
        <PageSkeleton />
      ) : (
        <div className={styles.page}>
          <div className={styles.container}>

            {/* Header of page */}
            <div className={styles.header}>
              <div>
                <h1 className={styles.greeting}>{greeting(user?.name ?? "there")}</h1>
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

            {/* ── 2-column layout starts here ── */}
            <div className={styles.layout}>
              {/* Main column — progressbar + habit list */}
              <div className={styles.mainColumn}>
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

                  {loading ? (
                    <div className={styles.habitList}>
                      <SkeletonRow />
                      <SkeletonRow />
                      <SkeletonRow />
                    </div>
                  ) : activeHabits.length === 0 ? (
                    <div className={styles.emptyState}>
                      <p>No active habits yet.</p>
                      <p>Create one to get started!</p>
                    </div>
                  ) : (
                    <div className={styles.habitList}>
                      {activeHabits.map(row => (
                        <HabitRow
                          key={row.habit._id}
                          row={row}
                          onIncrement={r => updateCount(r, 1)}
                          onDecrement={r => updateCount(r, -1)}
                          isPending={pendingId === row.habit._id}
                        />
                      ))}
                    </div>
                  )}
                </section>
              </div>

              {/* Sidebar column — stats first, then tip */}
              <div className={styles.sidebarColumn}>

                <div className={styles.statsCard}>
                  <div className={styles.statsHeader}>
                    <span>📊</span>
                    <span className={styles.statsTitle}>Today at a Glance</span>
                  </div>
                  <div className={styles.statsGrid}>
                    <div className={styles.statsItem}>
                      <span className={styles.statsValue}>{todayActiveHabits.length}</span>
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

                <div className={styles.tipCard}>
                  <div className={styles.tipHeader}>
                    <span>💡</span>
                    <span className={styles.tipTitle}>Consistency Tip</span>
                  </div>
                  <p className={styles.tipBody}>
                    Drinking water right after you wake up helps anchor your morning routine.
                  </p>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}