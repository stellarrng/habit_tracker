import { useState } from "react";
import type { Habit, CheckIn, Goal, HabitCategory, CheckInStatus } from "../../types";
import styles from './TodayPage.module.css';

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

// ── Mock data (replace with API call) ────────────────────────────────────────

const TODAY = todayISO();

const MOCK_DATA: HabitWithCheckIn[] = [
  {
    habit: { _id: "h1", userId: "u1", name: "Hydration Goal", category: "Health", frequency: "Daily", specificDays: [], targetPerDay: 8, priority: "High", status: "Active", createdAt: "", updatedAt: "" },
    checkIn: { _id: "c1", userId: "u1", habitId: "h1", date: TODAY, completedCount: 8, status: "Completed", note: "" },
    goal: null,
  },
  {
    habit: { _id: "h2", userId: "u1", name: "Daily Reading", category: "Study", frequency: "Daily", specificDays: [], targetPerDay: 45, priority: "Medium", status: "Active", createdAt: "", updatedAt: "" },
    checkIn: { _id: "c2", userId: "u1", habitId: "h2", date: TODAY, completedCount: 20, status: "In Progress", note: "" },
    goal: null,
  },
  {
    habit: { _id: "h3", userId: "u1", name: "Morning Workout", category: "Health", frequency: "Daily", specificDays: [], targetPerDay: 1, priority: "High", status: "Active", createdAt: "", updatedAt: "" },
    checkIn: { _id: "c3", userId: "u1", habitId: "h3", date: TODAY, completedCount: 0, status: "Not Started", note: "" },
    goal: null,
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TodayPage() {
  const [rows, setRows] = useState<HabitWithCheckIn[]>(MOCK_DATA);
  const [activeDay, setActiveDay] = useState(TODAY);
  const [lastAction, setLastAction] = useState<{ habitId: string; delta: number } | null>(null);

  const weekDays = buildWeekDays(TODAY);
  const activeHabits = rows.filter(r => r.habit.status === "Active");
  const totalGoal = activeHabits.reduce((s, r) => s + r.habit.targetPerDay, 0);
  const totalDone = activeHabits.reduce((s, r) => s + Math.min(r.checkIn.completedCount, r.habit.targetPerDay), 0);
  const progressPct = totalGoal > 0 ? Math.round((totalDone / totalGoal) * 100) : 0;

  function updateCount(habitId: string, delta: number) {
    setRows(prev => prev.map(r => {
      if (r.habit._id !== habitId) return r;
      const raw = r.checkIn.completedCount + delta;
      const count = Math.max(0, delta > 0 ? Math.min(raw, r.habit.targetPerDay) : raw);
      const status = deriveStatus(count, r.habit.targetPerDay);
      return { ...r, checkIn: { ...r.checkIn, completedCount: count, status } };
    }));
    setLastAction({ habitId, delta });
  }

  function undoLast() {
    if (!lastAction) return;
    updateCount(lastAction.habitId, -lastAction.delta);
    setLastAction(null);
  }

  return (
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
          <div className={styles.habitList}>
            {activeHabits.map(row => (
              <HabitRow
                key={row.habit._id}
                row={row}
                onIncrement={id => updateCount(id, 1)}
                onDecrement={id => updateCount(id, -1)}
              />
            ))}
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

        <button className={styles.newHabitBtn}>
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
  );
}