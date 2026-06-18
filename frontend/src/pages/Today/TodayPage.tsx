import { useState, useEffect, useCallback } from "react";
import type { CheckInStatus, WeekStripDay, WeekDay, Habit } from "../../types";
import { getCheckInsByDate, upsertCheckIn } from "../../api/checkins";
import { getGoals } from "../../api/goals";
import styles from "./TodayPage.module.css";
import AppLayout from "@/components/layout/AppLayout";
import { useHabitContext } from "../../context/HabitContext";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import WeekStrip from "@/components/today/WeekStrip";
import HabitRow, { deriveStatus, type HabitWithCheckIn } from "@/components/today/HabitRow";
import { CheckCircle2, Lightbulb, PartyPopper, Rocket, TrendingUp } from "lucide-react";
import Toast from "@/components/shared/Toast";


const mockPerfectDayStreak = 8;
const ISO_WEEKDAY_TO_LABEL: WeekDay[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MOTIVATION_TIPS: string[] = [
  "Drinking water right after you wake up helps anchor your morning routine.",
  "Habits stick best when stacked onto something you already do daily — try pairing a new habit with your morning coffee.",
  "Missing one day won't break a streak. Missing two in a row is what starts a new habit of skipping.",
  "Small and consistent beats big and occasional. A 2-minute version of a habit still counts.",
  "Tracking progress — even imperfectly — makes you twice as likely to stick with a habit long-term.",
  "The hardest part is usually just starting. Once you begin, momentum tends to carry you through.",
  "Habits are built in the moments you don't feel like doing them, not the moments you do.",
  "If a habit feels too hard today, shrink it. A smaller win is better than a skipped day.",
  "Visible progress fuels motivation — that's exactly what this streak counter is for.",
  "Your environment shapes your habits more than willpower does. Make the good choice the easy choice.",
  "It's not about perfect days. It's about not letting one missed day turn into a pattern.",
  "Celebrating small wins, like today's check-in, reinforces the identity of someone who follows through.",
];

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

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - mondayOffset + i);

    return {
      label: ISO_WEEKDAY_TO_LABEL[d.getDay()],
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

function isHabitScheduledOn(habit: Habit, dateISO: string): boolean {
  if (habit.frequency === "Daily") return true;

  const date = new Date(dateISO + "T00:00:00");
  const weekdayLabel = ISO_WEEKDAY_TO_LABEL[date.getDay()];
  return habit.specificDays.includes(weekdayLabel);
}

function getProgressMessage(percent: number): { icon: React.ReactNode; text: string } {
  if (percent === 0) {
    return {
      icon: <CheckCircle2 size={16} />,
      text: "Ready when you are — let's check something off!",
    };
  }
  if (percent < 50) {
    return {
      icon: <Rocket size={16} />,
      text: "Nice start! Keep the momentum going",
    };
  }
  if (percent < 100) {
    return {
      icon: <TrendingUp size={16} />,
      text: "You're over halfway — don't stop now!",
    };
  }
  return {
    icon: <PartyPopper size={16} />,
    text: "All done for today — you crushed it!",
  };
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
  const [lastAction, setLastAction] = useState<{ habitId: string; delta: number } | null>(null);
  const [toastKey, setToastKey] = useState(0);

  const [dailyTip] = useState<string>(
    () => MOTIVATION_TIPS[Math.floor(Math.random() * MOTIVATION_TIPS.length)]
  );

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

  const completedTodayCount = todayActiveHabits.filter(
    r => deriveStatus(r.checkIn.completedCount, r.habit.targetPerDay) === "Completed"
  ).length;

  const inProgressTodayCount = todayActiveHabits.filter(
    r => deriveStatus(r.checkIn.completedCount, r.habit.targetPerDay) === "In Progress"
  ).length;

  const pageError = error ?? habitsError;
  const isInitialLoading = habitsLoading;

  // ── Fetch habits data based on selected date and today ──────────────────────

  const buildRows = useCallback(async (date: string): Promise<HabitWithCheckIn[]> => {
    const activeHabitsList = habits.filter(
      h => h.status === "Active" && isHabitScheduledOn(h, date)
    );
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

    if (trackUndo) {
      setLastAction({ habitId: habit._id, delta });
      setToastKey(k => k + 1);
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
    const action = lastAction;
    setLastAction(null);

    const row = rows.find(r => r.habit._id === action.habitId);
    if (!row) return;
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
    <>
      <AppLayout onNewHabit={() => navigate("/habits")}>
        {isInitialLoading ? (
          <PageSkeleton />
        ) : (
          <div className={styles.page}>
            <div className={styles.container}>

              {/* Header of page */}
              <div className={styles.heroCard}>
                <h1 className={styles.greeting}>{greeting(user?.name ?? "there")}</h1>
              </div>

              {/* ── 2-column layout starts here ── */}
              <div className={styles.layout}>
                {/* Main column — progressbar + habit list */}
                <div className={styles.mainColumn}>
                  {/* <ProgressBar percent={progressPct} /> */}
                  <div className={styles.progressGroup}>
                    <p className={styles.progressMessage}>
                      {getProgressMessage(progressPct).icon}
                      <span>{getProgressMessage(progressPct).text}</span>
                    </p>
                    <ProgressBar percent={progressPct} />
                  </div>

                  {/* Week strip */}
                  <WeekStrip
                    days={weekDays}
                    selectedDate={selectedDate}
                    today={TODAY}
                    onSelectDate={setSelectedDate}
                  />

                  {/* Habits */}
                  <section>
                    <div className={styles.readOnlyNoticeSlot}>
                      {selectedDate !== TODAY && (
                        <div className={styles.readOnlyNotice}>
                          {/* Viewing {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                            weekday: "long", month: "short", day: "numeric"
                          })} —  */}
                          Check-ins can only be edited on the current day.
                        </div>
                      )}
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
                            isReadOnly={selectedDate !== TODAY}
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
                        <span className={styles.statsValue}>🔥 {mockPerfectDayStreak}</span>
                        <span className={styles.statsLabel}>day streak</span>
                      </div>
                      <div className={styles.statsItem}>
                        <span className={styles.statsValue}>{todayActiveHabits.length}</span>
                        <span className={styles.statsLabel}>active habits</span>
                      </div>
                      <div className={styles.statsItem}>
                        <span className={styles.statsValue}>{completedTodayCount}</span>
                        <span className={styles.statsLabel}>completed</span>
                      </div>
                      <div className={styles.statsItem}>
                        <span className={styles.statsValue}>{inProgressTodayCount}</span>
                        <span className={styles.statsLabel}>in progress</span>
                      </div>

                    </div>
                  </div>

                  <div className={styles.tipCard}>
                    <div className={styles.tipHeader}>
                      <Lightbulb size={16} />
                      <span className={styles.tipTitle}>Consistency Tip</span>
                    </div>
                    <p className={styles.tipBody}>{dailyTip}</p>
                  </div>

                </div>
              </div>
            </div>
          </div>
        )}
      </AppLayout>
      {lastAction && (
        <Toast
          key={toastKey}
          message="Habit updated"
          type="info"
          duration={5500}
          actionLabel="Undo"
          onAction={undoLast}
          onClose={() => setLastAction(null)}
        />
      )}
    </>
  );
}