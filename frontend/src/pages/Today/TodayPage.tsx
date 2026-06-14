import { useState, useEffect } from "react";
import type { Habit, CheckIn, Goal, HabitCategory, CheckInStatus } from "../../types";
import styles from './TodayPage.module.css';
import AppLayout from "../../components/layout/AppLayout";
import HabitForm from "../../components/habits/HabitForm";
import { useHabitContext } from "../../context/HabitContext";
import { useAuth } from "../../context/AuthContext";
import { getCheckIns, checkInHabit } from "../../api/checkins";
import EmptyState from "../../components/shared/EmptyState";

interface HabitWithCheckIn {
  habit: Habit;
  checkIn: CheckIn;
  goal: Goal | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function deriveStatus(completedCount: number, targetPerDay: number): CheckInStatus {
  if (completedCount <= 0) return "Not Started";
  if (completedCount >= targetPerDay) return "Completed";
  return "In Progress";
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function buildWeekDays(todayStr: string) {
  const today = new Date(todayStr + "T00:00:00");
  const mondayOffset = (today.getDay() + 6) % 7;
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - mondayOffset + i);
    const iso = d.toISOString().slice(0, 10);
    return { label: labels[d.getDay()].toUpperCase().slice(0, 3), date: d.getDate(), iso };
  });
}

function greeting(name: string) {
  const h = new Date().getHours();
  const time = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
  return `Good ${time}, ${name}!`;
}

// ── Category config ───────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<HabitCategory, { colorClass: string; icon: string }> = {
  Health: { colorClass: styles.categoryHealth, icon: "💧" },
  Study: { colorClass: styles.categoryStudy, icon: "📖" },
  Work: { colorClass: styles.categoryWork, icon: "💼" },
  Mindfulness: { colorClass: styles.categoryMindfulness, icon: "🧘" },
  Other: { colorClass: styles.categoryOther, icon: "⚡" },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function CategoryBadge({ category }: { category: HabitCategory }) {
  const { colorClass } = CATEGORY_CONFIG[category];
  return (
    <span className={`${styles.categoryBadge} ${colorClass}`}>
      {category}
    </span>
  );
}

function StatusLine({ status, completedCount, targetPerDay }: {
  status: CheckInStatus;
  completedCount: number;
  targetPerDay: number;
}) {
  if (status === "Completed") return (
    <span className={`${styles.statusLine} ${styles.statusCompleted}`}>
      <span className={styles.statusDot} />
      Completed
    </span>
  );
  if (status === "Not Started") return (
    <span className={`${styles.statusLine} ${styles.statusAtRisk}`}>
      ⚠ At risk of breaking streak
    </span>
  );
  return (
    <span className={`${styles.statusLine} ${styles.statusInProgress}`}>
      In Progress • {targetPerDay - completedCount} left
    </span>
  );
}

function HabitRow({ row, onIncrement, onDecrement }: {
  row: HabitWithCheckIn;
  onIncrement: (habitId: string) => void;
  onDecrement: (habitId: string) => void;
}) {
  const { habit, checkIn } = row;
  const status = deriveStatus(checkIn.completedCount, habit.targetPerDay);
  const isCompleted = status === "Completed";
  const isAtRisk = status === "Not Started";
  const { icon } = CATEGORY_CONFIG[habit.category];

  const rowClass = [
    styles.habitRow,
    isCompleted ? styles.habitRowCompleted : "",
    isAtRisk ? styles.habitRowAtRisk : "",
  ].join(" ");

  return (
    <div className={rowClass}>
      <div className={styles.habitLeft}>
        <div className={`${styles.habitIcon} ${isCompleted ? styles.habitIconCompleted : ""}`}>
          {icon}
        </div>
        <div className={styles.habitInfo}>
          <div className={styles.habitNameRow}>
            <span className={styles.habitName}>{habit.name}</span>
            <CategoryBadge category={habit.category} />
          </div>
          <StatusLine status={status} completedCount={checkIn.completedCount} targetPerDay={habit.targetPerDay} />
        </div>
      </div>

      <div className={styles.counter}>
        <button
          className={styles.counterBtn}
          onClick={() => onDecrement(habit._id)}
          aria-label={`Decrease ${habit.name}`}
        >−</button>
        <span className={styles.counterValue}>
          {checkIn.completedCount} / {habit.targetPerDay}
        </span>
        <button
          className={styles.counterBtn}
          onClick={() => onIncrement(habit._id)}
          disabled={isCompleted}
          aria-label={`Increase ${habit.name}`}
        >+</button>
      </div>
    </div>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className={styles.progressTrack}>
      <div className={styles.progressFill} style={{ width: `${Math.min(percent, 100)}%` }} />
    </div>
  );
}

// ── Realtime active date ────────────────────────────────────────

const TODAY = todayISO();

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TodayPage() {
  const { user } = useAuth();
  const { habits, loading: habitsLoading } = useHabitContext();
  const [activeDay, setActiveDay] = useState(TODAY);
  const [checkIns, setCheckIns] = useState<Record<string, CheckIn>>({});
  const [checkInsLoading, setCheckInsLoading] = useState(true);
  const [lastAction, setLastAction] = useState<{ habitId: string; prevCount: number; newCount: number } | null>(null);
  const [showForm, setShowForm] = useState(false);

  const weekDays = buildWeekDays(TODAY);
  const activeHabits = habits.filter(h => h.status === "Active");

  // Load check-ins for the selected date
  useEffect(() => {
    let alive = true;
    setCheckInsLoading(true);
    getCheckIns({ date: activeDay })
      .then(data => {
        if (!alive) return;
        const map: Record<string, CheckIn> = {};
        data.forEach(c => {
          map[c.habitId] = c;
        });
        setCheckIns(map);
      })
      .catch(err => {
        console.error('Failed to load check-ins:', err);
      })
      .finally(() => {
        if (alive) setCheckInsLoading(false);
      });
    return () => { alive = false; };
  }, [activeDay]);

  // Derive rows for the active habits and their check-in statuses
  const rows: HabitWithCheckIn[] = activeHabits.map(habit => {
    const checkIn = checkIns[habit._id] || {
      _id: `temp-${habit._id}`,
      userId: habit.userId,
      habitId: habit._id,
      date: activeDay,
      completedCount: 0,
      status: 'Not Started',
      note: '',
    };
    return {
      habit,
      checkIn,
      goal: null,
    };
  });

  const totalGoal = activeHabits.reduce((s, h) => s + h.targetPerDay, 0);
  const totalDone = activeHabits.reduce((s, h) => {
    const count = checkIns[h._id]?.completedCount ?? 0;
    return s + Math.min(count, h.targetPerDay);
  }, 0);
  const progressPct = totalGoal > 0 ? Math.round((totalDone / totalGoal) * 100) : 0;

  async function handleUpdateCount(habitId: string, newCount: number) {
    const currentCheckIn = checkIns[habitId];
    const prevCount = currentCheckIn ? currentCheckIn.completedCount : 0;

    // Optimistically update local state
    setCheckIns(prev => ({
      ...prev,
      [habitId]: {
        ...(prev[habitId] || {
          _id: `temp-${habitId}`,
          userId: user?._id || '',
          habitId,
          date: activeDay,
          note: '',
        }),
        completedCount: newCount,
        status: deriveStatus(newCount, habits.find(h => h._id === habitId)?.targetPerDay || 1),
      } as CheckIn,
    }));

    setLastAction({ habitId, prevCount, newCount });

    try {
      const updated = await checkInHabit({
        habitId,
        date: activeDay,
        completedCount: newCount,
      });
      setCheckIns(prev => ({
        ...prev,
        [habitId]: updated,
      }));
    } catch (err) {
      console.error('Failed to save check-in:', err);
      // Rollback on error
      setCheckIns(prev => ({
        ...prev,
        [habitId]: {
          ...(prev[habitId] || {}),
          completedCount: prevCount,
          status: deriveStatus(prevCount, habits.find(h => h._id === habitId)?.targetPerDay || 1),
        } as CheckIn,
      }));
      setLastAction(null);
    }
  }

  async function undoLast() {
    if (!lastAction) return;
    const { habitId, prevCount } = lastAction;
    setLastAction(null);
    await handleUpdateCount(habitId, prevCount);
  }

  if (habitsLoading || checkInsLoading) {
    return (
      <AppLayout onNewHabit={() => setShowForm(true)}>
        <div className="loading-center">
          <div className="spinner" />
        </div>
      </AppLayout>
    );
  }

  const name = user?.name ?? "User";

  return (
    <AppLayout onNewHabit={() => setShowForm(true)}>
      <div className={styles.page}>
        <div className={styles.container}>

          {/* Header */}
          <div className={styles.header}>
            <div>
              <h1 className={styles.greeting}>{greeting(name)}</h1>
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
          <div className={styles.weekStrip}>
            {weekDays.map(d => (
              <button
                key={d.iso}
                onClick={() => setActiveDay(d.iso)}
                className={`${styles.dayBtn} ${activeDay === d.iso ? styles.dayBtnActive : ""}`}
              >
                <span className={styles.dayLabel}>{d.label}</span>
                <span className={styles.dayDate}>{d.date}</span>
              </button>
            ))}
          </div>

          {/* Habits */}
          <section>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>Active Habits</span>
              <span className={styles.sectionCount}>{activeHabits.length} items</span>
            </div>
            {activeHabits.length === 0 ? (
              <div style={{ marginTop: 24 }}>
                <EmptyState
                  title="No active habits yet"
                  subtitle="Start tracking by adding a new habit today!"
                  action={{ label: "Add New Habit", onClick: () => setShowForm(true) }}
                />
              </div>
            ) : (
              <div className={styles.habitList}>
                {rows.map(row => (
                  <HabitRow
                    key={row.habit._id}
                    row={row}
                    onIncrement={id => handleUpdateCount(id, Math.min(row.checkIn.completedCount + 1, row.habit.targetPerDay))}
                    onDecrement={id => handleUpdateCount(id, Math.max(0, row.checkIn.completedCount - 1))}
                  />
                ))}
              </div>
            )}
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
                You've hit this mark 5 days in a row!
              </p>
            </div>
            <div className={styles.settingsCard}>
              <div>
                <p className={styles.settingsTitle}>Settings</p>
                <p className={styles.settingsSubtitle}>Manage your profile and data</p>
              </div>
              <button className={styles.resetBtn}>Reset Data</button>
            </div>
          </div>

          <button className={styles.newHabitBtn} onClick={() => setShowForm(true)}>
            <span>+</span>
            New Habit
          </button>

          <footer className={styles.footer}>
            <span>© 2024 HabitFlow. Built for clarity.</span>
            <div className={styles.footerLinks}>
              {["Privacy", "Support", "Terms"].map(l => (
                <a key={l} href="#" className={styles.footerLink}>{l}</a>
              ))}
            </div>
          </footer>

        </div>
      </div>
      {showForm && (
        <HabitForm
          editingHabit={null}
          onClose={() => setShowForm(false)}
        />
      )}
    </AppLayout>
  );
}