import { useState, useEffect, useMemo, useCallback } from "react";
import type { CheckIn, Goal, CheckInStatus, WeekStripDay, WeekDay, Habit } from "../../types";
import { getCheckIns, upsertCheckIn } from "../../api/checkins";
import { getGoals } from "../../api/goals";
import styles from "./TodayPage.module.css";
import AppLayout from "@/components/layout/AppLayout";
import { useHabitContext } from "../../context/HabitContext";
import { useAuth } from "@/context/AuthContext";
import WeekStrip from "@/components/today/WeekStrip";
import HabitRow, { deriveStatus, type HabitWithCheckIn } from "@/components/today/HabitRow";
import { CheckCircle2, Lightbulb, PartyPopper, Rocket, TrendingUp } from "lucide-react";
import Toast from "@/components/shared/Toast";

// ── Constants ─────────────────────────────────────────────────────────────────

const mockPerfectDayStreak = 8; // TODO: derive from real check-in history (deferred, see project notes)

const ISO_WEEKDAY_TO_LABEL: WeekDay[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const TIPS = [
  { title: "Drink Water After Waking Up", body: "Drinking water right after you wake up helps anchor your morning routine." },
  { title: "Stack New Habits", body: "Habits stick best when attached to something you already do daily, like your morning coffee." },
  { title: "Never Miss Twice", body: "Missing one day won't break a streak. Missing two in a row is what starts a pattern of skipping." },
  { title: "Small Beats Perfect", body: "Small and consistent beats big and occasional. A 2-minute version of a habit still counts." },
  { title: "Track Your Progress", body: "Tracking progress, even imperfectly, makes you more likely to stick with a habit long-term." },
  { title: "Just Get Started", body: "The hardest part is usually beginning. Once you start, momentum often carries you forward." },
  { title: "Build Discipline", body: "Habits are built in the moments you don't feel like doing them, not the moments you do." },
  { title: "Shrink the Habit", body: "If a habit feels too hard today, make it smaller. A tiny win is better than a skipped day." },
  { title: "Use Visible Progress", body: "Seeing your streak grow fuels motivation and reminds you of the progress you've already made." },
  { title: "Design Your Environment", body: "Your environment shapes your habits more than willpower does. Make the good choice the easy choice." },
  { title: "Avoid the Downward Spiral", body: "It's not about perfect days. Don't let one missed day become a long streak of missed days." },
  { title: "Celebrate Small Wins", body: "Celebrating small victories reinforces the identity of someone who follows through on commitments." },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const dy = String(date.getDate()).padStart(2, "0");
  return `${y}-${mo}-${dy}`;
}

const TODAY = formatLocalDate(new Date());

/** Builds 7 days (Mon–Sun) for the week at the given offset from the current week. */
function buildWeekDays(todayStr: string, weekOffset = 0): WeekStripDay[] {
  const today = new Date(todayStr + "T00:00:00");
  const mondayOffset = (today.getDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - mondayOffset + weekOffset * 7 + i);
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
    return { icon: <CheckCircle2 size={16} />, text: "Ready when you are — let's check something off!" };
  }
  if (percent < 50) {
    return { icon: <Rocket size={16} />, text: "Nice start! Keep the momentum going" };
  }
  if (percent < 100) {
    return { icon: <TrendingUp size={16} />, text: "You're over halfway — don't stop now!" };
  }
  return { icon: <PartyPopper size={16} />, text: "All done for today — you crushed it!" };
}

// ── Date navigator (teammate's month label + arrows, wrapping our WeekStrip) ──

function ChevronLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function DateNavigator({
  weekDays, selectedDate, todayStr, weekOffset,
  onPrevWeek, onNextWeek, onSelectDate, onToday,
}: {
  weekDays: WeekStripDay[];
  selectedDate: string;
  todayStr: string;
  weekOffset: number;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onSelectDate: (d: string) => void;
  onToday: () => void;
}) {
  const start = new Date(weekDays[0].iso + "T00:00:00");
  const end = new Date(weekDays[6].iso + "T00:00:00");
  const monthLabel = start.getMonth() === end.getMonth()
    ? `${MONTH_NAMES[start.getMonth()]} ${start.getFullYear()}`
    : `${MONTH_NAMES[start.getMonth()]} – ${MONTH_NAMES[end.getMonth()]} ${end.getFullYear()}`;

  return (
    <div className={styles.dateNav}>
      <div className={styles.dateNavHeader}>
        <div className={styles.dateNavLeft}>
          <button className={styles.navArrowBtn} onClick={onPrevWeek} aria-label="Previous week">
            <ChevronLeft />
          </button>
          <button className={styles.navArrowBtn} onClick={onNextWeek} disabled={weekOffset >= 0} aria-label="Next week">
            <ChevronRight />
          </button>
          <span className={styles.dateNavMonth}>{monthLabel}</span>
        </div>
        {weekOffset !== 0 && (
          <button className={styles.todayNavBtn} onClick={onToday}>↩ Today</button>
        )}
      </div>

      {/* Our WeekStrip stays as the actual day-picker (today-dot, elevated
          selected styling already built) — just wrapped by the header above */}
      <WeekStrip
        days={weekDays}
        selectedDate={selectedDate}
        today={todayStr}
        onSelectDate={onSelectDate}
      />
    </div>
  );
}

// ── Weekly momentum dots (teammate's component, kept as-is) ──────────────────

const DAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];

function WeeklyMomentum({
  weekDays,
  weekCompletion,
  today,
}: {
  weekDays: WeekStripDay[];
  weekCompletion: Map<string, number>;
  today: string;
}) {
  const getDotClass = (day: WeekStripDay) => {
    if (day.iso > today) return styles.dotEmpty;
    const pct = weekCompletion.get(day.iso) ?? 0;
    if (pct >= 100) return styles.dotHigh;
    if (pct >= 50) return styles.dotMid;
    if (pct > 0) return styles.dotLow;
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


// ── Right-panel components ────────────────────────────────────────────────────

function ConsistencyTip({ title, body }: { title: string; body: string }) {
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
      <h3 className={styles.tipTitle}>{title}</h3>
      <p className={styles.tipBody}>{body}</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TodayPage() {
  const { user } = useAuth();
  const { habits, loading: habitsLoading, error: habitsError } = useHabitContext();

  // Single source of truth: ALL check-ins, fetched once (teammate's
  // architecture — supports instant date switching + future streak/momentum
  // features without re-fetching per date)
  const [allCheckIns, setAllCheckIns] = useState<CheckIn[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [weekOffset, setWeekOffset] = useState(0);

  const [pendingId, setPendingId] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<{ habitId: string; delta: number } | null>(null);
  const [toastKey, setToastKey] = useState(0);

  const dailyTip = useMemo(() => TIPS[Math.floor(Math.random() * TIPS.length)], []);

  const weekDays = useMemo(() => buildWeekDays(TODAY, weekOffset), [weekOffset]);

  const isLoading = habitsLoading || dataLoading;
  const pageError = error ?? habitsError;
  const isReadOnly = selectedDate !== TODAY; // only today is editable per spec

  // ── Fetch all check-ins + goals once habits are ready ──────────────────────

  const fetchAllData = useCallback(async () => {
    try {
      setDataLoading(true);
      setError(null);
      const [checkIns, fetchedGoals] = await Promise.all([
        getCheckIns(), // no params = full history for this user
        getGoals(),
      ]);
      setAllCheckIns(checkIns);
      setGoals(fetchedGoals);
    } catch (err) {
      console.error(err);
      setError("Failed to load your data. Please try again.");
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!habitsLoading) {
      fetchAllData();
    }
  }, [habitsLoading, fetchAllData]);

  // ── Derived maps for fast lookup ────────────────────────────────────────────

  // habitId → date → CheckIn
  const checkInsByHabitDate = useMemo(() => {
    const map = new Map<string, Map<string, CheckIn>>();
    for (const ci of allCheckIns) {
      if (!map.has(ci.habitId)) map.set(ci.habitId, new Map());
      map.get(ci.habitId)!.set(ci.date, ci);
    }
    return map;
  }, [allCheckIns]);

  const goalMap = useMemo(() => new Map(goals.map(g => [g.habitId, g])), [goals]);

  // Active + scheduled habits for the SELECTED date
  const scheduledHabits = useMemo(
    () => habits.filter(h => h.status === "Active" && isHabitScheduledOn(h, selectedDate)),
    [habits, selectedDate]
  );

  // Active + scheduled habits for TODAY specifically (drives progress/stats)
  const todayScheduledHabits = useMemo(
    () => habits.filter(h => h.status === "Active" && isHabitScheduledOn(h, TODAY)),
    [habits]
  );

  function getCheckInFor(habit: Habit, date: string): CheckIn {
    return checkInsByHabitDate.get(habit._id)?.get(date) ?? {
      _id: "",
      userId: habit.userId,
      habitId: habit._id,
      date,
      completedCount: 0,
      status: "Not Started" as CheckInStatus,
      note: "",
    };
  }

  const priorityOrder = { High: 0, Medium: 1, Low: 2 } as const;

  // Rows for the currently selected date (drives the habit list)
  const rows: HabitWithCheckIn[] = useMemo(() => {
    return [...scheduledHabits]
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
      .map(habit => ({
        habit,
        checkIn: getCheckInFor(habit, selectedDate),
        goal: goalMap.get(habit._id) ?? null,
      }));
  }, [scheduledHabits, selectedDate, checkInsByHabitDate, goalMap]);

  // Rows for TODAY specifically (drives progress bar + stats card)
  const todayRows: HabitWithCheckIn[] = useMemo(() => {
    return todayScheduledHabits.map(habit => ({
      habit,
      checkIn: getCheckInFor(habit, TODAY),
      goal: goalMap.get(habit._id) ?? null,
    }));
  }, [todayScheduledHabits, checkInsByHabitDate, goalMap]);

  const totalGoal = todayRows.reduce((s, r) => s + r.habit.targetPerDay, 0);
  const totalDone = todayRows.reduce((s, r) => s + Math.min(r.checkIn.completedCount, r.habit.targetPerDay), 0);
  const progressPct = totalGoal > 0 ? Math.round((totalDone / totalGoal) * 100) : 0;
  const progressMessage = getProgressMessage(progressPct);

  const completedTodayCount = todayRows.filter(
    r => deriveStatus(r.checkIn.completedCount, r.habit.targetPerDay) === "Completed"
  ).length;

  const inProgressTodayCount = todayRows.filter(
    r => deriveStatus(r.checkIn.completedCount, r.habit.targetPerDay) === "In Progress"
  ).length;

  // Per-day completion % for the current week (drives WeeklyMomentum dots)
  const weekCompletion = useMemo(() => {
    const result = new Map<string, number>();
    for (const day of weekDays) {
      const done = scheduledHabits.filter(h =>
        checkInsByHabitDate.get(h._id)?.get(day.iso)?.status === "Completed"
      ).length;
      result.set(
        day.iso,
        scheduledHabits.length > 0 ? Math.round((done / scheduledHabits.length) * 100) : 0
      );
    }
    return result;
  }, [checkInsByHabitDate, scheduledHabits, weekDays]);

  // ── Update a check-in (optimistic against allCheckIns) ──────────────────────

  async function updateCount(row: HabitWithCheckIn, delta: number, trackUndo = true) {
    const { habit, checkIn } = row;
    const raw = checkIn.completedCount + delta;
    const newCount = Math.max(0, delta > 0 ? Math.min(raw, habit.targetPerDay) : raw);
    const newStatus = deriveStatus(newCount, habit.targetPerDay);

    const backup = allCheckIns.find(ci => ci.habitId === habit._id && ci.date === selectedDate);
    const optimistic: CheckIn = { ...checkIn, completedCount: newCount, status: newStatus };

    setAllCheckIns(prev => {
      const idx = prev.findIndex(ci => ci.habitId === habit._id && ci.date === selectedDate);
      return idx >= 0
        ? prev.map((ci, i) => (i === idx ? optimistic : ci))
        : [...prev, optimistic];
    });

    if (trackUndo) {
      setLastAction({ habitId: habit._id, delta });
      setToastKey(k => k + 1);
    }
    setPendingId(habit._id);

    try {
      const saved = await upsertCheckIn({
        habitId: habit._id,
        date: selectedDate,
        completedCount: newCount,
        note: checkIn.note,
      });
      setAllCheckIns(prev => {
        const idx = prev.findIndex(ci => ci.habitId === saved.habitId && ci.date === saved.date);
        return idx >= 0 ? prev.map((ci, i) => (i === idx ? saved : ci)) : prev;
      });
    } catch (err) {
      console.error(err);
      setAllCheckIns(prev => {
        if (backup) {
          const idx = prev.findIndex(ci => ci.habitId === habit._id && ci.date === selectedDate);
          return prev.map((ci, i) => (i === idx ? backup : ci));
        }
        return prev.filter(ci => !(ci.habitId === habit._id && ci.date === selectedDate));
      });
      setError("Failed to save. Please try again.");
    } finally {
      setPendingId(null);
    }
  }

  async function undoLast() {
    if (!lastAction) return;
    const action = lastAction;
    setLastAction(null);

    // Safe to look up in `rows` directly — undo only ever applies to today's
    // actions, since editing is read-only on past dates.
    const row = rows.find(r => r.habit._id === action.habitId);
    if (!row) return;
    await updateCount(row, -action.delta, false);
  }

  // ── Week navigation ──────────────────────────────────────────────────────────

  function goToPrevWeek() {
    setWeekOffset(w => w - 1);
  }

  function goToNextWeek() {
    setWeekOffset(w => Math.min(0, w + 1)); // never navigate into future weeks
  }

  function goToToday() {
    setWeekOffset(0);
    setSelectedDate(TODAY);
  }

  function handleSelectDate(d: string) {
    if (d > TODAY) return; // future dates blocked per spec
    setSelectedDate(d);
  }

  // ── Error state ──────────────────────────────────────────────────────────────

  if (pageError) {
    return (
      <AppLayout>
        <div className={styles.page}>
          <div className={styles.container}>
            <div className={styles.errorBox}>
              <p className={styles.errorText}>{pageError}</p>
              <button
                className={styles.retryBtn}
                onClick={() => {
                  if (error) {
                    fetchAllData();
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
      </AppLayout>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <AppLayout>
        {isLoading ? (
          <PageSkeleton />
        ) : (
          <div className={styles.page}>
            <div className={styles.container}>

              {/* Greeting */}
              <div className={styles.heroCard}>
                <h1 className={styles.greeting}>{greeting(user?.name?.split(" ")[0] ?? "there")}</h1>
              </div>

              <div className={styles.pageGrid}>
                <div className={styles.mainColumn}>
                  <div className={styles.progressGroup}>
                    <p className={styles.progressMessage}>
                      {progressMessage.icon}
                      <span>{progressMessage.text}</span>
                    </p>
                    <ProgressBar percent={progressPct} />
                  </div>

                  <DateNavigator
                    weekDays={weekDays}
                    selectedDate={selectedDate}
                    todayStr={TODAY}
                    weekOffset={weekOffset}
                    onPrevWeek={goToPrevWeek}
                    onNextWeek={goToNextWeek}
                    onSelectDate={handleSelectDate}
                    onToday={goToToday}
                  />

                  <section>
                    <div className={styles.readOnlyNoticeSlot}>
                      {isReadOnly && (
                        <div className={styles.readOnlyNotice}>
                          Check-ins can only be edited on the current day.
                        </div>
                      )}
                    </div>

                    {rows.length === 0 ? (
                      <div className={styles.emptyState}>
                        <p>No active habits yet.</p>
                        <p>Create one to get started!</p>
                      </div>
                    ) : (
                      <div className={styles.habitList}>
                        {rows.map(row => (
                          <HabitRow
                            key={row.habit._id}
                            row={row}
                            onIncrement={r => updateCount(r, 1)}
                            onDecrement={r => updateCount(r, -1)}
                            isPending={pendingId === row.habit._id}
                            isReadOnly={isReadOnly}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                </div>

                <aside className={styles.sideColumn}>

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
                        <span className={styles.statsValue}>{todayRows.length}</span>
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

                  <WeeklyMomentum
                    weekDays={weekDays}
                    weekCompletion={weekCompletion}
                    today={TODAY}
                  />

                  
<ConsistencyTip
                    title={dailyTip.title}
                    body={dailyTip.body}
                  />
                </aside>
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