import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import Footer from "../../components/layout/Footer";
import { useSettings } from "../../context/SettingsContext";
import { useHabitContext } from "../../context/HabitContext";
import { getCheckIns } from "../../api/checkins";
import type { CheckIn, Habit } from "../../types";
import styles from "./DashboardPage.module.css";

// ── Types ─────────────────────────────────────────────────────────────────────

type DateRange = "7 Days" | "30 Days" | "Year";
type SortKey   = "default" | "rate" | "streak" | "name";
type Category  = string;

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "default", label: "Default"              },
  { key: "rate",    label: "Rate (high → low)"    },
  { key: "streak",  label: "Streak (long → short)"},
  { key: "name",    label: "Name (A → Z)"         },
];

// ── Category display config ───────────────────────────────────────────────────

const CATEGORY_DISPLAY: Record<string, {
  tone:     "blue" | "mint" | "amber";
  icon:     "run"  | "drop" | "mind";
  dotClass: "blueDot" | "mintDot" | "brownDot";
  letter:   string;
}> = {
  Health:      { tone: "mint",  icon: "drop", dotClass: "mintDot",  letter: "H" },
  Study:       { tone: "blue",  icon: "mind", dotClass: "blueDot",  letter: "S" },
  Work:        { tone: "blue",  icon: "run",  dotClass: "blueDot",  letter: "W" },
  Mindfulness: { tone: "amber", icon: "mind", dotClass: "brownDot", letter: "M" },
  Other:       { tone: "blue",  icon: "run",  dotClass: "blueDot",  letter: "O" },
};

function categoryDisplay(cat: string) {
  return CATEGORY_DISPLAY[cat] ?? CATEGORY_DISPLAY.Other;
}

// ── Computed stat type ────────────────────────────────────────────────────────

interface HabitStat {
  id:        string;
  name:      string;
  category:  string;
  frequency: string;
  tone:      "blue" | "mint" | "amber";
  icon:      "run"  | "drop" | "mind";
  dotClass:  "blueDot" | "mintDot" | "brownDot";
  streak:    number;
  longest:   string;
  total:     string;
  rate:      string;
  rateNum:   number;
  bars:      number[];
  badge:     string;
  badgeIcon: "fire" | "down";
  badgeTone: "blue" | "amber" | "red";
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function fmtDate(d: Date): string {
  const y  = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const dy = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${dy}`;
}

function buildDateRange(days: number, endDate: string): string[] {
  const end = new Date(endDate + "T00:00:00");
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(end);
    d.setDate(end.getDate() - (days - 1 - i));
    return fmtDate(d);
  });
}

// ── Week navigator helpers ────────────────────────────────────────────────────

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function buildViewWeek(weekOffset: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const mondayOff = (today.getDay() + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - mondayOff + weekOffset * 7);
  const todayStr = fmtDate(new Date());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const iso = fmtDate(d);
    return { label: DAY_LABELS[i], date: d.getDate(), month: d.getMonth(), iso, isToday: iso === todayStr };
  });
}

// ── DateNavigator component ───────────────────────────────────────────────────

function ChevronLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function DateNavigator({
  weekOffset, selectedDate,
  onPrevWeek, onNextWeek, onSelectDate, onToday,
}: {
  weekOffset: number; selectedDate: string;
  onPrevWeek: () => void; onNextWeek: () => void;
  onSelectDate: (d: string) => void; onToday: () => void;
}) {
  const days = buildViewWeek(weekOffset);
  const start = new Date(days[0].iso + "T00:00:00");
  const end   = new Date(days[6].iso + "T00:00:00");
  const monthLabel = start.getMonth() === end.getMonth()
    ? `${MONTH_NAMES[start.getMonth()]} ${start.getFullYear()}`
    : `${MONTH_NAMES[start.getMonth()]} – ${MONTH_NAMES[end.getMonth()]} ${end.getFullYear()}`;
  const todayStr = fmtDate(new Date());

  return (
    <div className={styles.dateNav}>
      {/* Row 1: month label + today shortcut */}
      <div className={styles.dateNavHeader}>
        <div className={styles.dateNavLeft}>
          <button className={styles.navArrowBtn} onClick={onPrevWeek} aria-label="Previous week">
            <ChevronLeft />
          </button>
          <button className={styles.navArrowBtn} onClick={onNextWeek} aria-label="Next week">
            <ChevronRight />
          </button>
          <span className={styles.dateNavMonth}>{monthLabel}</span>
        </div>
        {weekOffset !== 0 && (
          <button className={styles.todayBtn} onClick={onToday}>↩ Today</button>
        )}
      </div>

      {/* Row 2: day cells */}
      <div className={styles.dateNavStrip}>
        {days.map(day => {
          const isPast   = day.iso < todayStr;
          const isFuture = day.iso > todayStr;
          const isSelected = day.iso === selectedDate;
          return (
            <button
              key={day.iso}
              className={[
                styles.dayCell,
                isSelected           ? styles.dayCellSelected : "",
                day.isToday && !isSelected ? styles.dayCellToday : "",
                isFuture             ? styles.dayCellFuture   : "",
                isPast               ? styles.dayCellPast     : "",
              ].filter(Boolean).join(" ")}
              onClick={() => onSelectDate(day.iso)}
            >
              <span className={styles.dayLabel}>{day.label}</span>
              <span className={styles.dayNum}>{day.date}</span>
              {day.isToday && <span className={styles.todayDot} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function rangeDays(range: DateRange): number {
  if (range === "7 Days")  return 7;
  if (range === "30 Days") return 30;
  return 365;
}

// ── Per-habit stat computation ────────────────────────────────────────────────

function computeHabitStat(
  habit: Habit,
  checkInMap: Map<string, CheckIn>,
  days: number,
  endDate: string,
): HabitStat {
  const dates   = buildDateRange(days, endDate);
  const display = categoryDisplay(habit.category);

  const rates = dates.map(dateStr => {
    const ci = checkInMap.get(dateStr);
    if (!ci || ci.completedCount <= 0) return 0;
    return Math.min(ci.completedCount / habit.targetPerDay, 1);
  });

  const isDone = (r: number) => r >= 1;

  let streak = 0;
  for (let i = rates.length - 1; i >= 0; i--) {
    if (isDone(rates[i])) streak++;
    else break;
  }

  let longest = 0, cur = 0;
  for (const r of rates) {
    if (isDone(r)) { cur++; longest = Math.max(longest, cur); }
    else cur = 0;
  }

  const completedDays = rates.filter(isDone).length;
  const rateNum = days > 0 ? Math.round((completedDays / days) * 100) : 0;

  let bars: number[];
  if (days <= 30) {
    bars = rates.map(r => Math.round(r * 100));
  } else {
    bars = Array.from({ length: 52 }, (_, w) => {
      const week = rates.slice(w * 7, w * 7 + 7);
      if (!week.length) return 0;
      return Math.round((week.reduce((s, r) => s + r, 0) / week.length) * 100);
    });
  }

  const freqLabel = habit.frequency === "Daily"
    ? `Daily · ${habit.targetPerDay}× per day`
    : `${habit.specificDays.join(", ")} · ${habit.targetPerDay}× per day`;

  return {
    id:        habit._id,
    name:      habit.name,
    category:  habit.category,
    frequency: freqLabel,
    tone:      display.tone,
    icon:      display.icon,
    dotClass:  display.dotClass,
    streak,
    longest:   `${longest}d`,
    total:     `${completedDays}`,
    rate:      `${rateNum}%`,
    rateNum,
    bars,
    badge:     streak >= 1 ? `${streak} day${streak > 1 ? "s" : ""}` : "0 days",
    badgeIcon: streak >= 3 ? "fire" : "down",
    badgeTone: streak >= 3 ? (display.tone === "amber" ? "amber" : "blue") : "red",
  };
}

// ── Summary computation ───────────────────────────────────────────────────────

function computeSummary(
  activeHabits: Habit[],
  checkInsByHabit: Map<string, Map<string, CheckIn>>,
  days: number,
  tFn: (k: string) => string,
  selectedDate: string,
) {
  const today     = selectedDate;
  const yesterday = fmtDate(new Date(new Date(selectedDate + "T00:00:00").getTime() - 86_400_000));
  const dates     = buildDateRange(days, selectedDate);

  const todayDone = activeHabits.filter(h =>
    checkInsByHabit.get(h._id)?.get(today)?.status === "Completed"
  ).length;
  const todayPct = activeHabits.length
    ? Math.round((todayDone / activeHabits.length) * 100)
    : 0;

  const yestDone = activeHabits.filter(h =>
    checkInsByHabit.get(h._id)?.get(yesterday)?.status === "Completed"
  ).length;
  const yestPct = activeHabits.length
    ? Math.round((yestDone / activeHabits.length) * 100)
    : 0;
  const diff = todayPct - yestPct;
  const diffLabel = diff === 0
    ? "same as yesterday"
    : `${diff > 0 ? "+" : ""}${diff}% ${tFn("vsLastPeriod")}`;

  const activeCount = activeHabits.filter(h => {
    const hMap = checkInsByHabit.get(h._id);
    return dates.some(d => (hMap?.get(d)?.completedCount ?? 0) > 0);
  }).length;

  const atRisk = activeHabits.filter(h => {
    const hMap = checkInsByHabit.get(h._id);
    const done = dates.filter(d => hMap?.get(d)?.status === "Completed").length;
    return (done / dates.length) < 0.5;
  });

  let maxStreak = 0;
  for (const h of activeHabits) {
    const hMap = checkInsByHabit.get(h._id);
    let s = 0;
    for (let i = dates.length - 1; i >= 0; i--) {
      if (hMap?.get(dates[i])?.status === "Completed") s++;
      else break;
    }
    maxStreak = Math.max(maxStreak, s);
  }

  return { todayPct, diffLabel, activeCount, atRisk, progressWidth: `${todayPct}%`, maxStreak };
}

// ── Filter dropdown ───────────────────────────────────────────────────────────

interface FilterDropdownProps {
  categories: Category[];
  category:   Category;
  sort:       SortKey;
  onCategory: (c: Category) => void;
  onSort:     (s: SortKey) => void;
  onClose:    () => void;
}

function FilterDropdown({ categories, category, sort, onCategory, onSort, onClose }: FilterDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div ref={ref} className={styles.filterDropdown}>
      <div className={styles.filterSection}>
        <p className={styles.filterLabel}>Category</p>
        {["All", ...categories].map((c) => (
          <button
            key={c}
            className={`${styles.filterOption} ${category === c ? styles.filterOptionActive : ""}`}
            onClick={() => onCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>
      <div className={styles.filterDivider} />
      <div className={styles.filterSection}>
        <p className={styles.filterLabel}>Sort by</p>
        {SORT_OPTIONS.map((o) => (
          <button
            key={o.key}
            className={`${styles.filterOption} ${sort === o.key ? styles.filterOptionActive : ""}`}
            onClick={() => onSort(o.key)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Icon components ───────────────────────────────────────────────────────────

function TrendIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 16h16M7 12h10M10 8h4" />
    </svg>
  );
}

function HabitIcon({ type }: { type: string }) {
  if (type === "drop") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3s6 6.2 6 11a6 6 0 0 1-12 0c0-4.8 6-11 6-11Z" />
        <path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5" />
      </svg>
    );
  }
  if (type === "mind") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 5a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
        <path d="M7 19c1.8-1.8 3.5-2.7 5-2.7s3.2.9 5 2.7M6 14l3-3 3 3 3-3 3 3" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13 5 9 9l4 3-3 7M14 12l3 2 2-3M10 9 6 8M15 4h.01" />
    </svg>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className={styles.content}>
      <div className={styles.dashboardSection}>
        <div className={styles.rangeRow}>
          {[0, 1, 2].map(i => (
            <div key={i} className={styles.skeletonPill} />
          ))}
        </div>
        <div className={styles.summaryGrid}>
          {[0, 1, 2].map(i => (
            <div key={i} className={`${styles.summaryCard} ${styles.skeletonCard}`}>
              <div className={styles.skeletonLine} style={{ width: "40%", height: 14, marginBottom: 12 }} />
              <div className={styles.skeletonLine} style={{ width: "60%", height: 40 }} />
            </div>
          ))}
        </div>
        <div className={styles.habitGrid}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`${styles.habitCard} ${styles.skeletonCard}`}>
              <div className={styles.skeletonLine} style={{ width: "70%", height: 18, marginBottom: 16 }} />
              <div className={styles.skeletonLine} style={{ width: "100%", height: 58 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const [range, setRange]           = useState<DateRange>("7 Days");
  const [filterOpen, setFilterOpen] = useState(false);
  const [category, setCategory]     = useState<Category>("All");
  const [sort, setSort]             = useState<SortKey>("default");
  const [selectedDate, setSelectedDate] = useState(() => fmtDate(new Date()));
  const [weekOffset, setWeekOffset]     = useState(0);
  const { t }                        = useSettings();

  const { habits, loading: habitsLoading } = useHabitContext();
  const [allCheckIns, setAllCheckIns]      = useState<CheckIn[]>([]);
  const [checkInsLoading, setCheckInsLoading] = useState(true);

  // Fetch all check-ins once on mount
  useEffect(() => {
    let alive = true;
    setCheckInsLoading(true);
    getCheckIns()
      .then(data  => { if (alive) setAllCheckIns(data); })
      .catch(() => {})
      .finally(() => { if (alive) setCheckInsLoading(false); });
    return () => { alive = false; };
  }, []);

  // Rebuild lookup whenever check-ins change: habitId → date → CheckIn
  const checkInsByHabit = useMemo(() => {
    const map = new Map<string, Map<string, CheckIn>>();
    for (const ci of allCheckIns) {
      if (!map.has(ci.habitId)) map.set(ci.habitId, new Map());
      map.get(ci.habitId)!.set(ci.date, ci);
    }
    return map;
  }, [allCheckIns]);

  const days         = rangeDays(range);
  const activeHabits = useMemo(() => habits.filter(h => h.status === "Active"), [habits]);

  const summary = useMemo(
    () => computeSummary(activeHabits, checkInsByHabit, days, t, selectedDate),
    [activeHabits, checkInsByHabit, days, t, selectedDate],
  );

  const categories = useMemo(
    () => [...new Set(activeHabits.map(h => h.category))].sort(),
    [activeHabits],
  );

  const habitStats = useMemo(() => {
    let list = activeHabits.map(h =>
      computeHabitStat(h, checkInsByHabit.get(h._id) ?? new Map(), days, selectedDate)
    );
    if (category !== "All") list = list.filter(h => h.category === category);
    if (sort === "rate")   list = [...list].sort((a, b) => b.rateNum - a.rateNum);
    if (sort === "streak") list = [...list].sort((a, b) => b.streak  - a.streak);
    if (sort === "name")   list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [activeHabits, checkInsByHabit, days, category, sort, selectedDate]);

  const chartLabel = range === "Year"
    ? t("lastWeeksActivity")
    : t("lastDaysActivity").replace("{n}", String(days));

  const hasActiveFilter = category !== "All" || sort !== "default";
  const isLoading = habitsLoading || checkInsLoading;

  // Category initials for avatar stack
  const categoryLetters = useMemo(() =>
    [...new Set(activeHabits.map(h => categoryDisplay(h.category).letter))].slice(0, 3),
    [activeHabits],
  );

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

        <section className={styles.dashboardSection}>

          {/* Scrollable date navigator */}
          <DateNavigator
            weekOffset={weekOffset}
            selectedDate={selectedDate}
            onPrevWeek={() => setWeekOffset(w => w - 1)}
            onNextWeek={() => setWeekOffset(w => w + 1)}
            onSelectDate={(d) => {
              setSelectedDate(d);
              // sync week view to the week containing the selected date
              const today = new Date(); today.setHours(0, 0, 0, 0);
              const sel   = new Date(d + "T00:00:00");
              const diffDays = Math.round((sel.getTime() - today.getTime()) / 86_400_000);
              setWeekOffset(Math.floor((diffDays + ((today.getDay() + 6) % 7)) / 7));
            }}
            onToday={() => { setWeekOffset(0); setSelectedDate(fmtDate(new Date())); }}
          />

          {/* Date range picker */}
          <div className={styles.rangeRow}>
            {(["7 Days", "30 Days", "Year"] as DateRange[]).map((r) => (
              <button
                key={r}
                className={`${styles.rangeBtn} ${range === r ? styles.rangeBtnActive : ""}`}
                onClick={() => setRange(r)}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Summary cards */}
          <div className={styles.summaryGrid}>

            {/* Completed Today */}
            <article className={styles.summaryCard}>
              <div className={styles.cardTop}>
                <span className={`${styles.summaryIcon} ${styles.blue}`}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m8.5 12 2.5 2.5L16 9" />
                    <circle cx="12" cy="12" r="8" />
                  </svg>
                </span>
                <span className={`${styles.statusText} ${styles.blueText}`}>{summary.diffLabel}</span>
              </div>
              <p>{t("completedToday")}</p>
              <div className={styles.metric}>
                <strong>{summary.todayPct}%</strong>
                <span>/ 100</span>
              </div>
              <div className={styles.progressTrack}>
                <span style={{ width: summary.progressWidth }} />
              </div>
            </article>

            {/* Active Habits */}
            <article className={styles.summaryCard}>
              <div className={styles.cardTop}>
                <span className={`${styles.summaryIcon} ${styles.green}`}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 17 17 7M7 7h10v10" />
                  </svg>
                </span>
                <span className={`${styles.statusText} ${styles.greenText}`}>{t("consistent")}</span>
              </div>
              <p>{t("activeHabits")}</p>
              <div className={styles.metric}>
                <strong>{summary.activeCount}</strong>
                <span>{t("inRange")} {t(range)}</span>
              </div>
              <div className={styles.avatarStack} aria-label="Habit categories">
                {categoryLetters.map((l, i) => <span key={i}>{l}</span>)}
                {activeHabits.length > 3 && (
                  <span>+{activeHabits.length - 3}</span>
                )}
              </div>
            </article>

            {/* Habits at Risk */}
            <article className={styles.summaryCard}>
              <div className={styles.cardTop}>
                <span className={`${styles.summaryIcon} ${styles.red}`}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m12 4 9 16H3L12 4Z" />
                    <path d="M12 9v4M12 17h.01" />
                  </svg>
                </span>
                <span className={`${styles.statusText} ${styles.redText}`}>
                  {summary.atRisk.length > 0 ? t("actionNeeded") : t("allGood")}
                </span>
              </div>
              <p>{t("habitsAtRisk")}</p>
              <div className={styles.metric}>
                <strong>{summary.atRisk.length}</strong>
                <span>{t("potentialBreak")}</span>
              </div>
              {summary.atRisk.length > 0 ? (
                <em className={styles.riskList}>
                  {summary.atRisk.map((h) => `"${h.name}"`).join(" & ")}
                </em>
              ) : (
                <em className={styles.riskList} style={{ color: "#45645e" }}>
                  {t("allOnTrack")}
                </em>
              )}
            </article>

          </div>

          {/* Habit breakdown */}
          <section className={styles.breakdown}>
            <div className={styles.sectionHeader}>
              <h2>{t("habitBreakdown")}</h2>
              <div className={styles.filterWrapper}>
                <button
                  className={`${styles.filterButton} ${hasActiveFilter || filterOpen ? styles.filterActive : ""}`}
                  aria-label="Filter habits"
                  onClick={() => setFilterOpen((v) => !v)}
                >
                  <TrendIcon />
                </button>
                {filterOpen && (
                  <FilterDropdown
                    categories={categories}
                    category={category}
                    sort={sort}
                    onCategory={(c) => setCategory(c)}
                    onSort={(s) => setSort(s)}
                    onClose={() => setFilterOpen(false)}
                  />
                )}
              </div>
            </div>

            {activeHabits.length === 0 ? (
              <p className={styles.emptyFilter}>
                No active habits yet. <button onClick={() => navigate("/habits")} style={{ color: "var(--color-primary)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Add one →</button>
              </p>
            ) : habitStats.length === 0 ? (
              <p className={styles.emptyFilter}>No habits found for "{category}".</p>
            ) : (
              <div className={styles.habitGrid}>
                {habitStats.map((habit, index) => {
                  const showCategory =
                    index === 0 || habitStats[index - 1].category !== habit.category;

                  return (
                    <div className={styles.habitGroup} key={habit.id}>
                      {showCategory ? (
                        <h3 className={styles.categoryLabel}>
                          <span className={styles[habit.dotClass]} />
                          {t(habit.category)}
                        </h3>
                      ) : (
                        <div className={styles.categorySpacer} />
                      )}
                      <article className={styles.habitCard}>
                        <div className={styles.habitHeader}>
                          <span className={`${styles.habitIcon} ${styles[habit.tone]}`}>
                            <HabitIcon type={habit.icon} />
                          </span>
                          <div>
                            <h4>{habit.name}</h4>
                            <p>{habit.frequency}</p>
                          </div>
                          <span className={`${styles.badge} ${styles[`${habit.badgeTone}Badge`]}`}>
                            {habit.badge}
                            {habit.badgeIcon === "fire" ? (
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M12 22c4 0 7-2.8 7-6.8 0-2.7-1.4-5.2-4.2-7.5.1 2.1-.7 3.4-2.1 4.1.2-3.3-1.4-6-4.4-8.1.2 3.3-1 5.4-2.3 7.1A7 7 0 0 0 5 15.2C5 19.2 8 22 12 22Z" />
                              </svg>
                            ) : (
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="m7 7 10 10M17 17H9M17 17V9" />
                              </svg>
                            )}
                          </span>
                        </div>

                        <div className={styles.statGrid}>
                          {[
                            { label: t("longest"), value: habit.longest },
                            { label: t("total"),   value: habit.total   },
                            { label: t("rate"),    value: habit.rate    },
                          ].map(({ label, value }) => (
                            <div key={label}>
                              <span>{label}</span>
                              <strong>{value}</strong>
                            </div>
                          ))}
                        </div>

                        <p className={styles.chartLabel}>{chartLabel}</p>
                        <div
                          className={`${styles.bars} ${styles[`${habit.tone}Bars`]}`}
                          style={{ gridTemplateColumns: `repeat(${habit.bars.length}, 1fr)` }}
                        >
                          {habit.bars.map((height, i) => (
                            <span key={i} style={{ height: `${Math.max(4, height)}%` }} />
                          ))}
                        </div>
                      </article>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Banner */}
          <section className={styles.banner}>
            <img
              alt=""
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAanMMqLfbMWVb7Jqznbi1GBuGhoSYPAg5AcIJYym-fKC0LCr7UUGsl5wzY5BXjbPfUfUciI2-gVEfD7G_fRsGMYchGPt_i52dYzFAzVZIMc-omSp2-c7QJ5_WqLWLB_ohSOeuap1B2mCJVZgWYLNQLScPRZegzAL00wO2B56jTzFAMpKvnPd9tTNb60TSWA7ztSOxJEo-xkUayNC9o4TfmN2w6_k3UhfKVNXQ90Z8B1LcEHsIv9SxhzD1_IAooJ4YkSomISvwMpqBh"
            />
            <div className={styles.bannerOverlay}>
              <span>{t("consistencyTip")}</span>
              <h2>
                {summary.maxStreak > 0
                  ? `You're on a ${summary.maxStreak}-day streak!`
                  : "Start your streak today!"}
              </h2>
              <p>The best way to predict the future is to create it, one habit at a time.</p>
            </div>
          </section>

        </section>

        <Footer />
      </div>
    </AppLayout>
  );
}
