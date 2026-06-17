import { useState, useEffect, useMemo, useCallback } from "react";
import type { CheckIn, Goal, CheckInStatus, WeekStripDay, WeekDay } from "../../types";
import { getCheckIns, upsertCheckIn } from "../../api/checkins";
import { getGoals } from "../../api/goals";
import styles from "./TodayPage.module.css";
import WeekStrip from "@/components/WeekStrip/WeekStrip";
import AppLayout from "@/components/layout/AppLayout";
import { useHabitContext } from "../../context/HabitContext";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import HabitCategoryIcon from "@/components/shared/HabitCategoryIcon";

// ── Types ─────────────────────────────────────────────────────────────────────

interface HabitRow {
  habitId:        string;
  name:           string;
  category:       string;
  priority:       "High" | "Medium" | "Low";
  targetPerDay:   number;
  userId:         string;
  checkIn:        CheckIn;
  goal:           Goal | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatLocalDate(date: Date): string {
  const y  = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const dy = String(date.getDate()).padStart(2, "0");
  return `${y}-${mo}-${dy}`;
}

function deriveStatus(completedCount: number, targetPerDay: number): CheckInStatus {
  if (completedCount <= 0)          return "Not Started";
  if (completedCount >= targetPerDay) return "Completed";
  return "In Progress";
}

function buildWeekDays(todayStr: string): WeekStripDay[] {
  const today        = new Date(todayStr + "T00:00:00");
  const mondayOffset = (today.getDay() + 6) % 7;
  const labels: WeekDay[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - mondayOffset + i);
    return { label: labels[d.getDay()], date: d.getDate(), iso: formatLocalDate(d) };
  });
}

function greeting(name: string) {
  const h    = new Date().getHours();
  const time = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
  return `Good ${time}, ${name}!`;
}

const TODAY = formatLocalDate(new Date());

// ── Consistency tips (rotate by weekday) ─────────────────────────────────────

const TIPS = [
  { title: "The 2-Minute Rule",         body: "If a new habit takes less than two minutes, do it now. Shrinking your goals makes it impossible to say no." },
  { title: "Stack Your Habits",          body: "Link new habits to existing routines. After your morning coffee, do your habit." },
  { title: "Never Miss Twice",           body: "Missing once is an accident. Missing twice is a pattern. Recover quickly and keep going." },
  { title: "Celebrate Small Wins",       body: "Every check-in counts. Reward yourself after completing a habit to reinforce the behaviour." },
  { title: "Environment Design",         body: "Make good habits obvious. Leave your running shoes by the door, your book on the pillow." },
  { title: "Track Your Progress",        body: "Seeing your streak grow is motivating. Don't break the chain — keep showing up daily." },
  { title: "Start Ridiculously Small",   body: "Start with just two minutes. A habit that sticks at 2 minutes beats one that fails at 20." },
];

// ── Right-panel components ────────────────────────────────────────────────────

function ConsistencyTip() {
  const tip = TIPS[new Date().getDay() % TIPS.length];
  return (
    <div className={styles.tipCard}>
      <div className={styles.tipHeader}>
        <div className={styles.tipIconWrap}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <span className={styles.tipLabel}>CONSISTENCY TIP</span>
      </div>
      <h3 className={styles.tipTitle}>{tip.title}</h3>
      <p className={styles.tipBody}>{tip.body}</p>
    </div>
  );
}

const DAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];

function WeeklyMomentum({
  weekDays,
  weekCompletion,
  today,
}: {
  weekDays:       WeekStripDay[];
  weekCompletion: Map<string, number>;
  today:          string;
}) {
  const getDotClass = (day: WeekStripDay) => {
    if (day.iso > today) return styles.dotEmpty;
    const pct = weekCompletion.get(day.iso) ?? 0;
    if (pct >= 100) return styles.dotHigh;
    if (pct >= 50)  return styles.dotMid;
    if (pct > 0)    return styles.dotLow;
    return styles.dotEmpty;
  };

  return (
    <div className={styles.momentumCard}>
      <p className={styles.momentumLabel}>WEEKLY MOMENTUM</p>
      <div className={styles.momentumDots}>
        {weekDays.map((day, i) => (
          <div key={i} className={`${styles.dot} ${getDotClass(day)}`} />
        ))}
      </div>
      <div className={styles.momentumDays}>
        {weekDays.map((day) => (
          <span key={day.iso} className={styles.momentumDay}>
            {DAY_INITIALS[new Date(day.iso + "T00:00:00").getDay()]}
          </span>
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
          <SkeletonRow /><SkeletonRow /><SkeletonRow />
        </div>
      </div>
      <div className={styles.sideCol}>
        <div className={`${styles.skeletonBox} ${styles.skeletonTip}`} />
        <div className={`${styles.skeletonBox} ${styles.skeletonMomentum}`} />
      </div>
    </div>
  );
}

// ── HabitRowCard ──────────────────────────────────────────────────────────────

function HabitRowCard({
  row,
  streak,
  onIncrement,
  onDecrement,
  onToggleComplete,
  isPending,
}: {
  row:              HabitRow;
  streak:           number;
  onIncrement:      (row: HabitRow) => void;
  onDecrement:      (row: HabitRow) => void;
  onToggleComplete: (row: HabitRow) => void;
  isPending:        boolean;
}) {
  const { checkIn } = row;
  const status      = deriveStatus(checkIn.completedCount, row.targetPerDay);
  const isCompleted = status === "Completed";
  const isMultiStep = row.targetPerDay > 1;

  const categorySlug = row.category.toLowerCase();

  const statusText = isCompleted
    ? streak > 1 ? `🔥 ${streak}-day streak` : "Awesome! Completed."
    : isMultiStep
    ? `${checkIn.completedCount} of ${row.targetPerDay}`
    : "";

  return (
    <div className={`${styles.habitRow} ${isCompleted ? styles.habitRowCompleted : ""} ${isPending ? styles.habitRowPending : ""}`}>
      <div className={styles.habitLeft}>
        <HabitCategoryIcon
          category={row.category as Parameters<typeof HabitCategoryIcon>[0]["category"]}
          size={40}
          completed={isCompleted}
        />
        <div className={styles.habitInfo}>
          <span className={`chip chip-category-${categorySlug} ${styles.categoryChip}`}>
            {row.category.toUpperCase()}
          </span>
          <span className={`${styles.habitName} ${isCompleted ? styles.habitNameDone : ""}`}>
            {row.name}
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
              aria-label={`Decrease ${row.name}`}
            >−</button>
            <button
              className={styles.counterBtn}
              onClick={() => onIncrement(row)}
              disabled={isPending}
              aria-label={`Increase ${row.name}`}
            >+</button>
          </div>
        )}
        <button
          className={`${styles.checkBtn} ${isCompleted ? styles.checkBtnDone : ""}`}
          onClick={() => onToggleComplete(row)}
          disabled={isPending}
          aria-label={isCompleted ? `Undo ${row.name}` : `Complete ${row.name}`}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3.5 9 7.5 13 14.5 5" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────

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

export default function TodayPage() {
  const { habits, loading: habitsLoading, error: habitsError } = useHabitContext();
  const { user }     = useAuth();
  const navigate     = useNavigate();

  // All check-ins for the user — single source of truth
  const [allCheckIns, setAllCheckIns] = useState<CheckIn[]>([]);
  const [goals,        setGoals]       = useState<Goal[]>([]);
  const [dataLoading,  setDataLoading] = useState(true);
  const [error,        setError]       = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [pendingId,    setPendingId]   = useState<string | null>(null);
  const [lastAction,   setLastAction]  = useState<{ habitId: string; delta: number } | null>(null);

  const weekDays = useMemo(() => buildWeekDays(TODAY), []);

  // ── Fetch once on mount (or when habits load) ──────────────────────────────

  const fetchAllData = useCallback(async () => {
    try {
      setDataLoading(true);
      setError(null);
      const [checkInsData, goalsData] = await Promise.all([getCheckIns(), getGoals()]);
      setAllCheckIns(checkInsData);
      setGoals(goalsData);
    } catch {
      setError("Failed to load data. Please try again.");
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!habitsLoading) fetchAllData();
  }, [habitsLoading, fetchAllData]);

  // ── Derived state ──────────────────────────────────────────────────────────

  // habitId → date → CheckIn
  const checkInsByHabitDate = useMemo(() => {
    const map = new Map<string, Map<string, CheckIn>>();
    for (const ci of allCheckIns) {
      if (!map.has(ci.habitId)) map.set(ci.habitId, new Map());
      map.get(ci.habitId)!.set(ci.date, ci);
    }
    return map;
  }, [allCheckIns]);

  const activeHabits = useMemo(() => habits.filter(h => h.status === "Active"), [habits]);
  const goalMap      = useMemo(() => new Map(goals.map(g => [g.habitId, g])), [goals]);

  // Rows for the selected date, sorted by priority
  const rows = useMemo<HabitRow[]>(() => {
    const priorityOrder = { High: 0, Medium: 1, Low: 2 };
    return [...activeHabits]
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
      .map(habit => ({
        habitId:      habit._id,
        name:         habit.name,
        category:     habit.category,
        priority:     habit.priority,
        targetPerDay: habit.targetPerDay,
        userId:       habit.userId,
        checkIn:      checkInsByHabitDate.get(habit._id)?.get(selectedDate) ?? {
          _id:            "",
          userId:         habit.userId,
          habitId:        habit._id,
          date:           selectedDate,
          completedCount: 0,
          status:         "Not Started" as CheckInStatus,
          note:           "",
        },
        goal: goalMap.get(habit._id) ?? null,
      }));
  }, [activeHabits, goalMap, checkInsByHabitDate, selectedDate]);

  // Per-habit streak counts from full check-in history
  const streaks = useMemo(() => {
    const today  = new Date();
    const result = new Map<string, number>();
    for (const [habitId, dateMap] of checkInsByHabitDate) {
      let streak = 0;
      for (let i = 0; i < 365; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        if (dateMap.get(formatLocalDate(d))?.status === "Completed") streak++;
        else break;
      }
      result.set(habitId, streak);
    }
    return result;
  }, [checkInsByHabitDate]);

  // Per-day completion % for the current week (for momentum dots)
  const weekCompletion = useMemo(() => {
    const result = new Map<string, number>();
    for (const day of weekDays) {
      const done = activeHabits.filter(h =>
        checkInsByHabitDate.get(h._id)?.get(day.iso)?.status === "Completed"
      ).length;
      result.set(
        day.iso,
        activeHabits.length > 0 ? Math.round((done / activeHabits.length) * 100) : 0
      );
    }
    return result;
  }, [checkInsByHabitDate, activeHabits, weekDays]);

  // Progress for today
  const totalGoal = rows.reduce((s, r) => s + r.targetPerDay, 0);
  const totalDone = rows.reduce((s, r) => s + Math.min(r.checkIn.completedCount, r.targetPerDay), 0);
  const progressPct = totalGoal > 0 ? Math.round((totalDone / totalGoal) * 100) : 0;

  const isLoading = habitsLoading || dataLoading;
  const pageError = error ?? habitsError;

  // ── Update a check-in (optimistic, allCheckIns as source of truth) ─────────

  async function updateCount(row: HabitRow, delta: number, trackUndo = true) {
    const { habitId, checkIn, targetPerDay } = row;
    const raw      = checkIn.completedCount + delta;
    const newCount = Math.max(0, delta > 0 ? Math.min(raw, targetPerDay) : raw);
    const newStatus = deriveStatus(newCount, targetPerDay);

    // Snapshot for rollback
    const backup = allCheckIns.find(ci => ci.habitId === habitId && ci.date === selectedDate);

    // Optimistic
    const optimistic: CheckIn = { ...checkIn, completedCount: newCount, status: newStatus };
    setAllCheckIns(prev => {
      const idx = prev.findIndex(ci => ci.habitId === habitId && ci.date === selectedDate);
      return idx >= 0
        ? prev.map((ci, i) => i === idx ? optimistic : ci)
        : [...prev, optimistic];
    });

    if (trackUndo) setLastAction({ habitId, delta });
    setPendingId(habitId);

    try {
      const saved = await upsertCheckIn({ habitId, date: selectedDate, completedCount: newCount, note: checkIn.note });
      setAllCheckIns(prev => {
        const idx = prev.findIndex(ci => ci.habitId === saved.habitId && ci.date === saved.date);
        return idx >= 0 ? prev.map((ci, i) => i === idx ? saved : ci) : prev;
      });
    } catch {
      // Rollback
      setAllCheckIns(prev => {
        if (backup) {
          const idx = prev.findIndex(ci => ci.habitId === habitId && ci.date === selectedDate);
          return prev.map((ci, i) => i === idx ? backup : ci);
        }
        return prev.filter(ci => !(ci.habitId === habitId && ci.date === selectedDate));
      });
      setError("Failed to save. Please try again.");
    } finally {
      setPendingId(null);
    }
  }

  async function toggleComplete(row: HabitRow) {
    const isCompleted = deriveStatus(row.checkIn.completedCount, row.targetPerDay) === "Completed";
    const delta = isCompleted
      ? -row.checkIn.completedCount
      : row.targetPerDay - row.checkIn.completedCount;
    await updateCount(row, delta);
  }

  async function undoLast() {
    if (!lastAction) return;
    const row = rows.find(r => r.habitId === lastAction.habitId);
    if (!row) return;
    const action = lastAction;
    setLastAction(null);
    await updateCount(row, -action.delta, false);
  }

  // ── Error state ────────────────────────────────────────────────────────────

  if (pageError) return (
    <AppLayout onNewHabit={() => navigate("/habits")}>
      <div className={styles.errorWrap}>
        <div className={styles.errorBox}>
          <p className={styles.errorText}>{pageError}</p>
          <button className={styles.retryBtn} onClick={() => { setError(null); fetchAllData(); }}>
            Try again
          </button>
        </div>
      </div>
    </AppLayout>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <AppLayout onNewHabit={() => navigate("/habits")}>
      {isLoading ? (
        <PageSkeleton />
      ) : (
        <div className={styles.pageGrid}>

          {/* ── Left: main content ── */}
          <div className={styles.mainCol}>

            <h1 className={styles.greeting}>
              {greeting(user?.name?.split(" ")[0] ?? "there")}
            </h1>

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
                      <path d="M2 8a6 6 0 1 0 1.5-4L2 2" /><polyline points="2,2 2,6 6,6" />
                    </svg>
                    Undo last action
                  </button>
                )}
              </div>

              <div className={styles.habitList}>
                {rows.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p>No active habits yet.</p>
                    <p>Create one to get started!</p>
                  </div>
                ) : (
                  rows.map(row => (
                    <HabitRowCard
                      key={row.habitId}
                      row={row}
                      streak={streaks.get(row.habitId) ?? 0}
                      onIncrement={r => updateCount(r, 1)}
                      onDecrement={r => updateCount(r, -1)}
                      onToggleComplete={toggleComplete}
                      isPending={pendingId === row.habitId}
                    />
                  ))
                )}
              </div>
            </section>
          </div>

          {/* ── Right: sidebar cards ── */}
          <div className={styles.sideCol}>
            <ConsistencyTip />
            <WeeklyMomentum
              weekDays={weekDays}
              weekCompletion={weekCompletion}
              today={TODAY}
            />
            <CurrentVibe />
          </div>

        </div>
      )}
    </AppLayout>
  );
}
