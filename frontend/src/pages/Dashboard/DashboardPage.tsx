<<<<<<< HEAD
import { useState, useMemo, useRef, useEffect } from "react";
import AppLayout from "../../components/layout/AppLayout";
import Footer from "../../components/layout/Footer";
import Navbar from "../../components/layout/Navbar";
import { useSettings } from "../../context/SettingsContext";
import styles from "./DashboardPage.module.css";

// ── Types ─────────────────────────────────────────────────────────────────────

type DateRange = "7 Days" | "30 Days" | "Year";
type SortKey = "default" | "rate" | "streak" | "name";
type Category = string;

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "default", label: "Default" },
  { key: "rate", label: "Rate (high → low)" },
  { key: "streak", label: "Streak (long → short)" },
  { key: "name", label: "Name (A → Z)" },
];

interface MockHabit {
  id: string;
  name: string;
  nameVi: string;
  category: string;
  categoryTone: string;
  time: string;
  timeVi: string;
  icon: "run" | "drop" | "mind";
  tone: "blue" | "mint" | "amber";
  dailyRates: number[];
}

// ── Mock data generator ───────────────────────────────────────────────────────

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

const MOCK_HABITS: MockHabit[] = [
  {
    id: "h1",
    name: "Morning Run",       nameVi: "Chạy bộ buổi sáng",
    category: "Health & Fitness", categoryTone: "blue",
    time: "Daily - 6:30 AM",  timeVi: "Hàng ngày - 6:30 SA",
    icon: "run", tone: "blue",
    dailyRates: generateRates(0.85, "up"),
  },
  {
    id: "h2",
    name: "Drink Water",       nameVi: "Uống nước",
    category: "Health & Fitness", categoryTone: "blue",
    time: "Hourly - 2L Target", timeVi: "Mỗi giờ - 2L mục tiêu",
    icon: "drop", tone: "mint",
    dailyRates: generateRates(0.6, "down"),
  },
  {
    id: "h3",
    name: "Meditation",        nameVi: "Thiền",
    category: "Mindfulness",   categoryTone: "brown",
    time: "Daily - 10 mins",   timeVi: "Hàng ngày - 10 phút",
    icon: "mind", tone: "amber",
    dailyRates: generateRates(0.95, "flat"),
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function rangeDays(range: DateRange): number {
  if (range === "7 Days") return 7;
  if (range === "30 Days") return 30;
  return 365;
}

function computeStats(habit: MockHabit, days: number) {
  const slice = habit.dailyRates.slice(-days);

  // completion rate for range
  const avgRate = slice.reduce((s, r) => s + r, 0) / slice.length;
  const completedDays = slice.filter((r) => r >= 0.8).length;

  // current streak (from today backwards)
  let streak = 0;
  for (let i = habit.dailyRates.length - 1; i >= 0; i--) {
    if (habit.dailyRates[i] >= 0.8) streak++;
    else break;
  }

  // longest streak in range
  let longest = 0, cur = 0;
  for (const r of slice) {
    if (r >= 0.8) { cur++; longest = Math.max(longest, cur); }
    else cur = 0;
  }

  // bar chart: group by day (7/30) or by week (year → 52 bars)
  let bars: number[];
  if (days <= 30) {
    bars = slice.map((r) => Math.round(r * 100));
  } else {
    // group into 52 weekly averages
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
    badgeTone: streak >= 3 ? (habit.tone === "blue" ? "blue" : "amber") : "red",
    badge: streak >= 1 ? `${streak} day${streak > 1 ? "s" : ""}` : "0 days",
  };
}

function computeSummary(habits: MockHabit[], days: number, tFn: (k: string) => string) {
  const slices = habits.map((h) => h.dailyRates.slice(-days));

  const todayRates = habits.map((h) => h.dailyRates[h.dailyRates.length - 1]);
  const todayPct = Math.round((todayRates.reduce((s, r) => s + r, 0) / todayRates.length) * 100);

  const prevSlices = habits.map((h) => h.dailyRates.slice(-days * 2, -days));
  const prevFlat = prevSlices.flat();
  const prevPct = prevFlat.length
    ? Math.round((prevFlat.reduce((s, r) => s + r, 0) / prevFlat.length) * 100)
    : todayPct;
  const diff = todayPct - prevPct;
  const diffLabel = `${diff >= 0 ? "+" : ""}${diff}% ${tFn("vsLastPeriod")}`;

  const activeCount = slices.filter((s) => s.some((r) => r >= 0.8)).length;

  const atRisk = habits.filter((h) => {
    const slice = h.dailyRates.slice(-days);
    const avg = slice.reduce((s, r) => s + r, 0) / slice.length;
    return avg < 0.5;
  });

  const progressWidth = `${todayPct}%`;

  return { todayPct, diffLabel, activeCount, atRisk, progressWidth };
}

// ── Filter dropdown ───────────────────────────────────────────────────────────

interface FilterDropdownProps {
  categories: Category[];
  category: Category;
  sort: SortKey;
  onCategory: (c: Category) => void;
  onSort: (s: SortKey) => void;
  onClose: () => void;
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

// ── Sub-components ────────────────────────────────────────────────────────────

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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [range, setRange] = useState<DateRange>("7 Days");
  const [filterOpen, setFilterOpen] = useState(false);
  const [category, setCategory] = useState<Category>("All");
  const [sort, setSort] = useState<SortKey>("default");
  const { settings, t } = useSettings();
  const isVi = settings.language === "Vietnamese";

  const days = rangeDays(range);
  const summary = useMemo(() => computeSummary(MOCK_HABITS, days, t), [days, t]);

  // derive unique categories from data — auto-expands when new habits are added
  const categories = useMemo(
    () => [...new Set(MOCK_HABITS.map((h) => h.category))].sort(),
    []
  );

  const habitStats = useMemo(() => {
    let list = MOCK_HABITS.map((h) => ({ ...h, computed: computeStats(h, days) }));

    // filter by category
    if (category !== "All") {
      list = list.filter((h) => h.category === category);
    }

    // sort
    if (sort === "rate") {
      list = [...list].sort((a, b) => parseFloat(b.computed.rate) - parseFloat(a.computed.rate));
    } else if (sort === "streak") {
      list = [...list].sort((a, b) => b.computed.streak - a.computed.streak);
    } else if (sort === "name") {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [days, category, sort]);

  const chartLabel = range === "Year"
    ? t("lastWeeksActivity")
    : t("lastDaysActivity").replace("{n}", String(days));

  const hasActiveFilter = category !== "All" || sort !== "default";

  return (
    <AppLayout>
      <div className={styles.content}>
        <Navbar onRangeChange={setRange} />

        <section className={styles.dashboardSection}>
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
                <span className={`${styles.statusText} ${styles.blueText}`}>
                  {summary.diffLabel}
                </span>
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
                <span>M</span>
                <span>H</span>
                <span>W</span>
                <span>+{Math.max(0, summary.activeCount - 3)}</span>
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
                    onCategory={(c) => { setCategory(c); }}
                    onSort={(s) => { setSort(s); }}
                    onClose={() => setFilterOpen(false)}
                  />
                )}
              </div>
            </div>

            {habitStats.length === 0 ? (
              <p className={styles.emptyFilter}>No habits found for "{category}".</p>
            ) : (
            <div className={styles.habitGrid}>
              {habitStats.map((habit, index) => {
                const showCategory =
                  index === 0 || habitStats[index - 1].category !== habit.category;
                const { computed } = habit;

                return (
                  <div className={styles.habitGroup} key={habit.id}>
                    {showCategory ? (
                      <h3 className={styles.categoryLabel}>
                        <span className={styles[`${habit.categoryTone}Dot`]} />
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
                          <h4>{isVi ? habit.nameVi : habit.name}</h4>
                          <p>{isVi ? habit.timeVi : habit.time}</p>
                        </div>
                        <span className={`${styles.badge} ${styles[`${computed.badgeTone}Badge`]}`}>
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
                        {[
                          { label: t("longest"), value: computed.longest },
                          { label: t("total"),   value: computed.total },
                          { label: t("rate"),    value: computed.rate },
                        ].map(({ label, value }) => (
                          <div key={label}>
                            <span>{label}</span>
                            <strong>{value}</strong>
                          </div>
                        ))}
                      </div>

                      <p className={styles.chartLabel}>{chartLabel}</p>
                      <div className={`${styles.bars} ${styles[`${habit.tone}Bars`]}`}
                        style={{ gridTemplateColumns: `repeat(${computed.bars.length}, 1fr)` }}
                      >
                        {computed.bars.map((height, i) => (
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
              <span>Consistency is Key</span>
              <h2>You're on a {habitStats[0]?.computed.streak ?? 0}-day total completion streak!</h2>
              <p>The best way to predict the future is to create it, one habit at a time.</p>
            </div>
          </section>
        </section>

        <Footer />
      </div>
=======
import AppLayout from '../../components/layout/AppLayout';
import { useState } from 'react';
import HabitForm from '../../components/habits/HabitForm';

export default function DashboardPage() {
  const [showForm, setShowForm] = useState(false);

  return (
    <AppLayout onNewHabit={() => setShowForm(true)}>
      <div style={{ padding: '32px 28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>Dashboard & Statistics</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Track your progress and insights here. (Coming soon)</p>
      </div>
      {showForm && (
        <HabitForm
          editingHabit={null}
          onClose={() => setShowForm(false)}
        />
      )}
>>>>>>> bfc24883811180e83605cbaf1e2d9346a6f3feae
    </AppLayout>
  );
}
