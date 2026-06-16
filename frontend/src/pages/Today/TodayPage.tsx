import { useState, useEffect, useCallback } from "react";
import type { Habit, CheckIn, Goal, CheckInStatus, WeekStripDay, WeekDay } from "../../types";
import { getCheckInsByDate, upsertCheckIn } from "../../api/checkins";
import { getGoals } from "../../api/goals";
import styles from "./TodayPage.module.css";
import WeekStrip from "@/components/WeekStrip/WeekStrip";
import AppLayout from "@/components/layout/AppLayout";
import { useHabitContext } from "../../context/HabitContext";
import { useAuth } from "../../context/AuthContext";
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

// ── Consistency tips ──────────────────────────────────────────────────────────

const TIPS = [
  {
    title: "The 2-Minute Rule",
    body: "If a new habit takes less than two minutes, do it now. Shrinking your goals makes it impossible to say no.",
  },
  {
    title: "Stack Your Habits",
    body: "Link new habits to existing routines. After your morning coffee, I will do my habit.",
  },
  {
    title: "Never Miss Twice",
    body: "Missing once is an accident. Missing twice is a pattern. Recover quickly and keep going.",
  },
  {
    title: "Celebrate Small Wins",
    body: "Every check-in counts. Reward yourself after completing a habit to reinforce the behaviour.",
  },
  {
    title: "Environment Design",
    body: "Make good habits obvious. Leave your running shoes by the door, your book on the pillow.",
  },
  {
    title: "Track Your Progress",
    body: "Seeing your streak grow is motivating. Don't break the chain — keep showing up daily.",
  },
  {
    title: "Start Ridiculously Small",
    body: "Start with just two minutes. A habit that sticks at 2 minutes beats one that fails at 20.",
  },
];

// ── Right-panel components ────────────────────────────────────────────────────

function ConsistencyTip() {
  const tip = TIPS[new Date().getDay() % TIPS.length];
  return (
    <div className={styles.tipCard}>
      <div className={styles.tipHeader}>
        <div className={styles.tipIconWrap}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <span className={styles.tipLabel}>CONSISTENCY TIP</span>
      </div>
      <h3 className={styles.tipTitle}>{tip.title}</h3>
      <p className={styles.tipBody}>{tip.body}</p>
    </div>
  );
}

function WeeklyMomentum({ progressPct }: { progressPct: number }) {
  const dayOfWeek = new Date().getDay();
  const LABELS = ["S", "M", "T", "W", "T", "F", "S"];

  const getDotClass = (i: number) => {
    if (i > dayOfWeek) return styles.dotEmpty;
    if (i === dayOfWeek) {
      if (progressPct >= 100) return styles.dotHigh;
      if (progressPct >= 50) return styles.dotMid;
      return styles.dotLow;
    }
    return styles.dotMid;
  };

  return (
    <div className={styles.momentumCard}>
      <p className={styles.momentumLabel}>WEEKLY MOMENTUM</p>
      <div className={styles.momentumDots}>
        {LABELS.map((_, i) => (
          <div key={i} className={`${styles.dot} ${getDotClass(i)}`} />
        ))}
      </div>
      <div className={styles.momentumDays}>
        {LABELS.map((d, i) => (
          <span key={i} className={styles.momentumDay}>{d}</span>
        ))}
      </div>
    </div>
  );
}

function CurrentVibe() {
  return (
    <div className={styles.vibeCard}>
      <div className={styles.vibeOverlay}>
        <span className={styles.vibeLabel}>Current Vibe</span>
        <span className={styles.vibeName}>Gentle Progress</span>
      </div>
    </div>
  );
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
    <div className={styles.pageGrid}>
      <div className={styles.mainCol}>
        <div className={styles.skeletonHeader}>
          <div className={`${styles.skeletonBox} ${styles.skeletonGreeting}`} />
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
      <div className={styles.sideCol}>
        <div className={`${styles.skeletonBox} ${styles.skeletonTip}`} />
        <div className={`${styles.skeletonBox} ${styles.skeletonMomentum}`} />
      </div>
    </div>
  );
}

// ── HabitRow ──────────────────────────────────────────────────────────────────

function HabitRow({
  row,
  onIncrement,
  onDecrement,
  onToggleComplete,
  isPending,
}: {
  row: HabitWithCheckIn;
  onIncrement: (row: HabitWithCheckIn) => void;
  onDecrement: (row: HabitWithCheckIn) => void;
  onToggleComplete: (row: HabitWithCheckIn) => void;
  isPending: boolean;
}) {
  const { habit, checkIn } = row;
  const status = deriveStatus(checkIn.completedCount, habit.targetPerDay);
  const isCompleted = status === "Completed";
  const isMultiStep = habit.targetPerDay > 1;

  const categorySlug = habit.category.toLowerCase();
  const statusText = isCompleted
    ? "Awesome! Completed."
    : isMultiStep
    ? `${checkIn.completedCount} of ${habit.targetPerDay}`
    : "";

  return (
    <div className={`${styles.habitRow} ${isCompleted ? styles.habitRowCompleted : ""} ${isPending ? styles.habitRowPending : ""}`}>
      <div className={styles.habitLeft}>
        <HabitCategoryIcon category={habit.category} size={40} completed={isCompleted} />
        <div className={styles.habitInfo}>
          <span className={`chip chip-category-${categorySlug} ${styles.categoryChip}`}>
            {habit.category.toUpperCase()}
          </span>
          <span className={`${styles.habitName} ${isCompleted ? styles.habitNameDone : ""}`}>
            {habit.name}
          </span>
          {statusText && (
            <span className={`${styles.statusLine} ${isCompleted ? styles.statusCompleted : styles.statusInProgress}`}>
              {statusText}
            </span>
          )}
        </div>
      </div>

      <div className={styles.counter}>
        {isMultiStep && !isCompleted && (
          <div className={styles.counterPill}>
            <button
              className={styles.counterBtn}
              onClick={() => onDecrement(row)}
              disabled={isPending || checkIn.completedCount <= 0}
              aria-label={`Decrease ${habit.name}`}
            >−</button>
            <button
              className={styles.counterBtn}
              onClick={() => onIncrement(row)}
              disabled={isPending}
              aria-label={`Increase ${habit.name}`}
            >+</button>
          </div>
        )}
        <button
          className={`${styles.checkBtn} ${isCompleted ? styles.checkBtnDone : ""}`}
          onClick={() => onToggleComplete(row)}
          disabled={isPending}
          aria-label={isCompleted ? `Undo ${habit.name}` : `Complete ${habit.name}`}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3.5 9 7.5 13 14.5 5" />
          </svg>
        </button>
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
  const { habits, loading: habitsLoading, error: habitsError } = useHabitContext();
  const { user } = useAuth();
  const [rows, setRows] = useState<HabitWithCheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const navigate = useNavigate();

  const [pendingId, setPendingId] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<{ habitId: string; delta: number } | null>(null);

  const weekDays = buildWeekDays(TODAY);

  const priorityOrder = { High: 0, Medium: 1, Low: 2 };

  const activeHabits = rows
    .filter(r => r.habit.status === "Active")
    .sort((a, b) => priorityOrder[a.habit.priority] - priorityOrder[b.habit.priority]);

  const totalGoal = activeHabits.reduce((s, r) => s + r.habit.targetPerDay, 0);
  const totalDone = activeHabits.reduce((s, r) => s + Math.min(r.checkIn.completedCount, r.habit.targetPerDay), 0);
  const progressPct = totalGoal > 0 ? Math.round((totalDone / totalGoal) * 100) : 0;
  const pageError = error ?? habitsError;
  const isLoading = loading || habitsLoading;

  // ── Fetch data ──────────────────────────────────────────────────────────────

  const fetchData = useCallback(async (date: string) => {
    try {
      setLoading(true);
      setError(null);

      const activeHabits = habits.filter(h => h.status === "Active");
      const [checkIns, goals] = await Promise.all([
        getCheckInsByDate(date),
        getGoals(),
      ]);

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
        return { habit, checkIn, goal: goalMap.get(habit._id) ?? null };
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
    if (!habitsLoading) fetchData(selectedDate);
  }, [fetchData, habitsLoading, selectedDate]);

  // ── Update handlers ─────────────────────────────────────────────────────────

  async function updateCount(row: HabitWithCheckIn, delta: number, trackUndo = true) {
    const { habit, checkIn } = row;
    const raw = checkIn.completedCount + delta;
    const count = Math.max(0, delta > 0 ? Math.min(raw, habit.targetPerDay) : raw);

    setRows(prev => prev.map(r =>
      r.habit._id !== habit._id ? r : {
        ...r,
        checkIn: { ...r.checkIn, completedCount: count, status: deriveStatus(count, habit.targetPerDay) },
      }
    ));

    if (trackUndo) setLastAction({ habitId: habit._id, delta });
    setPendingId(habit._id);

    try {
      const updated = await upsertCheckIn({
        habitId: habit._id,
        date: selectedDate,
        completedCount: count,
        note: checkIn.note,
      });
      setRows(prev => prev.map(r =>
        r.habit._id !== habit._id ? r : { ...r, checkIn: updated }
      ));
    } catch (err) {
      console.error(err);
      setRows(prev => prev.map(r =>
        r.habit._id !== habit._id ? r : { ...r, checkIn }
      ));
      setError("Failed to save. Please try again.");
    } finally {
      setPendingId(null);
    }
  }

  async function toggleComplete(row: HabitWithCheckIn) {
    const isCompleted = deriveStatus(row.checkIn.completedCount, row.habit.targetPerDay) === "Completed";
    const delta = isCompleted
      ? -row.checkIn.completedCount
      : row.habit.targetPerDay - row.checkIn.completedCount;
    await updateCount(row, delta);
  }

  async function undoLast() {
    if (!lastAction) return;
    const row = rows.find(r => r.habit._id === lastAction.habitId);
    if (!row) return;
    const action = lastAction;
    setLastAction(null);
    await updateCount(row, -action.delta, false);
  }

  // ── Error state ─────────────────────────────────────────────────────────────

  if (pageError) return (
    <AppLayout onNewHabit={() => navigate("/habits")}>
      <div className={styles.errorWrap}>
        <div className={styles.errorBox}>
          <p className={styles.errorText}>{pageError}</p>
          <button className={styles.retryBtn} onClick={() => { if (error) fetchData(selectedDate); else window.location.reload(); }}>
            Try again
          </button>
        </div>
      </div>
    </AppLayout>
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <AppLayout onNewHabit={() => navigate("/habits")}>
      {isLoading ? (
        <PageSkeleton />
      ) : (
        <div className={styles.pageGrid}>

          {/* ── Left: main content ── */}
          <div className={styles.mainCol}>

            <div className={styles.header}>
              <h1 className={styles.greeting}>{greeting(user?.name?.split(" ")[0] ?? "there")}</h1>
            </div>

            <div className={styles.progressRow}>
              <ProgressBar percent={progressPct} />
              <span className={styles.progressLabel}>Daily Goal: {progressPct}%</span>
            </div>

            <WeekStrip
              days={weekDays}
              selectedDate={selectedDate}
              today={TODAY}
              onSelectDate={setSelectedDate}
            />

            <section>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>Active Habits</span>
                {lastAction && (
                  <button className={styles.undoBtn} onClick={undoLast}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 8a6 6 0 1 0 1.5-4L2 2" />
                      <polyline points="2,2 2,6 6,6" />
                    </svg>
                    Undo last action
                  </button>
                )}
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
                      onToggleComplete={toggleComplete}
                      isPending={pendingId === row.habit._id}
                    />
                  ))
                )}
              </div>
            </section>
          </div>

          {/* ── Right: sidebar cards ── */}
          <div className={styles.sideCol}>
            <ConsistencyTip />
            <WeeklyMomentum progressPct={progressPct} />
            <CurrentVibe />
          </div>

        </div>
      )}
    </AppLayout>
  );
}
