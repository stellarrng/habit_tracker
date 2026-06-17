import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import { useHabitContext } from "../../context/HabitContext";
import { getCheckIns } from "../../api/checkins";
import type { CheckIn, Habit } from "../../types";
import styles from "./DashboardPage.module.css";

// ── Date helpers ──────────────────────────────────────────────────────────────

function fmtDate(d: Date): string {
  const y  = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const dy = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${dy}`;
}

const TODAY       = fmtDate(new Date());
const WEEK_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const MONTH_LABELS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

// ── Types ─────────────────────────────────────────────────────────────────────

type ChartView = "bar" | "line" | "pie" | "heatmap";

interface HabitStatData {
  id:            string;
  name:          string;
  category:      string;
  currentStreak: number;
  longestStreak: number;
  total:         number;
  bars:          number[]; // 7 values: −1 = future, 0-100 = completion %
}

interface SummaryData {
  todayPct:     number;
  activeCount:  number;
  atRiskCount:  number;
  activeChange: number;
}

// ── Computations ──────────────────────────────────────────────────────────────

function computeSummary(
  activeHabits:     Habit[],
  checkInsByHabit:  Map<string, Map<string, CheckIn>>,
): SummaryData {
  const todayDone = activeHabits.filter(h =>
    checkInsByHabit.get(h._id)?.get(TODAY)?.status === "Completed"
  ).length;
  const todayPct = activeHabits.length > 0
    ? Math.round((todayDone / activeHabits.length) * 100)
    : 0;

  const sevenDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(TODAY + "T00:00:00");
    d.setDate(d.getDate() - i);
    return fmtDate(d);
  });
  const prevSevenDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(TODAY + "T00:00:00");
    d.setDate(d.getDate() - 7 - i);
    return fmtDate(d);
  });

  const activeCount = activeHabits.filter(h => {
    const hMap = checkInsByHabit.get(h._id);
    return sevenDays.some(d => (hMap?.get(d)?.completedCount ?? 0) > 0);
  }).length;

  const prevActive = activeHabits.filter(h => {
    const hMap = checkInsByHabit.get(h._id);
    return prevSevenDays.some(d => (hMap?.get(d)?.completedCount ?? 0) > 0);
  }).length;

  const atRiskCount = activeHabits.filter(h => {
    const hMap = checkInsByHabit.get(h._id);
    const done = sevenDays.filter(d => hMap?.get(d)?.status === "Completed").length;
    return (done / sevenDays.length) < 0.5;
  }).length;

  return { todayPct, activeCount, atRiskCount, activeChange: activeCount - prevActive };
}

function computeHabitStat(
  habit:       Habit,
  checkInMap:  Map<string, CheckIn>,
): HabitStatData {
  const today = new Date(TODAY + "T00:00:00");

  // Current streak (from today backwards, all-time)
  let currentStreak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const ci = checkInMap.get(fmtDate(d));
    if (ci && ci.completedCount >= habit.targetPerDay) currentStreak++;
    else break;
  }

  // Longest streak and total over all check-in history
  const sortedDates = [...checkInMap.keys()].sort();
  let longestStreak = 0, cur = 0, total = 0;
  for (const dateStr of sortedDates) {
    const ci = checkInMap.get(dateStr)!;
    if (ci.completedCount >= habit.targetPerDay) {
      cur++;
      longestStreak = Math.max(longestStreak, cur);
      total++;
    } else {
      cur = 0;
    }
  }

  // Weekly bars — Mon-Sun of the current week
  const dayOfWeek = (today.getDay() + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - dayOfWeek);
  const bars = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = fmtDate(d);
    if (dateStr > TODAY) return -1;
    const ci = checkInMap.get(dateStr);
    if (!ci || ci.completedCount <= 0) return 0;
    return Math.min(Math.round((ci.completedCount / habit.targetPerDay) * 100), 100);
  });

  return { id: habit._id, name: habit.name, category: habit.category, currentStreak, longestStreak, total, bars };
}

function buildYearHeatmap(
  activeHabits:    Habit[],
  checkInsByHabit: Map<string, Map<string, CheckIn>>,
): { date: string; pct: number }[][] {
  const today = new Date(TODAY + "T00:00:00");
  const dayOfWeek = (today.getDay() + 6) % 7;
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - dayOfWeek - 51 * 7);

  return Array.from({ length: 52 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + w * 7 + d);
      const dateStr = fmtDate(date);
      if (dateStr > TODAY) return { date: dateStr, pct: -1 };
      const done = activeHabits.filter(h =>
        checkInsByHabit.get(h._id)?.get(dateStr)?.status === "Completed"
      ).length;
      return {
        date: dateStr,
        pct: activeHabits.length > 0
          ? Math.round((done / activeHabits.length) * 100)
          : 0,
      };
    })
  );
}

function getMonthPositions(weeks: { date: string; pct: number }[][]): { label: string; weekIdx: number }[] {
  const positions: { label: string; weekIdx: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, i) => {
    if (week.length > 0) {
      const month = new Date(week[0].date + "T00:00:00").getMonth();
      if (month !== lastMonth) {
        positions.push({ label: MONTH_LABELS[month], weekIdx: i });
        lastMonth = month;
      }
    }
  });
  return positions;
}

function heatCellClass(pct: number): string {
  if (pct < 0)   return styles.cellFuture;
  if (pct === 0) return styles.cellEmpty;
  if (pct < 34)  return styles.cellLow;
  if (pct < 67)  return styles.cellMid;
  if (pct < 100) return styles.cellHigh;
  return styles.cellFull;
}

function barColorClass(pct: number): string {
  if (pct < 0)   return styles.barFuture;
  if (pct === 0) return styles.barEmpty;
  if (pct >= 100) return styles.barFull;
  return styles.barPartial;
}

// ── Summary Cards ─────────────────────────────────────────────────────────────

function SummaryCards({ summary }: { summary: SummaryData }) {
  const changeText = summary.activeChange === 0
    ? "same as last week"
    : `${summary.activeChange > 0 ? "+" : ""}${summary.activeChange} from last week`;

  return (
    <div className={styles.summaryGrid}>

      <div className={styles.summaryCard}>
        <p className={styles.summaryLabel}>COMPLETED TODAY</p>
        <div className={styles.summaryRow}>
          <strong className={styles.summaryValue}>{summary.todayPct}%</strong>
          <div className={`${styles.summaryIcon} ${styles.iconPink}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m8.5 12 2.5 2.5L16 9" />
              <circle cx="12" cy="12" r="8" />
            </svg>
          </div>
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${summary.todayPct}%` }} />
        </div>
      </div>

      <div className={styles.summaryCard}>
        <p className={styles.summaryLabel}>ACTIVE HABITS</p>
        <div className={styles.summaryRow}>
          <strong className={styles.summaryValue}>{summary.activeCount}</strong>
          <div className={`${styles.summaryIcon} ${styles.iconGray}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8Z" />
            </svg>
          </div>
        </div>
        <p className={styles.summarySubtext}>{changeText}</p>
      </div>

      <div className={styles.summaryCard}>
        <p className={styles.summaryLabel}>HABITS AT RISK</p>
        <div className={styles.summaryRow}>
          <strong className={`${styles.summaryValue} ${summary.atRiskCount > 0 ? styles.summaryValueRisk : ""}`}>
            {summary.atRiskCount}
          </strong>
          <div className={`${styles.summaryIcon} ${summary.atRiskCount > 0 ? styles.iconRed : styles.iconGray}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 4 9 16H3L12 4Z" />
              <path d="M12 9v4M12 17h.01" />
            </svg>
          </div>
        </div>
        <p className={`${styles.summarySubtext} ${summary.atRiskCount > 0 ? styles.summarySubtextRisk : ""}`}>
          {summary.atRiskCount > 0 ? "Requires attention" : "All on track"}
        </p>
      </div>

    </div>
  );
}

// ── Chart type tabs ───────────────────────────────────────────────────────────

const CHART_TABS: { key: ChartView; label: string; icon: React.ReactNode }[] = [
  {
    key: "bar", label: "Bar",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="12" width="4" height="9" rx="1" /><rect x="10" y="7" width="4" height="14" rx="1" /><rect x="17" y="3" width="4" height="18" rx="1" />
      </svg>
    ),
  },
  {
    key: "line", label: "Line",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 17 9 11 14 14 21 7" />
      </svg>
    ),
  },
  {
    key: "pie", label: "Pie",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" /><path d="M12 3v9l6.36 6.36" />
      </svg>
    ),
  },
  {
    key: "heatmap", label: "Heatmap",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
];

function ChartTypeTabs({ active, onChange }: { active: ChartView; onChange: (v: ChartView) => void }) {
  return (
    <div className={styles.chartTabs}>
      {CHART_TABS.map(tab => (
        <button
          key={tab.key}
          className={`${styles.chartTab} ${active === tab.key ? styles.chartTabActive : ""}`}
          onClick={() => onChange(tab.key)}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ── Habit stat card ───────────────────────────────────────────────────────────

function HabitStatCard({ stat }: { stat: HabitStatData }) {
  const categorySlug = stat.category.toLowerCase();

  return (
    <div className={styles.habitCard}>

      <div className={styles.habitCardHeader}>
        <div className={styles.habitCardInfo}>
          <h3 className={styles.habitCardName}>{stat.name}</h3>
          <span className={`chip chip-category-${categorySlug}`}>
            {stat.category.toUpperCase()}
          </span>
        </div>
        <button className={styles.habitMenuBtn} aria-label="Options">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
          </svg>
        </button>
      </div>

      <div className={styles.habitStats}>
        {[
          { label: "CURRENT STREAK", value: `${stat.currentStreak} day${stat.currentStreak !== 1 ? "s" : ""}` },
          { label: "LONGEST STREAK", value: `${stat.longestStreak} day${stat.longestStreak !== 1 ? "s" : ""}` },
          { label: "TOTAL",          value: String(stat.total) },
        ].map(({ label, value }) => (
          <div key={label} className={styles.habitStat}>
            <span className={styles.habitStatLabel}>{label}</span>
            <strong className={styles.habitStatValue}>{value}</strong>
          </div>
        ))}
      </div>

      <div className={styles.weekBars}>
        {stat.bars.map((bar, i) => (
          <div key={i} className={styles.weekBarCol}>
            <div className={styles.weekBarTrack}>
              <div
                className={`${styles.weekBar} ${barColorClass(bar)}`}
                style={{ height: bar <= 0 ? (bar === 0 ? "4px" : "0px") : `${bar}%` }}
              />
            </div>
            <span className={styles.weekBarLabel}>{WEEK_LABELS[i]}</span>
          </div>
        ))}
      </div>

    </div>
  );
}

// ── Consistency Mosaic ────────────────────────────────────────────────────────

const CELL_WIDTH = 15; // 12px cell + 3px gap

function ConsistencyMosaic({ weeks }: { weeks: { date: string; pct: number }[][] }) {
  const monthPositions = useMemo(() => getMonthPositions(weeks), [weeks]);

  return (
    <div className={styles.mosaic}>
      <div className={styles.mosaicGrid}>
        {weeks.map((week, w) => (
          <div key={w} className={styles.mosaicCol}>
            {week.map((day, d) => (
              <div
                key={d}
                className={`${styles.mosaicCell} ${heatCellClass(day.pct)}`}
                title={day.pct < 0 ? day.date : `${day.date}: ${day.pct}%`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className={styles.mosaicMonthRow}>
        {monthPositions.map(({ label, weekIdx }) => (
          <span
            key={label + weekIdx}
            className={styles.mosaicMonth}
            style={{ left: weekIdx * CELL_WIDTH }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className={styles.content}>
      <div className={styles.summaryGrid}>
        {[0, 1, 2].map(i => (
          <div key={i} className={`${styles.summaryCard} ${styles.skeleton}`} style={{ height: 128 }} />
        ))}
      </div>
      <div className={styles.habitGrid}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`${styles.habitCard} ${styles.skeleton}`} style={{ height: 220 }} />
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate  = useNavigate();
  const [chartView, setChartView] = useState<ChartView>("bar");

  const { habits, loading: habitsLoading } = useHabitContext();
  const [allCheckIns,      setAllCheckIns]      = useState<CheckIn[]>([]);
  const [checkInsLoading,  setCheckInsLoading]  = useState(true);

  useEffect(() => {
    let alive = true;
    setCheckInsLoading(true);
    getCheckIns()
      .then(data  => { if (alive) setAllCheckIns(data); })
      .catch(()   => {})
      .finally(() => { if (alive) setCheckInsLoading(false); });
    return () => { alive = false; };
  }, []);

  const checkInsByHabit = useMemo(() => {
    const map = new Map<string, Map<string, CheckIn>>();
    for (const ci of allCheckIns) {
      if (!map.has(ci.habitId)) map.set(ci.habitId, new Map());
      map.get(ci.habitId)!.set(ci.date, ci);
    }
    return map;
  }, [allCheckIns]);

  const activeHabits = useMemo(() => habits.filter(h => h.status === "Active"), [habits]);

  const summary = useMemo(
    () => computeSummary(activeHabits, checkInsByHabit),
    [activeHabits, checkInsByHabit],
  );

  const habitStats = useMemo(
    () => activeHabits.map(h => computeHabitStat(h, checkInsByHabit.get(h._id) ?? new Map())),
    [activeHabits, checkInsByHabit],
  );

  const yearHeatmap = useMemo(
    () => buildYearHeatmap(activeHabits, checkInsByHabit),
    [activeHabits, checkInsByHabit],
  );

  const isLoading = habitsLoading || checkInsLoading;

  if (isLoading) {
    return (
      <AppLayout onNewHabit={() => navigate("/habits")}>
        <DashboardSkeleton />
      </AppLayout>
    );
  }

  return (
    <AppLayout onNewHabit={() => navigate("/habits")}>
      <div className={styles.content}>

        {/* Page header */}
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Statistics Dashboard</h1>
          <div className={styles.pageHeaderRight}>
            <div className={styles.syncBadge}>
              <span className={styles.syncDot} />
              Syncing data
            </div>
            <button className={styles.addBtn} onClick={() => navigate("/habits")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Habit
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <SummaryCards summary={summary} />

        {/* Habit Breakdown */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Habit Breakdown</h2>
              <p className={styles.sectionSubtitle}>
                Detailed performance analytics across your tracked activities and mindfulness routines.
              </p>
            </div>
            <ChartTypeTabs active={chartView} onChange={setChartView} />
          </div>

          {activeHabits.length === 0 ? (
            <div className={styles.empty}>
              <p>No active habits yet.</p>
              <button className={styles.emptyLink} onClick={() => navigate("/habits")}>
                Add your first habit →
              </button>
            </div>
          ) : (
            <div className={styles.habitGrid}>
              {habitStats.map(stat => (
                <HabitStatCard key={stat.id} stat={stat} />
              ))}
            </div>
          )}
        </section>

        {/* Consistency Mosaic */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Consistency Mosaic</h2>
              <p className={styles.sectionSubtitle}>
                A bird&apos;s eye view of your annual growth and daily commitment.
              </p>
            </div>
            <div className={styles.mosaicLegend}>
              <span className={styles.legendLabel}>Less</span>
              <div className={`${styles.legendCell} ${styles.cellEmpty}`} />
              <div className={`${styles.legendCell} ${styles.cellLow}`} />
              <div className={`${styles.legendCell} ${styles.cellMid}`} />
              <div className={`${styles.legendCell} ${styles.cellHigh}`} />
              <div className={`${styles.legendCell} ${styles.cellFull}`} />
              <span className={styles.legendLabel}>More</span>
            </div>
          </div>

          <div className={styles.mosaicCard}>
            <ConsistencyMosaic weeks={yearHeatmap} />
          </div>
        </section>

      </div>
    </AppLayout>
  );
}
