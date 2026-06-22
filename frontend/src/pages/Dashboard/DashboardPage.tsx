import { useState, useMemo, useRef, useEffect } from "react";
import { BookOpen, Brain, Briefcase, Heart, Sparkles, TrendingUp, type LucideIcon } from "lucide-react";
import AppLayout from "../../components/layout/AppLayout";
import Footer from "../../components/layout/Footer";
import { DATE_RANGES, useSettings } from "../../context/SettingsContext";
import styles from "./DashboardPage.module.css";
import { CheckIn, Habit } from "@/types";
import { getHabits } from "@/api/habits";
import { getCheckIns } from "@/api/checkins";
import { calcPerfectDayStreak } from "@/utils/perfectDayStreakCalculator";
import { Flame } from "lucide-react";

type DateRange = "7 Days" | "30 Days" | "Year";
type SortKey = "default" | "rate" | "streak" | "name";
type CategoryKey = "Health" | "Study" | "Work" | "Mindfulness" | "Other";
type CategoryFilter = "All" | CategoryKey;
type ChartView = "bar" | "line" | "heatmap";
type HeatmapMode = "category" | "task";
type HabitWithComputed = DashboardHabit & { computed: ReturnType<typeof computeStats> };

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "default", label: "Default" },
  { key: "rate", label: "Rate (high → low)" },
  { key: "streak", label: "Streak (long → short)" },
  { key: "name", label: "Name (A → Z)" },
];

interface DashboardHabit {
  id: string;
  name: string;
  categoryKey: CategoryKey;
  category: string;
  time: string;
  dailyRates: number[];
}

const CATEGORY_ORDER: CategoryKey[] = ["Health", "Study", "Work", "Mindfulness", "Other"];
const CATEGORY_LABEL: Record<CategoryKey, string> = {
  Health: "Health",
  Study: "Study",
  Work: "Work",
  Mindfulness: "Mindfulness",
  Other: "Other",
};

const CATEGORY_LINE_COLOR: Record<CategoryKey, string> = {
  Health: "var(--color-category-health-text)",
  Study: "var(--color-category-study-text)",
  Work: "var(--color-category-work-text)",
  Mindfulness: "var(--color-category-mindfulness-text)",
  Other: "var(--color-category-other-text)",
};

const CATEGORY_ICONS: Record<CategoryKey, LucideIcon> = {
  Health: Heart,
  Study: BookOpen,
  Work: Briefcase,
  Mindfulness: Brain,
  Other: Sparkles,
};

const CATEGORY_DOT_CLASS: Record<CategoryKey, string> = {
  Health: styles.categoryDotHealth,
  Study: styles.categoryDotStudy,
  Work: styles.categoryDotWork,
  Mindfulness: styles.categoryDotMindfulness,
  Other: styles.categoryDotOther,
};

const CATEGORY_ICON_CLASS: Record<CategoryKey, string> = {
  Health: styles.categoryIconHealth,
  Study: styles.categoryIconStudy,
  Work: styles.categoryIconWork,
  Mindfulness: styles.categoryIconMindfulness,
  Other: styles.categoryIconOther,
};

const CATEGORY_BAR_CLASS: Record<CategoryKey, string> = {
  Health: styles.categoryBarHealth,
  Study: styles.categoryBarStudy,
  Work: styles.categoryBarWork,
  Mindfulness: styles.categoryBarMindfulness,
  Other: styles.categoryBarOther,
};

const CATEGORY_BADGE_CLASS: Record<CategoryKey, string> = {
  Health: styles.categoryBadgeHealth,
  Study: styles.categoryBadgeStudy,
  Work: styles.categoryBadgeWork,
  Mindfulness: styles.categoryBadgeMindfulness,
  Other: styles.categoryBadgeOther,
};

function buildDailyRates(
  targetPerDay: number,
  checkInMap: Map<string, number>,
  totalDays = 365
): number[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: totalDays }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (totalDays - 1 - i));
    const dateKey = d.toISOString().slice(0, 10);
    const count = checkInMap.get(dateKey) ?? 0;
    return Math.min(1, count / Math.max(1, targetPerDay));
  });
}

function rangeDays(range: DateRange): number {
  if (range === "7 Days") return 7;
  if (range === "30 Days") return 30;
  return 365;
}

function formatDayMonth(d: Date): string {
  return `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })}`;
}

function HalfDonut({ pct }: { pct: number }) {
  const r = 70;
  const cx = 100;
  const cy = 100;
  const strokeWidth = 14;

  // Arc length of full semicircle
  const totalArc = Math.PI * r;  // πr for a half circle

  // How much of the arc to fill
  const filled = (pct / 100) * totalArc;
  const empty = totalArc - filled;

  // The track arc: M left → arc right (180° sweep)
  // The fill arc: same path, dasharray controls how much shows

  return (
    <svg viewBox="0 0 200 115" aria-label={`${pct}% completion gauge`} role="img" className={styles.halfDonutSvg}>
      {/* Track */}
      <path
        d={`M ${cx - r},${cy} A ${r},${r} 0 0,1 ${cx + r},${cy}`}
        fill="none"
        stroke="var(--color-gray-100)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Fill — dasharray trick on the arc path */}
      <path
        d={`M ${cx - r},${cy} A ${r},${r} 0 0,1 ${cx + r},${cy}`}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={`${filled} ${empty + 1}`}
        style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
      />
      {/* Center % value */}
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize="28" fontWeight="700" fill="var(--text-primary)">
        {pct}%
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="11" fill="var(--text-muted)">
        of habits completed
      </text>
      {/* End labels */}
      <text x={cx - r + 4} y={cy + 28} textAnchor="middle" fontSize="10" fill="var(--text-muted)">0%</text>
      <text x={cx + r - 4} y={cy + 28} textAnchor="middle" fontSize="10" fill="var(--text-muted)">100%</text>
    </svg>
  );
}

function TrendBadge({ delta, unit = "%" }: { delta: number; unit?: string }) {
  if (delta === 0) return (
    <span className={styles.trendNeutral}>— same as last period</span>
  );
  const positive = delta > 0;
  return (
    <span className={positive ? styles.trendUp : styles.trendDown}>
      {positive ? "↑" : "↓"} {Math.abs(delta)}{unit} vs last period
    </span>
  );
}



function buildLineSeries(rates: number[], range: DateRange): number[] {
  if (range === "7 Days") {
    return rates.slice(-8).map(r => Math.round(r * 100));
  }

  if (range === "30 Days") {
    return rates.slice(-30).map(r => Math.round(r * 100));
  }

  const today = new Date();
  const series: number[] = [];

  for (let monthsBack = 11; monthsBack >= 0; monthsBack--) {
    const bucketDate = new Date(today.getFullYear(), today.getMonth() - monthsBack, 1);
    const bucketYear = bucketDate.getFullYear();
    const bucketMonth = bucketDate.getMonth();

    // Find which days in the rates array correspond to this month
    const daysInMonth = new Date(bucketYear, bucketMonth + 1, 0).getDate();
    const monthRates: number[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(bucketYear, bucketMonth, day);
      const daysFromToday = Math.round(
        (today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
      );
      // rates is 365 elements, index 364 = today, index 0 = 364 days ago
      const ratesIdx = 364 - daysFromToday;
      if (ratesIdx >= 0 && ratesIdx < rates.length) {
        monthRates.push(rates[ratesIdx]);
      }
    }

    const avg = monthRates.length > 0
      ? monthRates.reduce((s, r) => s + r, 0) / monthRates.length
      : 0;
    series.push(Math.round(avg * 100));
  }

  return series;  // 12 values, oldest month first → newest month last
}

function barAxisMarks(
  bars: number[],
  range: DateRange
): { label: string; pct: number }[] {
  const n = bars.length;
  const cellWidth = 100 / n;
  const halfCell = cellWidth / 2;

  if (range === "7 Days") {
    const today = new Date();
    return bars.map((_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (n - 1 - i));
      return {
        label: d.toLocaleString("en-US", { weekday: "short" }),
        pct: i * cellWidth + halfCell,
      };
    });
  }

  if (range === "30 Days") {
    const today = new Date();
    return [0, 7, 14, 21, 29].map(i => {
      const d = new Date(today);
      d.setDate(today.getDate() - (n - 1 - i));
      return {
        label: `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })}`,
        pct: i * cellWidth + halfCell,
      };
    });
  }

  const today = new Date();
  const monthGroups: { label: string; startIdx: number; endIdx: number }[] = [];
  let currentMonthKey = -1;
  let currentMonth = -1;
  let currentYear = -1;
  let currentStart = 0;

  for (let i = 0; i < n; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - (n - 1 - i) * 7);
    const month = d.getMonth();
    const year = d.getFullYear();
    const monthKey = year * 12 + month;

    if (monthKey !== currentMonthKey) {
      if (currentMonthKey !== -1) {
        monthGroups.push({
          label: new Date(currentYear, currentMonth, 1)
            .toLocaleString("en-US", { month: "short" }),
          startIdx: currentStart,
          endIdx: i - 1,
        });
      }
      currentMonthKey = monthKey;
      currentMonth = month;
      currentYear = year;
      currentStart = i;
    }
  }

  // Flush the last month group
  if (currentMonthKey !== -1) {
    monthGroups.push({
      label: new Date(currentYear, currentMonth, 1)
        .toLocaleString("en-US", { month: "short" }),
      startIdx: currentStart,
      endIdx: n - 1,
    });
  }

  return monthGroups.map(group => ({
    label: group.label,
    pct: (group.startIdx + (group.endIdx - group.startIdx) / 2) * cellWidth + halfCell,
  }));
}

function BarChart({
  bars,
  range,
  categoryBarClass,
}: {
  bars: number[];
  range: DateRange;
  categoryBarClass: string;
}) {
  const xMarks = barAxisMarks(bars, range);
  const yTicks = [100, 75, 50, 25, 0];

  return (
    <div className={styles.barChartWrap}>
      {/* Y-axis labels */}
      <div className={styles.barChartYAxis}>
        {yTicks.map(tick => (
          <span key={tick}>{tick}%</span>
        ))}
      </div>

      <div className={styles.barChartInner}>
        {/* Horizontal grid lines */}
        <div className={styles.barChartGrid}>
          {yTicks.map(tick => (
            <span
              key={tick}
              className={styles.barChartGridLine}
              style={{ bottom: `${tick}%` }}
            />
          ))}
        </div>

        {/* Bars */}
        <div
          className={`${styles.bars} ${categoryBarClass}`}
          style={{ gridTemplateColumns: `repeat(${bars.length}, 1fr)` }}
        >
          {bars.map((height, i) => (
            <span
              key={i}
              style={{ height: height > 0 ? `${height}%` : '100%' }}
              className={height === 0 ? styles.barEmpty : undefined}
              title={`${height}%`}
              aria-label={`${height}% completion`}
            />
          ))}
        </div>

        {/* X-axis labels */}
        <div className={styles.barChartXAxis}>
          {xMarks.map(mark => (
            <span key={`${mark.label}-${mark.pct}`} style={{ left: `${mark.pct}%` }}>
              {mark.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function lineAxisMarks(range: DateRange): { label: string; pos: number }[] {
  const today = new Date();

  if (range === "7 Days") {
    return Array.from({ length: 8 }, (_, idx) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (7 - idx));
      return {
        label: String(d.getDate()),
        pos: (idx / 7) * 100,
      };
    });
  }

  if (range === "30 Days") {
    return [0, 7, 14, 21, 29].map(i => {
      const d = new Date(today);
      d.setDate(today.getDate() - (29 - i));
      return {
        label: `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })}`,
        pos: (i / 29) * 100,
      };
    });
  }

  // Year — rolling 12 months ending this month, not fixed Jan→Dec
  return Array.from({ length: 12 }, (_, idx) => {
    const d = new Date(today.getFullYear(), today.getMonth() - 11 + idx, 1);
    return {
      label: d.toLocaleString("en-US", { month: "short" }),
      pos: (idx / 11) * 100,
    };
  });
}

function categoryLineAxisMarks(range: DateRange): { label: string; pos: number }[] {
  return lineAxisMarks(range);
}

function lineMarkerIndices(length: number, range: DateRange): number[] {
  if (length <= 1) return [0];
  if (range === "Year") {
    return Array.from({ length: 12 }, (_, idx) => Math.min(length - 1, Math.round((idx / 11) * (length - 1))));
  }
  if (range === "30 Days") return [0, 7, 14, 21, length - 1];
  return [0, Math.floor(length / 2), length - 1];
}

function computeStats(habit: DashboardHabit, days: number) {
  const slice = habit.dailyRates.slice(-days);

  const avgRate = slice.reduce((s, r) => s + r, 0) / slice.length;
  const completedDays = slice.filter((r) => r >= 0.8).length;

  let streak = 0;
  for (let i = habit.dailyRates.length - 1; i >= 0; i--) {
    if (habit.dailyRates[i] >= 0.8) streak++;
    else break;
  }

  let longest = 0, cur = 0;
  for (const r of slice) {
    if (r >= 0.8) { cur++; longest = Math.max(longest, cur); }
    else cur = 0;
  }

  let bars: number[];
  if (days <= 30) {
    bars = slice.map((r) => Math.round(r * 100));
  } else {
    const weeks: number[] = [];
    for (let w = 0; w < 52; w++) {
      const start = w * 7;
      const week = slice.slice(start, start + 7);
      weeks.push(Math.round((week.reduce((s, r) => s + r, 0) / week.length) * 100));
    }
    bars = weeks;
  }

  return {
    streak,
    longest: `${longest}d`,
    total: `${completedDays}`,
    rate: `${Math.round(avgRate * 100)}%`,
    bars,
    badgeIcon: streak >= 3 ? "fire" : "down",
    badge: streak >= 1 ? `${streak} day${streak > 1 ? "s" : ""}` : "0 days",
  };
}

function toHeatLevel(rate: number): number {
  if (rate >= 0.85) return 4;
  if (rate >= 0.65) return 3;
  if (rate >= 0.45) return 2;
  if (rate >= 0.2) return 1;
  return 0;
}

type HeatmapData = {
  mode: "week" | "month" | "year";
  weekdayLabels: string[];
  monthLabels: string[];
  matrix: Array<Array<number | null>>;
  rateMatrix: Array<Array<number | null>>;
  dateMatrix: Array<Array<string | null>>;
  yearLabel: string;
  completedDays: number;
};

function buildHeatmapFromRates(rates: number[], days: number): HeatmapData {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const mode: HeatmapData["mode"] = days <= 7 ? "week" : days <= 30 ? "month" : "year";
  const totalDays = mode === "year" ? 365 : days;
  const rows = mode === "week" ? 1 : 7;
  const columns = mode === "week" ? 7 : mode === "month" ? 5 : 53;

  const matrix: HeatmapData["matrix"] = Array.from({ length: rows }, () => Array.from({ length: columns }, () => null));
  const rateMatrix: HeatmapData["rateMatrix"] = Array.from({ length: rows }, () => Array.from({ length: columns }, () => null));
  const dateMatrix: HeatmapData["dateMatrix"] = Array.from({ length: rows }, () => Array.from({ length: columns }, () => null));

  const start = new Date(today);
  start.setDate(today.getDate() - (totalDays - 1));

  const source = rates.slice(-totalDays);
  const padded =
    source.length >= totalDays
      ? source
      : [...Array.from({ length: totalDays - source.length }, () => 0), ...source];

  for (let i = 0; i < totalDays; i++) {
    const value = Math.max(0, Math.min(1, padded[i]));
    const level = toHeatLevel(value);
    const pct = Math.round(value * 100);

    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dateLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    const row = mode === "week" ? 0 : i % 7;
    const col = mode === "week" ? i : Math.floor(i / 7);
    if (col >= columns) continue;

    matrix[row][col] = level;
    rateMatrix[row][col] = pct;
    dateMatrix[row][col] = dateLabel;
  }

  const monthLabels = Array.from({ length: columns }, () => "");
  if (mode !== "week") {
    let prevMonth = "";
    for (let col = 0; col < columns; col++) {
      const d = new Date(start);
      d.setDate(start.getDate() + col * 7);
      const m = d.toLocaleString("en-US", { month: "short" });
      if (col === 0 || m !== prevMonth) {
        monthLabels[col] = m;
        prevMonth = m;
      }
    }
  }

  return {
    mode,
    weekdayLabels: mode === "week" ? ["M", "T", "W", "T", "F", "S", "S"] : ["M", "T", "W", "T", "F", "S", "S"],
    monthLabels,
    matrix,
    rateMatrix,
    dateMatrix,
    yearLabel: start.getFullYear().toString(),
    completedDays: padded.filter((rate) => rate >= 0.8).length,
  };
}

function computeCategoryHeatmaps(habits: DashboardHabit[], days: number) {
  const grouped = habits.reduce<Record<CategoryKey, DashboardHabit[]>>((acc, habit) => {
    if (!acc[habit.categoryKey]) acc[habit.categoryKey] = [];
    acc[habit.categoryKey].push(habit);
    return acc;
  }, {} as Record<CategoryKey, DashboardHabit[]>);

  return CATEGORY_ORDER.filter((key) => grouped[key]?.length).map((key) => {
    const categoryHabits = grouped[key];
    const avgRates = Array.from({ length: 365 }, (_, dayIndex) => {
      const sum = categoryHabits.reduce((acc, habit) => acc + habit.dailyRates[dayIndex], 0);
      return sum / categoryHabits.length;
    });
    const totalCheckIns = categoryHabits.reduce(
      (acc, habit) => acc + habit.dailyRates.slice(-days).filter((rate) => rate >= 0.8).length,
      0
    );

    return {
      categoryName: CATEGORY_LABEL[key],
      totalCheckIns,
      heatmap: buildHeatmapFromRates(avgRates, days),
    };
  });
}

interface BreakdownFilterProps {
  categories: CategoryKey[];
  category: CategoryFilter;
  sort: SortKey;
  open: boolean;
  hasActiveFilter: boolean;
  onToggle: () => void;
  onCategory: (c: CategoryFilter) => void;
  onSort: (s: SortKey) => void;
  onClose: () => void;
}

function BreakdownFilter({
  categories,
  category,
  sort,
  open,
  hasActiveFilter,
  onToggle,
  onCategory,
  onSort,
  onClose,
}: BreakdownFilterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const categoryOptions: CategoryFilter[] = ["All", ...categories];

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose]);

  return (
    <div ref={ref} className={styles.filterWrapper}>
      <button
        type="button"
        className={`${styles.filterButton} ${hasActiveFilter || open ? styles.filterActive : ""}`}
        aria-label="Filter habits"
        aria-expanded={open}
        onClick={onToggle}
      >
        <TrendIcon />
      </button>
      {open && (
        <div className={styles.filterDropdown}>
          <div className={styles.filterSection}>
            <p className={styles.filterLabel}>Category</p>
            {categoryOptions.map((c) => (
              <button
                key={c}
                type="button"
                className={`${styles.filterOption} ${category === c ? styles.filterOptionActive : ""}`}
                onClick={() => onCategory(c)}
              >
                {c === "All" ? "All" : CATEGORY_LABEL[c as CategoryKey] ?? c}
              </button>
            ))}
          </div>
          <div className={styles.filterDivider} />
          <div className={styles.filterSection}>
            <p className={styles.filterLabel}>Sort by</p>
            {SORT_OPTIONS.map((o) => (
              <button
                key={o.key}
                type="button"
                className={`${styles.filterOption} ${sort === o.key ? styles.filterOptionActive : ""}`}
                onClick={() => onSort(o.key)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface CategorySelectDropdownProps {
  selected: CategoryKey | "all";
  onSelect: (value: CategoryKey | "all") => void;
  onClose: () => void;
}

function CategorySelectDropdown({ selected, onSelect, onClose }: CategorySelectDropdownProps) {
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
        {(["all", ...CATEGORY_ORDER] as const).map((value) => (
          <button
            key={value}
            className={`${styles.filterOption} ${selected === value ? styles.filterOptionActive : ""}`}
            onClick={() => onSelect(value)}
          >
            {value === "all" ? "All categories" : CATEGORY_LABEL[value]}
          </button>
        ))}
      </div>
    </div>
  );
}

function TrendIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 16h16M7 12h10M10 8h4" />
    </svg>
  );
}

function CategoryIcon({ categoryKey }: { categoryKey: CategoryKey }) {
  const Icon = CATEGORY_ICONS[categoryKey];
  return <Icon size={23} strokeWidth={2.5} aria-hidden />;
}

function HeatmapGrid({
  heatmap,
  idPrefix,
  compact = false,
}: {
  heatmap: HeatmapData;
  idPrefix: string;
  compact?: boolean;
}) {
  const isYearMode = heatmap.mode === "year";
  if (heatmap.mode === "week") {
    const weekCells = heatmap.matrix[0].map((level, idx) => {
      const pct = heatmap.rateMatrix[0][idx] ?? 0;
      const dateLabel = heatmap.dateMatrix[0][idx];
      const dayLabel = dateLabel
        ? new Date(dateLabel).toLocaleString("en-US", { weekday: "short" })
        : heatmap.weekdayLabels[idx];
      return { level, pct, dateLabel, dayLabel };
    });

    return (
      <div className={`${styles.heatmapChartWrap} ${styles.heatmapWeekMode} ${compact ? styles.heatmapCompact : ""}`}>
        <div className={styles.weekCardsGrid}>
          {weekCells.map((cell, idx) => (
            <article key={`${idPrefix}-week-card-${idx}`} className={styles.weekDayCard}>
              <span className={styles.weekDayLabel}>{cell.dayLabel}</span>
              <div
                className={`${styles.weekPercentPill} ${cell.level === null ? styles.heatEmpty : styles[`heat${cell.level}`]}`}
                title={cell.dateLabel ? `${cell.dateLabel}\nCompletion: ${cell.pct}%` : undefined}
              >
                {cell.pct}%
              </div>
            </article>
          ))}
        </div>
        <div className={styles.heatmapLegend} aria-label="Heatmap intensity legend">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <i key={`${idPrefix}-legend-${level}`} className={`${styles.heatmapLegendCell} ${styles[`heat${level}`]}`} />
          ))}
          <span>More</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${styles.heatmapChartWrap} ${compact ? styles.heatmapCompact : ""} ${heatmap.mode === "month" ? styles.heatmapMonthMode : ""} ${isYearMode ? styles.heatmapYearFit : ""}`}
    >
      {heatmap.mode === "year" && (
        <div className={styles.heatmapMetaRow}>
          <span>{heatmap.yearLabel}</span>
        </div>
      )}
      {heatmap.mode === "month" && (
        <div
          className={styles.heatmapWeekHeader}
          style={{ gridTemplateColumns: `var(--heatmap-label-width, 12px) repeat(${heatmap.matrix[0].length}, minmax(0, 1fr))` }}
        >
          <span />
          {Array.from({ length: heatmap.matrix[0].length }, (_, idx) => {
            const mondayLabel = heatmap.dateMatrix[0]?.[idx];
            if (!mondayLabel) return <span key={`${idPrefix}-w-${idx}`} />;
            const d = new Date(mondayLabel);
            const label = `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })}`;
            return (
              <span key={`${idPrefix}-w-${idx}`} title={label}>
                {d.getDate()}
              </span>
            );
          })}
        </div>
      )}
      <div className={styles.heatmapMonthScroll}>
        <div
          className={styles.heatmapMonthRow}
          style={{
            gridTemplateColumns: `var(--heatmap-label-width, 12px) repeat(${heatmap.monthLabels.length}, minmax(0, 1fr))`,
          }}
        >
          <span />
          {heatmap.monthLabels.map((label, i) => (
            <span key={`${idPrefix}-month-${i}`}>{label}</span>
          ))}
        </div>
      </div>
      <div className={styles.heatmapBody}>
        <div className={styles.heatmapWeekdays}>
          {heatmap.weekdayLabels.map((label, idx) => (
            <span key={`${idPrefix}-day-${idx}`}>{label}</span>
          ))}
        </div>
        <div className={styles.heatmapColsScroll}>
          <div className={styles.heatmapCols}>
            {Array.from({ length: heatmap.matrix[0].length }, (_, colIdx) => (
              <div key={`${idPrefix}-col-${colIdx}`} className={styles.heatmapCol}>
                {heatmap.matrix.map((row, rowIdx) => {
                  const level = row[colIdx];
                  const pct = heatmap.rateMatrix[rowIdx][colIdx];
                  const dateLabel = heatmap.dateMatrix[rowIdx][colIdx];
                  return (
                    <span
                      key={`${idPrefix}-${colIdx}-${rowIdx}`}
                      className={`${styles.heatCell} ${level === null ? styles.heatEmpty : styles[`heat${level}`]}`}
                      title={dateLabel && pct !== null ? `${dateLabel}\nCompletion: ${pct}%` : undefined}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className={styles.heatmapLegend} aria-label="Heatmap intensity legend">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <i key={`${idPrefix}-legend-${level}`} className={`${styles.heatmapLegendCell} ${styles[`heat${level}`]}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { settings } = useSettings();
  const [range, setRange] = useState<DateRange>(settings.defaultRange);
  const [chartView, setChartView] = useState<ChartView>("bar");
  const [chartDataMode, setChartDataMode] = useState<HeatmapMode>("task");
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>("category");
  const [lineCategoryFilter, setLineCategoryFilter] = useState<CategoryKey[]>(CATEGORY_ORDER);
  const [lineCategoryOpen, setLineCategoryOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [category, setCategory] = useState<CategoryFilter>("All");
  const [sort, setSort] = useState<SortKey>("default");

  // ── Real data ──────────────────────────────────────────────────────────────
  const [habits, setHabits] = useState<Habit[]>([]);
  const [allCheckIns, setAllCheckIns] = useState<CheckIn[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAll() {
      try {
        setDataLoading(true);
        const [fetchedHabits, fetchedCheckIns] = await Promise.all([
          getHabits(),
          getCheckIns(),
        ]);
        setHabits(fetchedHabits);
        setAllCheckIns(fetchedCheckIns);
      } catch (err) {
        console.error(err);
        setDataError('Failed to load dashboard data.');
      } finally {
        setDataLoading(false);
      }
    }
    fetchAll();
  }, []);

  useEffect(() => {
    setRange(settings.defaultRange);
  }, [settings.defaultRange]);

  // ── Derived: checkIn lookup ────────────────────────────────────────────────
  const checkInsByHabit = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const ci of allCheckIns) {
      if (!map.has(ci.habitId)) map.set(ci.habitId, new Map());
      map.get(ci.habitId)!.set(ci.date, ci.completedCount);
    }
    return map;
  }, [allCheckIns]);

  // ── Derived: real habits → DashboardHabit shape ───────────────────────────
  const dashboardHabits = useMemo<DashboardHabit[]>(() => {
    return habits
      .filter(h => h.status === 'Active')
      .map(h => {
        const dateMap = checkInsByHabit.get(h._id) ?? new Map<string, number>();
        const dailyRates = buildDailyRates(h.targetPerDay, dateMap);
        return {
          id: h._id,
          name: h.name,
          categoryKey: h.category as CategoryKey,
          category: h.category,
          time: h.frequency === 'Daily' ? 'Daily' : h.specificDays.join(', '),
          dailyRates,
        };
      });
  }, [habits, checkInsByHabit]);

  const days = rangeDays(range);
  const categories = useMemo(() => CATEGORY_ORDER, []);

  // ── Derived: stats per habit ───────────────────────────────────────────────
  const habitStats = useMemo<HabitWithComputed[]>(() => {
    let list = dashboardHabits.map(h => ({ ...h, computed: computeStats(h, days) }));
    if (category !== "All") list = list.filter(h => h.categoryKey === category);
    if (sort === "rate") list = [...list].sort((a, b) => parseFloat(b.computed.rate) - parseFloat(a.computed.rate));
    if (sort === "streak") list = [...list].sort((a, b) => b.computed.streak - a.computed.streak);
    if (sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [dashboardHabits, days, category, sort]);

  // ── Derived: grouped by category ──────────────────────────────────────────
  const groupedHabitStats = useMemo(() => {
    const grouped: Record<CategoryKey, HabitWithComputed[]> = {
      Health: [], Study: [], Work: [], Mindfulness: [], Other: [],
    };
    for (const habit of habitStats) grouped[habit.categoryKey].push(habit);
    return grouped;
  }, [habitStats]);

  // ── Derived: category-level aggregates ────────────────────────────────────
  const categoryCardData = useMemo(() => {
    return CATEGORY_ORDER.map(categoryKey => {
      const rows = groupedHabitStats[categoryKey];
      if (!rows.length) return null;
      const barsLength = rows[0].computed.bars.length;
      const bars = Array.from({ length: barsLength }, (_, idx) =>
        Math.round(rows.reduce((sum, row) => sum + row.computed.bars[idx], 0) / rows.length)
      );
      const avgRate = Math.round(rows.reduce((sum, row) => sum + parseFloat(row.computed.rate), 0) / rows.length);
      const total = rows.reduce((sum, row) => sum + Number(row.computed.total), 0);
      const longest = rows.reduce((max, row) => Math.max(max, Number(row.computed.longest.replace("d", ""))), 0);
      const streak = rows.reduce((max, row) => Math.max(max, row.computed.streak), 0);
      return {
        categoryKey,
        label: CATEGORY_LABEL[categoryKey],
        bars,
        rate: `${avgRate}%`,
        total: `${total}`,
        longest: `${longest}d`,
        streak,
      };
    }).filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [groupedHabitStats]);

  // ── Derived: heatmaps ─────────────────────────────────────────────────────
  const heatmapSourceHabits = useMemo(() => habitStats as DashboardHabit[], [habitStats]);
  const categoryHeatmaps = useMemo(
    () => computeCategoryHeatmaps(heatmapSourceHabits, days),
    [heatmapSourceHabits, days]
  );

  // ── Derived: category line chart series ───────────────────────────────────
  const filteredCategoryLineData = useMemo(
    () => categoryCardData.filter(item => lineCategoryFilter.includes(item.categoryKey)),
    [categoryCardData, lineCategoryFilter]
  );
  const selectedLineCategory: CategoryKey | "all" =
    lineCategoryFilter.length === CATEGORY_ORDER.length ? "all" : lineCategoryFilter[0];
  const categoryLineSeries = useMemo(() => {
    return filteredCategoryLineData.map(item => {
      const rows = groupedHabitStats[item.categoryKey];
      const merged = Array.from({ length: 365 }, (_, dayIdx) =>
        rows.reduce((sum, row) => sum + row.dailyRates[dayIdx], 0) / Math.max(rows.length, 1)
      );
      return { key: item.categoryKey, label: item.label, points: buildLineSeries(merged, range) };
    });
  }, [filteredCategoryLineData, groupedHabitStats, range]);

  // ── Chart labels (hardcoded, no translation) ──────────────────────────────
  const chartLabel = range === "Year"
    ? "Past 12 Months"
    : `Last ${days} Days`;
  const taskPanelTitle = chartView === "line" ? "Task Line Chart" : "Task Bar Chart";
  const taskPanelDesc = chartView === "line"
    ? "Individual habit completion trend over time."
    : "Individual habit completion volume in selected range.";

  const hasActiveFilter = category !== "All" || sort !== "default";

  const dashboardSummary = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);

    // ── Current period stats ─────────────────────────────────────────────────
    const activeHabits = habitStats;
    if (!activeHabits.length) return null;

    // Overall completion rate = avg of all habit rates in period
    const overallRate = Math.round(
      activeHabits.reduce((sum, h) => sum + parseFloat(h.computed.rate), 0) / activeHabits.length
    );

    // Total completions in period
    const totalCompletions = activeHabits.reduce((sum, h) => sum + Number(h.computed.total), 0);

    // Daily average completions
    const dailyAvg = (totalCompletions / days).toFixed(1);

    // Best current streak
    const perfectStreak = calcPerfectDayStreak(allCheckIns, habits, todayStr);

    // Most consistent (highest rate)
    function longestStreakInRange(dailyRates: number[]): number {
      const slice = dailyRates.slice(-days);
      let longest = 0;
      let current = 0;
      for (const r of slice) {
        if (r >= 0.8) { current++; longest = Math.max(longest, current); }
        else current = 0;
      }
      return longest;
    }

    const mostConsistentInRange = [...activeHabits]
      .map(h => ({ ...h, rangeStreak: longestStreakInRange(h.dailyRates) }))
      .sort((a, b) => b.rangeStreak - a.rangeStreak)[0];

    // ── Previous period stats (for trend) ────────────────────────────────────
    // Previous period = same number of days, just before the current period
    function computePrevRate(habit: HabitWithComputed): number {
      const slice = habit.dailyRates.slice(-(days * 2), -days);
      if (!slice.length) return 0;
      const completed = slice.filter(r => r >= 0.8).length;
      return Math.round((completed / slice.length) * 100);
    }

    const prevOverallRate = Math.round(
      activeHabits.reduce((sum, h) => sum + computePrevRate(h), 0) / activeHabits.length
    );

    const prevTotalCompletions = activeHabits.reduce((sum, h) => {
      const slice = h.dailyRates.slice(-(days * 2), -days);
      return sum + slice.filter(r => r >= 0.8).length;
    }, 0);

    const rateDelta = overallRate - prevOverallRate;
    const completionDelta = totalCompletions - prevTotalCompletions;

    // Category aggregates — strongest and weakest by avg completion rate
    const categoryRates = CATEGORY_ORDER
      .map(categoryKey => {
        const rows = groupedHabitStats[categoryKey];
        if (!rows.length) return null;
        const avgRate = Math.round(
          rows.reduce((sum, h) => sum + parseFloat(h.computed.rate), 0) / rows.length
        );
        return { categoryKey, label: CATEGORY_LABEL[categoryKey], rate: avgRate };
      })
      .filter((c): c is NonNullable<typeof c> => Boolean(c))
      .sort((a, b) => b.rate - a.rate);

    const strongestCategory = categoryRates[0] ?? null;
    const weakestCategory = categoryRates[categoryRates.length - 1] ?? null;

    return {
      overallRate,
      rateDelta,
      totalCompletions,
      completionDelta,
      dailyAvg,
      bestStreak: {
        streak: perfectStreak,
      },
      mostConsistent: {
        name: mostConsistentInRange?.name ?? "—",
        rate: mostConsistentInRange ? `${mostConsistentInRange.rangeStreak}d` : "0d",
        categoryKey: mostConsistentInRange?.categoryKey,
      },
      strongestCategory,
      weakestCategory,
    };
  }, [habitStats, days]);

  if (dataLoading) {
    return (
      <AppLayout>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}>
          <div className="spinner" />
        </div>
      </AppLayout>
    );
  }

  if (dataError) {
    return (
      <AppLayout>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-danger)' }}>
          {dataError}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className={styles.content}>
        <section className={styles.dashboardSection}>
          {dashboardSummary && (
            <div className={styles.summarySection}>
              <div className={styles.summaryPeriodRow}>
                <h2 >Overview</h2>
                <span className={styles.summaryPeriodBadge}>
                  {range === "7 Days" ? "Last 7 days"
                    : range === "30 Days" ? "Last 30 days"
                      : "Past 12 months"}
                </span>
              </div>

              <div className={styles.summaryGrid}>

                {/* Left column: featured + total completions */}
                <div className={styles.summaryLeftCol}>

                  {/* Featured — Overall Completion Rate + Total Completions */}
                  <article className={`${styles.summaryCard} ${styles.summaryCardFeatured}`}>

                    {/* Header row: label + info tooltip + trend badge */}
                    <div className={styles.featuredHeader}>
                      <div className={styles.featuredLabelRow}>
                        <p className={styles.summaryCardLabel}>Overall Completion</p>
                        <div className={styles.infoTip}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="8" /><line x1="12" y1="12" x2="12" y2="16" />
                          </svg>
                          <span className={styles.infoTipText}>
                            Average % of your scheduled habits completed per day in this period
                          </span>
                        </div>
                      </div>
                      <TrendBadge delta={dashboardSummary.rateDelta} />
                    </div>

                    {/* Half donut gauge */}
                    <div className={styles.halfDonutWrap}>
                      <HalfDonut pct={dashboardSummary.overallRate} />
                    </div>

                    {/* Divider */}
                    <div className={styles.featuredDivider} />

                    {/* Total completions row */}
                    <div className={styles.featuredFooter}>
                      <div className={styles.featuredLabelRow}>
                        <p className={styles.summaryCardLabel}>Total completions</p>
                        <div className={styles.infoTip}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="8" /><line x1="12" y1="12" x2="12" y2="16" />
                          </svg>
                          <span className={styles.infoTipText}>
                            Number of individual habits fully completed in this period
                          </span>
                        </div>
                      </div>
                      <div className={styles.featuredFooterRight}>
                        <span className={styles.featuredCompletionCount}>{dashboardSummary.totalCompletions}</span>
                        <span className={styles.featuredCompletionUnit}>times</span>
                        <span className={styles.featuredCompletionMeta}>~{dashboardSummary.dailyAvg}/day</span>
                      </div>
                    </div>

                  </article>

                </div>

                {/* Right area: 2x2 mini grid */}
                <div className={styles.summaryMiniGrid}>

                  {/* Perfect Day Streak */}
                  <article className={styles.summaryCard}>
                    <div className={styles.featuredLabelRow}>
                      <p className={styles.summaryCardLabel}>Perfect Day Streak</p>
                      <div className={styles.infoTip}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="8" /><line x1="12" y1="12" x2="12" y2="16" />
                        </svg>
                        <span className={styles.infoTipText}>
                          Consecutive days where every scheduled habit was fully completed. Independent of selected range.
                        </span>
                      </div>
                    </div>
                    <div className={styles.summaryCardBody}>
                      <div className={styles.streakIconUnboxed}>
                        <Flame size={36} strokeWidth={1.8} className={styles.flameIcon} />
                      </div>
                      <div className={styles.summaryCardText}>
                        <p className={styles.streakBigNumber}>{dashboardSummary.bestStreak.streak}</p>
                        <p className={styles.summaryCardSub}>day streak</p>
                      </div>
                    </div>
                  </article>

                  {/* Most Consistent — alternative without donut ─────── */}
                  <article className={styles.summaryCard}>
                    <div className={styles.featuredLabelRow}>
                      <p className={styles.summaryCardLabel}>Most Consistent</p>
                      <div className={styles.infoTip}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="8" /><line x1="12" y1="12" x2="12" y2="16" />
                        </svg>
                        <span className={styles.infoTipText}>
                          Habit with the longest consecutive run within the selected period
                        </span>
                      </div>
                    </div>

                    {/* Habit name first */}
                    <p className={styles.consistentHabitName}>{dashboardSummary.mostConsistent.name}</p>

                    {/* Icon + stat below */}
                    <div className={styles.consistentStat}>
                      <TrendingUp size={18} strokeWidth={2} className={styles.trendingIcon} />
                      <span className={styles.streakCount}>{dashboardSummary.mostConsistent.rate}</span>
                      <span className={styles.summaryCardSub}>best run this period</span>
                    </div>
                  </article>

                  {/* Strongest Category */}
                  {dashboardSummary.strongestCategory && (
                    <article className={styles.summaryCard}>
                      <p className={styles.summaryCardLabel}>Strongest Category</p>
                      <div className={styles.summaryCardBody}>
                        <span className={`${styles.categoryIconWrap} ${CATEGORY_ICON_CLASS[dashboardSummary.strongestCategory.categoryKey]}`}>
                          <CategoryIcon categoryKey={dashboardSummary.strongestCategory.categoryKey} />
                        </span>
                        <div className={styles.summaryCardText}>
                          <p className={styles.summaryCardValue}>{dashboardSummary.strongestCategory.label}</p>
                          <p className={styles.summaryCardSub}>{dashboardSummary.strongestCategory.rate}% completion</p>
                        </div>
                      </div>
                    </article>
                  )}

                  {/* Needs Attention */}
                  {dashboardSummary.weakestCategory && (
                    <article className={styles.summaryCard}>
                      <p className={styles.summaryCardLabel}>Needs Attention</p>
                      <div className={styles.summaryCardBody}>
                        <span className={`${styles.categoryIconWrap} ${CATEGORY_ICON_CLASS[dashboardSummary.weakestCategory.categoryKey]}`}>
                          <CategoryIcon categoryKey={dashboardSummary.weakestCategory.categoryKey} />
                        </span>
                        <div className={styles.summaryCardText}>
                          <p className={styles.summaryCardValue}>{dashboardSummary.weakestCategory.label}</p>
                          <p className={styles.summaryCardSub}>{dashboardSummary.weakestCategory.rate}% completion</p>
                        </div>
                      </div>
                    </article>
                  )}

                </div>
              </div>
            </div>
          )}

          {/* Habit breakdown */}
          <section className={styles.breakdown}>
            <div className={styles.sectionHeader}>
              <h2>Habit Breakdown</h2>
              <div className={styles.breakdownTools}>
                <div className={styles.breakdownTabsScroll}>
                  <div className={styles.chartTabs} aria-label="Date range">
                    {DATE_RANGES.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={`${styles.chartTabBtn} ${range === item ? styles.chartTabActive : ""}`}
                        onClick={() => setRange(item)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                  <div className={styles.chartTabs} aria-label="Chart type switcher">
                    {(["bar", "line", "heatmap"] as ChartView[]).map((view) => (
                      <button
                        key={view}
                        type="button"
                        className={`${styles.chartTabBtn} ${chartView === view ? styles.chartTabActive : ""}`}
                        onClick={() => setChartView(view)}
                      >
                        {view.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <BreakdownFilter
                  categories={categories}
                  category={category}
                  sort={sort}
                  open={filterOpen}
                  hasActiveFilter={hasActiveFilter}
                  onToggle={() => setFilterOpen((v) => !v)}
                  onCategory={(c) => { setCategory(c); }}
                  onSort={(s) => { setSort(s); }}
                  onClose={() => setFilterOpen(false)}
                />
              </div>
            </div>

            {habitStats.length === 0 ? (
              <p className={styles.emptyFilter}>No habits found for "{category}".</p>
            ) : (
              <>
                {chartView !== "heatmap" && (
                  <>
                    {chartView === "line" && chartDataMode === "category" && (
                      <div className={styles.analyticsPanel}>
                        <div className={styles.categoryLineHeader}>
                          <div>
                            <h3 className={styles.panelTitle}>Category Line Chart</h3>
                            <p className={styles.panelDescription}>Percent habit completion by month.</p>
                          </div>
                          <div className={styles.panelHeaderActions}>
                            <div className={styles.filterWrapper}>
                              <button
                                className={`${styles.filterSelectBtn} ${lineCategoryOpen ? styles.filterActive : ""}`}
                                onClick={() => setLineCategoryOpen((v) => !v)}
                              >
                                {selectedLineCategory === "all" ? "All categories" : CATEGORY_LABEL[selectedLineCategory]}
                              </button>
                              {lineCategoryOpen && (
                                <CategorySelectDropdown
                                  selected={selectedLineCategory}
                                  onSelect={(value) => {
                                    setLineCategoryFilter(value === "all" ? CATEGORY_ORDER : [value]);
                                    setLineCategoryOpen(false);
                                  }}
                                  onClose={() => setLineCategoryOpen(false)}
                                />
                              )}
                            </div>
                            <div className={styles.chartTabs} aria-label="Chart data mode switcher">
                              {([
                                { id: "task", label: "Task View" },
                                { id: "category", label: "Category View" },
                              ] as const).map((mode) => (
                                <button
                                  key={mode.id}
                                  className={`${styles.chartTabBtn} ${chartDataMode === mode.id ? styles.chartTabActive : ""}`}
                                  onClick={() => setChartDataMode(mode.id)}
                                >
                                  {mode.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className={styles.categoryLineLegend}>
                          {filteredCategoryLineData.map((item) => (
                            <span key={`legend-${item.categoryKey}`}>
                              <i style={{ backgroundColor: CATEGORY_LINE_COLOR[item.categoryKey] }} />
                              {item.label}
                            </span>
                          ))}
                        </div>
                        <div className={styles.categoryLineChartWrap}>
                          <div className={styles.categoryLineYAxis}>
                            {[100, 75, 50, 25, 0].map((tick) => (
                              <span key={`tick-${tick}`}>{tick}%</span>
                            ))}
                          </div>
                          <svg viewBox="0 0 100 56" preserveAspectRatio="none" role="img" aria-label="Category line chart">
                            {[100, 75, 50, 25, 0].map((tick) => (
                              <line
                                key={`grid-${tick}`}
                                x1="0"
                                x2="100"
                                y1={56 - (tick / 100) * 56}
                                y2={56 - (tick / 100) * 56}
                                className={styles.categoryLineGrid}
                              />
                            ))}
                            {categoryLineSeries.map((item) => (
                              <polyline
                                key={`line-${item.key}`}
                                className={styles.lineChartStroke}
                                style={{ stroke: CATEGORY_LINE_COLOR[item.key] }}
                                vectorEffect="non-scaling-stroke"
                                points={lineMarkerIndices(item.points.length, range).map((idx) => {
                                  const x = (idx / Math.max(item.points.length - 1, 1)) * 100;
                                  const y = 56 - (item.points[idx] / 100) * 56;
                                  return `${x},${y}`;
                                }).join(" ")}
                              />
                            ))}
                          </svg>
                          {/* HTML overlay dots — perfectly round, unaffected by SVG aspect ratio */}
                          <div className={styles.categoryLineDotsOverlay} aria-hidden="true">
                            {categoryLineSeries.map((item) =>
                              lineMarkerIndices(item.points.length, range).map((idx) => {
                                const xPct = (idx / Math.max(item.points.length - 1, 1)) * 100;
                                const yPct = (1 - item.points[idx] / 100) * 100;
                                return (
                                  <span
                                    key={`cat-dot-html-${item.key}-${idx}`}
                                    className={styles.categoryLineDotHtml}
                                    style={{ left: `${xPct}%`, top: `${yPct}%`, backgroundColor: CATEGORY_LINE_COLOR[item.key] }}
                                  />
                                );
                              })
                            )}
                          </div>
                          <div className={styles.lineAxis}>
                            {categoryLineAxisMarks(range).map((mark) => (
                              <span key={`category-axis-${mark.label}-${mark.pos}`} style={{ left: `${mark.pos}%` }}>
                                {mark.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {chartDataMode === "task" && (
                      <div className={styles.analyticsPanel}>
                        <div className={styles.analyticsPanelHeader}>
                          <div>
                            <h3 className={styles.panelTitle}>{taskPanelTitle}</h3>
                            <p className={styles.panelDescription}>{taskPanelDesc}</p>
                          </div>
                          <div className={styles.chartTabs} aria-label="Chart data mode switcher">
                            {([
                              { id: "task", label: "Task View" },
                              { id: "category", label: "Category View" },
                            ] as const).map((mode) => (
                              <button
                                key={mode.id}
                                className={`${styles.chartTabBtn} ${chartDataMode === mode.id ? styles.chartTabActive : ""}`}
                                onClick={() => setChartDataMode(mode.id)}
                              >
                                {mode.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className={styles.categorySections}>
                          {CATEGORY_ORDER.map((categoryKey) => {
                            const sectionHabits = groupedHabitStats[categoryKey];
                            if (!sectionHabits.length) return null;

                            return (
                              <section key={categoryKey} className={styles.categorySection}>
                                <h3 className={styles.categoryLabel}>
                                  <span className={CATEGORY_DOT_CLASS[categoryKey]} />
                                  {CATEGORY_LABEL[categoryKey]}
                                </h3>
                                <div className={styles.habitGrid}>
                                  {sectionHabits.map((habit) => {
                                    const { computed } = habit;
                                    const habitLineSeries = buildLineSeries(habit.dailyRates, range);
                                    const habitLineColor = CATEGORY_LINE_COLOR[habit.categoryKey];
                                    const statItems = [
                                      { label: "Longest", value: computed.longest },
                                      { label: "Total", value: computed.total },
                                      { label: "Rate", value: computed.rate },
                                    ];

                                    return (
                                      <article className={styles.habitCard} key={habit.id}>
                                        <div className={styles.habitHeader}>
                                          <span className={`${styles.habitIcon} ${CATEGORY_ICON_CLASS[habit.categoryKey]}`}>
                                            <CategoryIcon categoryKey={habit.categoryKey} />
                                          </span>
                                          <div>
                                            <h4>{habit.name}</h4>
                                            <p>{habit.time}</p>
                                          </div>
                                          <span className={`${styles.badge} ${CATEGORY_BADGE_CLASS[habit.categoryKey]}`}>
                                            {computed.badge}
                                            {computed.badgeIcon === "fire" ? (
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
                                          {statItems.map(({ label, value }) => (
                                            <div key={label}>
                                              <span>{label}</span>
                                              <strong>{value}</strong>
                                            </div>
                                          ))}
                                        </div>

                                        <p className={styles.chartLabel}>{chartLabel}</p>
                                        {chartView === "bar" && (
                                          <BarChart
                                            bars={computed.bars}
                                            range={range}
                                            categoryBarClass={CATEGORY_BAR_CLASS[habit.categoryKey]}  // or item.categoryKey
                                          />
                                        )}

                                        {chartView === "line" && (
                                          <div className={styles.lineChartOuter}>
                                            {/* Y-axis labels */}
                                            <div className={styles.lineChartYAxis}>
                                              {[100, 75, 50, 25, 0].map(tick => (
                                                <span key={tick}>{tick}%</span>
                                              ))}
                                            </div>

                                            <div className={styles.lineChartWrap}>
                                              <svg viewBox="0 0 100 44" preserveAspectRatio="none" role="img" aria-label={`${habit.name} line chart`}>
                                                {/* Horizontal grid lines at 0%, 25%, 50%, 75%, 100% */}
                                                {[0, 25, 50, 75, 100].map(tick => (
                                                  <line
                                                    key={`grid-${tick}`}
                                                    x1="0" x2="100"
                                                    y1={44 - (tick / 100) * 44}
                                                    y2={44 - (tick / 100) * 44}
                                                    stroke="rgba(100,116,139,0.15)"
                                                    strokeWidth="0.5"
                                                    vectorEffect="non-scaling-stroke"
                                                  />
                                                ))}
                                                <polyline
                                                  className={styles.lineChartStroke}
                                                  style={{ stroke: habitLineColor }}
                                                  vectorEffect="non-scaling-stroke"
                                                  points={lineMarkerIndices(habitLineSeries.length, range).map((idx) => {
                                                    const x = (idx / Math.max(habitLineSeries.length - 1, 1)) * 100;
                                                    const y = 44 - (habitLineSeries[idx] / 100) * 44;
                                                    return `${x},${y}`;
                                                  }).join(" ")}
                                                />
                                              </svg>

                                              <div className={styles.lineDotsOverlay} aria-hidden="true">
                                                {lineMarkerIndices(habitLineSeries.length, range).map((idx) => {
                                                  const xPct = (idx / Math.max(habitLineSeries.length - 1, 1)) * 100;
                                                  const yPct = (1 - habitLineSeries[idx] / 100) * 100;
                                                  return (
                                                    <span
                                                      key={`${habit.id}-dot-html-${idx}`}
                                                      className={styles.lineDotHtml}
                                                      style={{ left: `${xPct}%`, top: `${yPct}%`, backgroundColor: habitLineColor }}
                                                    />
                                                  );
                                                })}
                                              </div>

                                              <div className={styles.lineAxis}>
                                                {lineAxisMarks(range).map((mark) => (
                                                  <span key={`${habit.id}-${mark.label}`} style={{ left: `${mark.pos}%` }}>
                                                    {mark.label}
                                                  </span>
                                                ))}
                                              </div>
                                            </div>
                                          </div>
                                        )}

                                      </article>
                                    );
                                  })}
                                </div>
                              </section>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {chartDataMode === "category" && chartView !== "line" && (
                      <div className={styles.analyticsPanel}>
                        <div className={styles.analyticsPanelHeader}>
                          <div>
                            <h3 className={styles.panelTitle}>Category Bar Chart</h3>
                            <p className={styles.panelDescription}>Compare completion volume across categories.</p>
                          </div>
                          <div className={styles.chartTabs} aria-label="Chart data mode switcher">
                            {([
                              { id: "task", label: "Task View" },
                              { id: "category", label: "Category View" },
                            ] as const).map((mode) => (
                              <button
                                key={mode.id}
                                className={`${styles.chartTabBtn} ${chartDataMode === mode.id ? styles.chartTabActive : ""}`}
                                onClick={() => setChartDataMode(mode.id)}
                              >
                                {mode.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Flat grid — same layout as heatmap's taskHeatmapList, no section wrappers */}
                        <div className={styles.taskHeatmapList}>
                          {categoryCardData.map((item) => {
                            const computed = {
                              bars: item.bars,
                              longest: item.longest,
                              total: item.total,
                              rate: item.rate,
                              badge: `${item.streak} day${item.streak > 1 ? "s" : ""}`,
                              badgeIcon: item.streak >= 3 ? "fire" : "down",
                            };
                            return (
                              <article className={styles.habitCard} key={`category-card-${item.categoryKey}`}>
                                <div className={styles.habitHeader}>
                                  <span className={`${styles.habitIcon} ${CATEGORY_ICON_CLASS[item.categoryKey]}`}>
                                    <CategoryIcon categoryKey={item.categoryKey} />
                                  </span>
                                  <div>
                                    <h4>{item.label}</h4>
                                    <p>Category aggregate</p>
                                  </div>
                                  <span className={`${styles.badge} ${CATEGORY_BADGE_CLASS[item.categoryKey]}`}>
                                    {computed.badge}
                                  </span>
                                </div>
                                <div className={styles.statGrid}>
                                  {[
                                    { label: "Longest", value: computed.longest },
                                    { label: "Total", value: computed.total },
                                    { label: "Rate", value: computed.rate },
                                  ].map(({ label, value }) => (
                                    <div key={`${item.categoryKey}-${label}`}>
                                      <span>{label}</span>
                                      <strong>{value}</strong>
                                    </div>
                                  ))}
                                </div>
                                <p className={styles.chartLabel}>{chartLabel}</p>
                                <BarChart
                                  bars={computed.bars}
                                  range={range}
                                  categoryBarClass={CATEGORY_BAR_CLASS[item.categoryKey]}
                                />
                              </article>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {chartView === "heatmap" && (
                  <div className={styles.heatmapPanel}>
                    <div className={styles.heatmapPanelHeader}>
                      <div>
                        <h3 className={styles.panelTitle}>
                          {heatmapMode === "category" ? "Category Heatmaps" : "Task Heatmaps"}
                        </h3>
                        <p className={styles.panelDescription}>
                          {heatmapMode === "category"
                            ? "Visualize your consistency across life pillars."
                            : "Visualize each habit timeline across the selected range."}
                        </p>
                      </div>
                      <div className={styles.chartTabs} aria-label="Heatmap mode switcher">
                        {([
                          { id: "task", label: "Task View" },
                          { id: "category", label: "Category View" },
                        ] as const).map((mode) => (
                          <button
                            key={mode.id}
                            className={`${styles.chartTabBtn} ${heatmapMode === mode.id ? styles.chartTabActive : ""}`}
                            onClick={() => setHeatmapMode(mode.id)}
                          >
                            {mode.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={styles.heatmapPanelBody}>
                      {heatmapMode === "category" &&
                        <div className={styles.taskHeatmapList}>
                          {categoryHeatmaps.map((categoryMap) => {
                            const categoryKey = CATEGORY_ORDER.find((key) => CATEGORY_LABEL[key] === categoryMap.categoryName);
                            const aggregate = categoryCardData.find((item) => item.label === categoryMap.categoryName);

                            return (
                              <article className={styles.habitCard} key={`heatmap-category-${categoryMap.categoryName}`}>
                                <div className={styles.habitHeader}>
                                  {categoryKey && (
                                    <span className={`${styles.habitIcon} ${CATEGORY_ICON_CLASS[categoryKey]}`}>
                                      <CategoryIcon categoryKey={categoryKey} />
                                    </span>
                                  )}
                                  <div>
                                    <h4>{categoryMap.categoryName}</h4>
                                    <p>Category consistency overview</p>
                                  </div>
                                  <span className={`${styles.badge} ${categoryKey ? CATEGORY_BADGE_CLASS[categoryKey] : ""}`}>
                                    {categoryMap.totalCheckIns} check-ins
                                  </span>
                                </div>

                                <div className={styles.statGrid}>
                                  {[
                                    { label: "Longest", value: aggregate?.longest ?? "0d" },
                                    { label: "Total", value: aggregate?.total ?? "0" },
                                    { label: "Rate", value: aggregate?.rate ?? "0%" },
                                  ].map(({ label, value }) => (
                                    <div key={`${categoryMap.categoryName}-${label}`}>
                                      <span>{label}</span>
                                      <strong>{value}</strong>
                                    </div>
                                  ))}
                                </div>

                                <p className={styles.chartLabel}>Consistency Heatmap</p>
                                <HeatmapGrid heatmap={categoryMap.heatmap} idPrefix={`category-${categoryMap.categoryName}`} />
                              </article>
                            );
                          })}
                        </div>}

                      {heatmapMode === "task" && (
                        <div className={styles.categorySections}>
                          {CATEGORY_ORDER.map((categoryKey) => {
                            const sectionHabits = groupedHabitStats[categoryKey];
                            if (!sectionHabits.length) return null;

                            return (
                              <section key={`heatmap-task-${categoryKey}`} className={styles.categorySection}>
                                <h3 className={styles.categoryLabel}>
                                  <span className={CATEGORY_DOT_CLASS[categoryKey]} />
                                  {CATEGORY_LABEL[categoryKey]}
                                </h3>
                                <div className={styles.habitGrid}>
                                  {sectionHabits.map((habit) => {
                                    const { computed } = habit;
                                    const heatmap = buildHeatmapFromRates(habit.dailyRates, days);
                                    return (
                                      <article className={styles.habitCard} key={`heatmap-task-card-${habit.id}`}>
                                        <div className={styles.habitHeader}>
                                          <span className={`${styles.habitIcon} ${CATEGORY_ICON_CLASS[habit.categoryKey]}`}>
                                            <CategoryIcon categoryKey={habit.categoryKey} />
                                          </span>
                                          <div>
                                            <h4>{habit.name}</h4>
                                            <p>{habit.time}</p>
                                          </div>
                                          <span className={`${styles.badge} ${CATEGORY_BADGE_CLASS[habit.categoryKey]}`}>
                                            {computed.badge}
                                          </span>
                                        </div>

                                        <div className={styles.statGrid}>
                                          {[
                                            { label: "Longest", value: computed.longest },
                                            { label: "Total", value: computed.total },
                                            { label: "Rate", value: computed.rate },
                                          ].map(({ label, value }) => (
                                            <div key={`${habit.id}-${label}`}>
                                              <span>{label}</span>
                                              <strong>{value}</strong>
                                            </div>
                                          ))}
                                        </div>

                                        <p className={styles.chartLabel}>Consistency Heatmap</p>
                                        <HeatmapGrid heatmap={heatmap} idPrefix={`task-${habit.id}`} compact />
                                      </article>
                                    );
                                  })}
                                </div>
                              </section>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

          </section>
        </section>
      </div>
      <Footer />
    </AppLayout>
  );
}