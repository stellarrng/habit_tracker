import { useState, useMemo, useRef, useEffect } from "react";
import { BookOpen, Brain, Briefcase, Heart, Sparkles, type LucideIcon } from "lucide-react";
import AppLayout from "../../components/layout/AppLayout";
import Footer from "../../components/layout/Footer";
import { AlertCircleIcon, CheckIcon, TargetIcon } from "../../components/shared/Icons";
import { DATE_RANGES, useSettings } from "../../context/SettingsContext";
import styles from "./DashboardPage.module.css";

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
  nameVi: string;
  categoryKey: CategoryKey;
  category: string;
  categoryTone: string;
  time: string;
  timeVi: string;
  icon: "run" | "drop" | "mind";
  tone: "blue" | "mint" | "amber";
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

function generateRates(baseRate: number, trend: "up" | "down" | "flat", days = 365): number[] {
  const rates: number[] = [];
  for (let i = 0; i < days; i++) {
    const progress = i / days;
    const trendDelta = trend === "up" ? progress * 0.2 : trend === "down" ? -progress * 0.3 : 0;
    const noise = (Math.sin(i * 2.3) * 0.15) + (Math.sin(i * 0.7) * 0.1);
    rates.push(Math.min(1, Math.max(0, baseRate + trendDelta + noise)));
  }
  return rates;
}

const MOCK_HABITS: DashboardHabit[] = [
  {
    id: "h1",
    name: "Morning Run",
    nameVi: "Chay bo buoi sang",
    categoryKey: "Health",
    category: "Health",
    categoryTone: "blue",
    time: "Daily - 6:30 AM",
    timeVi: "Hang ngay - 6:30 SA",
    icon: "run",
    tone: "blue",
    dailyRates: generateRates(0.85, "up"),
  },
  {
    id: "h2",
    name: "Drink Water",
    nameVi: "Uong nuoc",
    categoryKey: "Health",
    category: "Health",
    categoryTone: "blue",
    time: "Hourly - 2L Target",
    timeVi: "Moi gio - 2L muc tieu",
    icon: "drop",
    tone: "mint",
    dailyRates: generateRates(0.6, "down"),
  },
  {
    id: "h3",
    name: "Meditation",
    nameVi: "Thien",
    categoryKey: "Mindfulness",
    category: "Mindfulness",
    categoryTone: "brown",
    time: "Daily - 10 mins",
    timeVi: "Hang ngay - 10 phut",
    icon: "mind",
    tone: "amber",
    dailyRates: generateRates(0.95, "flat"),
  },
  {
    id: "h4",
    name: "Read 20 Pages",
    nameVi: "Doc 20 trang",
    categoryKey: "Study",
    category: "Study",
    categoryTone: "brown",
    time: "Daily - Evening",
    timeVi: "Hang ngay - Buoi toi",
    icon: "mind",
    tone: "amber",
    dailyRates: generateRates(0.72, "up"),
  },
  {
    id: "h5",
    name: "Deep Work Block",
    nameVi: "Lam viec tap trung",
    categoryKey: "Work",
    category: "Work",
    categoryTone: "blue",
    time: "Weekdays - 90 mins",
    timeVi: "Ngay thuong - 90 phut",
    icon: "drop",
    tone: "mint",
    dailyRates: generateRates(0.68, "flat"),
  },
  {
    id: "h6",
    name: "Sleep Before 11 PM",
    nameVi: "Ngu truoc 11 gio",
    categoryKey: "Health",
    category: "Health",
    categoryTone: "blue",
    time: "Daily - Night",
    timeVi: "Hang ngay - Buoi dem",
    icon: "run",
    tone: "blue",
    dailyRates: generateRates(0.58, "up"),
  },
  {
    id: "h7",
    name: "Daily Journal",
    nameVi: "Viet nhat ky",
    categoryKey: "Mindfulness",
    category: "Mindfulness",
    categoryTone: "brown",
    time: "Daily - 15 mins",
    timeVi: "Hang ngay - 15 phut",
    icon: "mind",
    tone: "amber",
    dailyRates: generateRates(0.62, "down"),
  },
  {
    id: "h8",
    name: "Plan Tomorrow",
    nameVi: "Lap ke hoach ngay mai",
    categoryKey: "Other",
    category: "Other",
    categoryTone: "brown",
    time: "Daily - 10 mins",
    timeVi: "Hang ngay - 10 phut",
    icon: "drop",
    tone: "mint",
    dailyRates: generateRates(0.74, "flat"),
  },
];

function rangeDays(range: DateRange): number {
  if (range === "7 Days") return 7;
  if (range === "30 Days") return 30;
  return 365;
}

function formatDayMonth(d: Date): string {
  return `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })}`;
}

function buildTimeLabels(range: DateRange): { labels: string[]; majorLabelIdx: number[] } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (range === "7 Days") {
    const labels = Array.from({ length: 8 }, (_, idx) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (7 - idx));
      return String(d.getDate());
    });
    return { labels, majorLabelIdx: labels.map((_, idx) => idx) };
  }

  if (range === "30 Days") {
    const labels = Array.from({ length: 30 }, (_, idx) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (29 - idx));
      return formatDayMonth(d);
    });
    return { labels, majorLabelIdx: [0, 7, 14, 21, 28] };
  }

  return {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    majorLabelIdx: Array.from({ length: 12 }, (_, idx) => idx),
  };
}

function buildLineSeries(rates: number[], range: DateRange): number[] {
  if (range === "7 Days") {
    return rates.slice(-8).map((r) => Math.round(r * 100));
  }
  if (range === "30 Days") {
    return rates.slice(-30).map((r) => Math.round(r * 100));
  }

  const monthSizes = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const padded = rates.length >= 365 ? rates.slice(-365) : [...Array.from({ length: 365 - rates.length }, () => 0), ...rates];
  const series: number[] = [];
  let start = 0;
  for (const size of monthSizes) {
    const chunk = padded.slice(start, start + size);
    const avg = chunk.reduce((sum, v) => sum + v, 0) / Math.max(chunk.length, 1);
    series.push(Math.round(avg * 100));
    start += size;
  }
  return series;
}

function lineAxisMarks(range: DateRange): { label: string; pos: number }[] {
  const { labels, majorLabelIdx } = buildTimeLabels(range);
  return majorLabelIdx.map((idx) => ({
    label: labels[idx],
    pos: (idx / Math.max(labels.length - 1, 1)) * 100,
  }));
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
  if (mode === "year") {
    start.setMonth(0, 1);
  } else {
    start.setDate(today.getDate() - (totalDays - 1));
  }

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
          {Array.from({ length: heatmap.matrix[0].length }, (_, idx) => (
            <span key={`${idPrefix}-w-${idx}`}>W{idx + 1}</span>
          ))}
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
  const { settings, t } = useSettings();
  const [range, setRange] = useState<DateRange>(settings.defaultRange);
  const [chartView, setChartView] = useState<ChartView>("bar");
  const [chartDataMode, setChartDataMode] = useState<HeatmapMode>("task");
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>("category");
  const [lineCategoryFilter, setLineCategoryFilter] = useState<CategoryKey[]>(CATEGORY_ORDER);
  const [lineCategoryOpen, setLineCategoryOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [category, setCategory] = useState<CategoryFilter>("All");
  const [sort, setSort] = useState<SortKey>("default");
  const [dashboardHabits] = useState<DashboardHabit[]>(MOCK_HABITS);
  const isVi = settings.language === "Vietnamese";

  useEffect(() => {
    setRange(settings.defaultRange);
  }, [settings.defaultRange]);

  const days = rangeDays(range);
  const categories = useMemo(() => CATEGORY_ORDER, []);

  const habitStats = useMemo<HabitWithComputed[]>(() => {
    let list = dashboardHabits.map((h) => ({ ...h, computed: computeStats(h, days) }));

    if (category !== "All") {
      list = list.filter((h) => h.categoryKey === category);
    }

    if (sort === "rate") {
      list = [...list].sort((a, b) => parseFloat(b.computed.rate) - parseFloat(a.computed.rate));
    } else if (sort === "streak") {
      list = [...list].sort((a, b) => b.computed.streak - a.computed.streak);
    } else if (sort === "name") {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [dashboardHabits, days, category, sort]);

  const chartLabel = range === "Year"
    ? t("lastWeeksActivity")
    : t("lastDaysActivity").replace("{n}", String(days));

  const hasActiveFilter = category !== "All" || sort !== "default";
  const groupedHabitStats = useMemo(() => {
    const grouped: Record<CategoryKey, HabitWithComputed[]> = {
      Health: [],
      Study: [],
      Work: [],
      Mindfulness: [],
      Other: [],
    };
    for (const habit of habitStats) {
      grouped[habit.categoryKey].push(habit);
    }
    return grouped;
  }, [habitStats]);
  const categoryCardData = useMemo(() => {
    return CATEGORY_ORDER.map((categoryKey) => {
      const rows = groupedHabitStats[categoryKey];
      if (!rows.length) return null;
      const barsLength = rows[0].computed.bars.length;
      const bars = Array.from({ length: barsLength }, (_, idx) =>
        Math.round(rows.reduce((sum, row) => sum + row.computed.bars[idx], 0) / rows.length)
      );
      const avgRate = Math.round(
        rows.reduce((sum, row) => sum + parseFloat(row.computed.rate), 0) / rows.length
      );
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

  const dashboardSummary = useMemo(() => {
    const completedTodayHabits = habitStats.filter((habit) => {
      const latest = habit.dailyRates[habit.dailyRates.length - 1];
      return latest >= 0.8;
    });
    const activeHabits = habitStats.filter((habit) => habit.computed.streak > 0);
    const atRiskHabits = habitStats.filter((habit) => {
      const lastThree = habit.dailyRates.slice(-3);
      return lastThree.length === 3 && lastThree.every((rate) => rate < 0.8);
    });

    return {
      completedRate: habitStats.length ? Math.round((completedTodayHabits.length / habitStats.length) * 100) : 0,
      activeCount: activeHabits.length,
      riskCount: atRiskHabits.length,
      riskNames: atRiskHabits.map((habit) => habit.name).slice(0, 2),
      activeLabel: `${activeHabits.length} in ${days} Days`,
    };
  }, [habitStats, days]);

  const heatmapSourceHabits = useMemo(
    () => habitStats as DashboardHabit[],
    [habitStats]
  );
  const categoryHeatmaps = useMemo(
    () => computeCategoryHeatmaps(heatmapSourceHabits, days),
    [heatmapSourceHabits, days]
  );
  const filteredCategoryLineData = useMemo(
    () => categoryCardData.filter((item) => lineCategoryFilter.includes(item.categoryKey)),
    [categoryCardData, lineCategoryFilter]
  );
  const selectedLineCategory: CategoryKey | "all" =
    lineCategoryFilter.length === CATEGORY_ORDER.length ? "all" : lineCategoryFilter[0];
  const categoryLineSeries = useMemo(() => {
    return filteredCategoryLineData.map((item) => {
      const rows = groupedHabitStats[item.categoryKey];
      const merged = Array.from({ length: 365 }, (_, dayIdx) =>
        rows.reduce((sum, row) => sum + row.dailyRates[dayIdx], 0) / Math.max(rows.length, 1)
      );
      return {
        key: item.categoryKey,
        label: item.label,
        points: buildLineSeries(merged, range),
      };
    });
  }, [filteredCategoryLineData, groupedHabitStats, range]);
  const taskPanelTitle = chartView === "line" ? "Task Line Chart" : "Task Bar Chart";
  const taskPanelDesc =
    chartView === "line"
      ? "Individual habit completion trend over time."
      : "Individual habit completion volume in selected range.";

  return (
    <AppLayout>
      <div className={styles.content}>
        <section className={styles.dashboardSection}>
          <div className={styles.summaryGrid}>
            <article className={styles.summaryCard}>
              <div className={styles.cardTop}>
                <div className={`${styles.summaryIcon} ${styles.summaryIconCompleted}`}>
                  <TargetIcon width={20} height={20} aria-hidden />
                </div>
                <span className={`${styles.summaryStatus} ${styles.summaryStatusCompleted}`}>
                  Completed Today
                </span>
              </div>
              <p className={styles.summaryDesc}>
                Latest habit completion rate based on today&apos;s progress.
              </p>
              <div className={styles.metric}>
                <strong>{dashboardSummary.completedRate}%</strong>
                <span>/ 100</span>
              </div>
              <div className={`${styles.progressTrack} ${styles.progressTrackCompleted}`}>
                <span style={{ width: `${dashboardSummary.completedRate}%` }} />
              </div>
            </article>

            <article className={styles.summaryCard}>
              <div className={styles.cardTop}>
                <div className={`${styles.summaryIcon} ${styles.summaryIconActive}`}>
                  <CheckIcon width={20} height={20} aria-hidden />
                </div>
                <span className={`${styles.summaryStatus} ${styles.summaryStatusActive}`}>
                  Active Habits
                </span>
              </div>
              <p className={styles.summaryDesc}>
                Habits with an active streak during the selected range.
              </p>
              <div className={styles.metric}>
                <strong>{dashboardSummary.activeCount}</strong>
                <span>{dashboardSummary.activeLabel}</span>
              </div>
              <div className={styles.avatarStack}>
                <span className={styles.avatarHealth}>H</span>
                <span className={styles.avatarStudy}>S</span>
                <span className={styles.avatarWork}>W</span>
                <span className={styles.avatarMore}>+{Math.max(0, dashboardSummary.activeCount - 3)}</span>
              </div>
            </article>

            <article className={styles.summaryCard}>
              <div className={styles.cardTop}>
                <div className={`${styles.summaryIcon} ${styles.summaryIconRisk}`}>
                  <AlertCircleIcon width={20} height={20} aria-hidden />
                </div>
                <span className={`${styles.summaryStatus} ${styles.summaryStatusRisk}`}>
                  Habits at Risk
                </span>
              </div>
              <p className={styles.summaryDesc}>
                Habits that may be losing momentum and need attention.
              </p>
              <div className={styles.metric}>
                <strong>{dashboardSummary.riskCount}</strong>
                <span>Potential break</span>
              </div>
              {dashboardSummary.riskNames.length > 0 && (
                <div className={styles.riskList}>
                  {dashboardSummary.riskNames.map((name) => `"${name}"`).join(", ")}
                </div>
              )}
            </article>
          </div>

          {/* Habit breakdown */}
          <section className={styles.breakdown}>
            <div className={styles.sectionHeader}>
              <h2>{t("habitBreakdown")}</h2>
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
                                          { label: t("longest"), value: computed.longest },
                                          { label: t("total"), value: computed.total },
                                          { label: t("rate"), value: computed.rate },
                                    ];

                                    return (
                                      <article className={styles.habitCard} key={habit.id}>
                                        <div className={styles.habitHeader}>
                                          <span className={`${styles.habitIcon} ${CATEGORY_ICON_CLASS[habit.categoryKey]}`}>
                                            <CategoryIcon categoryKey={habit.categoryKey} />
                                          </span>
                                          <div>
                                            <h4>{isVi ? habit.nameVi : habit.name}</h4>
                                            <p>{isVi ? habit.timeVi : habit.time}</p>
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
                                          <div className={`${styles.bars} ${CATEGORY_BAR_CLASS[habit.categoryKey]}`}
                                            style={{ gridTemplateColumns: `repeat(${computed.bars.length}, 1fr)` }}
                                          >
                                            {computed.bars.map((height, i) => (
                                              <span key={i} style={{ height: `${Math.max(4, height)}%` }} />
                                            ))}
                                          </div>
                                        )}

                                        {chartView === "line" && (
                                          <div className={styles.lineChartWrap}>
                                            <svg viewBox="0 0 100 44" preserveAspectRatio="none" role="img" aria-label={`${habit.name} line chart`}>
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
                                            {/* HTML overlay dots — always perfectly round, unaffected by SVG aspect ratio distortion */}
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
                        <div className={styles.categorySections}>
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
                              <section key={`category-card-${item.categoryKey}`} className={styles.categorySection}>
                                <h3 className={styles.categoryLabel}>
                                  <span className={CATEGORY_DOT_CLASS[item.categoryKey]} />
                                  {item.label}
                                </h3>
                                <div className={styles.habitGrid}>
                                  <article className={styles.habitCard}>
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
                                        { label: t("longest"), value: computed.longest },
                                        { label: t("total"), value: computed.total },
                                        { label: t("rate"), value: computed.rate },
                                      ].map(({ label, value }) => (
                                        <div key={`${item.categoryKey}-${label}`}>
                                          <span>{label}</span>
                                          <strong>{value}</strong>
                                        </div>
                                      ))}
                                    </div>
                                    <p className={styles.chartLabel}>{chartLabel}</p>
                                    {chartView === "bar" && (
                                      <div className={`${styles.bars} ${CATEGORY_BAR_CLASS[item.categoryKey]}`}
                                        style={{ gridTemplateColumns: `repeat(${computed.bars.length}, 1fr)` }}
                                      >
                                        {computed.bars.map((height, i) => (
                                          <span key={`category-bar-${item.categoryKey}-${i}`} style={{ height: `${Math.max(4, height)}%` }} />
                                        ))}
                                      </div>
                                    )}
                                  </article>
                                </div>
                              </section>
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
                                    { label: t("longest"), value: aggregate?.longest ?? "0d" },
                                    { label: t("total"), value: aggregate?.total ?? "0" },
                                    { label: t("rate"), value: aggregate?.rate ?? "0%" },
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
                                            <h4>{isVi ? habit.nameVi : habit.name}</h4>
                                            <p>{isVi ? habit.timeVi : habit.time}</p>
                                          </div>
                                          <span className={`${styles.badge} ${CATEGORY_BADGE_CLASS[habit.categoryKey]}`}>
                                            {computed.badge}
                                          </span>
                                        </div>

                                        <div className={styles.statGrid}>
                                          {[
                                            { label: t("longest"), value: computed.longest },
                                            { label: t("total"), value: computed.total },
                                            { label: t("rate"), value: computed.rate },
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

          {/* Banner */}
          <section className={styles.banner}>
            <img
              alt=""
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAanMMqLfbMWVb7Jqznbi1GBuGhoSYPAg5AcIJYym-fKC0LCr7UUGsl5wzY5BXjbPfUfUciI2-gVEfD7G_fRsGMYchGPt_i52dYzFAzVZIMc-omSp2-c7QJ5_WqLWLB_ohSOeuap1B2mCJVZgWYLNQLScPRZegzAL00wO2B56jTzFAMpKvnPd9tTNb60TSWA7ztSOxJEo-xkUayNC9o4TfmN2w6_k3UhfKVNXQ90Z8B1LcEHsIv9SxhzD1_IAooJ4YkSomISvwMpqBh"
            />
            <div className={styles.bannerOverlay}>
              <span>Consistency is Key</span>
              <h2>You're on a {habitStats[0]?.computed.streak ?? 0}-day total completion streak!</h2>
              <p>The best way to predict the future is to create it, one habit at a time.</p>
            </div>
          </section>
        </section>
      </div>
      <Footer />
    </AppLayout>
  );
}