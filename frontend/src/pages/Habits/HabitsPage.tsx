import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Habit, CheckIn } from '../../types';
import { useHabitContext } from '../../context/HabitContext';
import { getCheckIns, upsertCheckIn } from '../../api/checkins';
import AppLayout from '../../components/layout/AppLayout';
import HabitForm from '../../components/habits/HabitForm';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import Toast from '../../components/shared/Toast';
import HabitCategoryIcon from '../../components/shared/HabitCategoryIcon';
import { PlusIcon, EditIcon, TrashIcon, PlayIcon } from '../../components/shared/Icons';
import styles from './HabitsPage.module.css';

// ── Inline icon ───────────────────────────────────────────────────────────────

function DownloadIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

function buildCurrentWeek(todayStr: string) {
  const today = new Date(todayStr + 'T00:00:00');
  const offset = (today.getDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - offset + i);
    return { label: WEEK_LABELS[i], iso: fmt(d) };
  });
}

function buildLast60Days(todayStr: string): string[] {
  const today = new Date(todayStr + 'T00:00:00');
  return Array.from({ length: 60 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - 59 + i);
    return fmt(d);
  });
}

function heatColor(pct: number): string {
  if (pct === 0)  return '#EDEDED';
  if (pct < 34)   return '#FCE8EE';
  if (pct < 67)   return '#F4ACBA';
  if (pct < 100)  return '#C4789A';
  return '#896474';
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ALL_CATEGORIES = ['All', 'Health', 'Study', 'Work', 'Mindfulness', 'Other'] as const;
const PRIORITIES     = ['All Priorities', 'High', 'Medium', 'Low'] as const;
const STATUSES       = ['Any Status', 'Active', 'Paused'] as const;

// ── Component ─────────────────────────────────────────────────────────────────

export default function HabitsPage() {
  const navigate = useNavigate();
  const { habits, loading, removeHabit, changeStatus } = useHabitContext();

  const [allCheckIns, setAllCheckIns] = useState<CheckIn[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [showForm, setShowForm]         = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Habit | null>(null);
  const [deleteTarget, setDeleteTarget]   = useState<Habit | null>(null);
  const [toast, setToast]               = useState<string | null>(null);

  const [catFilter, setCatFilter]           = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All Priorities');
  const [statusFilter, setStatusFilter]     = useState('Any Status');

  const todayStr = fmt(new Date());

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchCheckIns = useCallback(async () => {
    try {
      const data = await getCheckIns();
      setAllCheckIns(data);
    } catch {
      // silently ignore
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading) fetchCheckIns();
  }, [loading, fetchCheckIns]);

  // ── Derived ───────────────────────────────────────────────────────────────

  const checkInMap = useMemo(() => {
    const map = new Map<string, Map<string, CheckIn>>();
    for (const ci of allCheckIns) {
      if (!map.has(ci.habitId)) map.set(ci.habitId, new Map());
      map.get(ci.habitId)!.set(ci.date, ci);
    }
    return map;
  }, [allCheckIns]);

  const nonArchivedHabits = useMemo(() => habits.filter(h => h.status !== 'Archived'), [habits]);

  const displayHabits = useMemo(() => {
    return nonArchivedHabits.filter(h => {
      if (catFilter !== 'All' && h.category !== catFilter) return false;
      if (priorityFilter !== 'All Priorities' && h.priority !== priorityFilter) return false;
      if (statusFilter !== 'Any Status' && h.status !== statusFilter) return false;
      return true;
    });
  }, [nonArchivedHabits, catFilter, priorityFilter, statusFilter]);

  const availableCategories = useMemo(() => {
    const cats = new Set(nonArchivedHabits.map(h => h.category));
    return ALL_CATEGORIES.filter(c => c === 'All' || cats.has(c as Habit['category']));
  }, [nonArchivedHabits]);

  const todayCheckInMap = useMemo(() => {
    const map = new Map<string, CheckIn>();
    for (const h of nonArchivedHabits) {
      const ci = checkInMap.get(h._id)?.get(todayStr);
      if (ci) map.set(h._id, ci);
    }
    return map;
  }, [nonArchivedHabits, checkInMap, todayStr]);

  // Weekly bar chart
  const weekDays = useMemo(() => buildCurrentWeek(todayStr), [todayStr]);

  const weeklyBars = useMemo(() => {
    const activeHabits = nonArchivedHabits.filter(h => h.status === 'Active');
    const total = activeHabits.length || 1;
    return weekDays.map(day => {
      const completed = activeHabits.filter(
        h => checkInMap.get(h._id)?.get(day.iso)?.status === 'Completed'
      ).length;
      return { label: day.label, pct: Math.round((completed / total) * 100) };
    });
  }, [nonArchivedHabits, checkInMap, weekDays]);

  const avgWeeklyPct = useMemo(() => {
    const past = weeklyBars.filter((_, i) => weekDays[i].iso <= todayStr);
    if (!past.length) return 0;
    return Math.round(past.reduce((s, b) => s + b.pct, 0) / past.length);
  }, [weeklyBars, weekDays, todayStr]);

  // 30-day heatmap
  const last60Days = useMemo(() => buildLast60Days(todayStr), [todayStr]);

  const heatmapData = useMemo(() => {
    const activeHabits = nonArchivedHabits.filter(h => h.status === 'Active');
    const total = activeHabits.length || 1;
    return last60Days.map(date => {
      const completed = activeHabits.filter(
        h => checkInMap.get(h._id)?.get(date)?.status === 'Completed'
      ).length;
      return { date, pct: Math.round((completed / total) * 100) };
    });
  }, [nonArchivedHabits, checkInMap, last60Days]);

  const activeCount = nonArchivedHabits.filter(h => h.status === 'Active').length;

  // ── Actions ───────────────────────────────────────────────────────────────

  async function handleLogActivity(habit: Habit) {
    const existing = todayCheckInMap.get(habit._id);
    const newCount = (existing?.completedCount ?? 0) + 1;

    const optimistic: CheckIn = {
      _id: existing?._id ?? `tmp-${habit._id}`,
      userId: habit.userId,
      habitId: habit._id,
      date: todayStr,
      completedCount: newCount,
      status: newCount >= habit.targetPerDay ? 'Completed' : 'In Progress',
      note: existing?.note ?? '',
    };

    setAllCheckIns(prev => {
      const idx = prev.findIndex(ci => ci.habitId === habit._id && ci.date === todayStr);
      if (idx >= 0) { const copy = [...prev]; copy[idx] = optimistic; return copy; }
      return [...prev, optimistic];
    });

    try {
      const result = await upsertCheckIn({ habitId: habit._id, date: todayStr, completedCount: newCount });
      setAllCheckIns(prev => {
        const idx = prev.findIndex(ci => ci.habitId === habit._id && ci.date === todayStr);
        if (idx >= 0) { const copy = [...prev]; copy[idx] = result; return copy; }
        return prev;
      });
      if (result.status === 'Completed') setToast(`${habit.name} completed today! 🎉`);
    } catch {
      // rollback
      setAllCheckIns(prev => {
        if (!existing) return prev.filter(ci => !(ci.habitId === habit._id && ci.date === todayStr));
        return prev.map(ci => ci.habitId === habit._id && ci.date === todayStr ? existing : ci);
      });
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const name = deleteTarget.name;
    setDeleteTarget(null);
    await removeHabit(deleteTarget._id);
    setToast(`${name} deleted`);
  }

  async function handleArchive() {
    if (!archiveTarget) return;
    const name = archiveTarget.name;
    await changeStatus(archiveTarget._id, 'Archived');
    setArchiveTarget(null);
    setToast(`${name} archived`);
  }

  const isLoading = loading || dataLoading;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <div className={styles.page}>

        {/* Page Header */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Manage Habits</h1>
            <p className={styles.pageSub}>
              Design your ideal daily architecture. Small, consistent steps lead to transformative lasting change.
            </p>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.exportBtn} onClick={() => setToast('Export coming soon')}>
              <DownloadIcon style={{ width: 15, height: 15 }} />
              Export Data
            </button>
            <button className={styles.addBtn} onClick={() => { setEditingHabit(null); setShowForm(true); }}>
              <PlusIcon style={{ width: 15, height: 15 }} />
              Add New Habit
            </button>
          </div>
        </div>

        {/* Top two-column grid */}
        <div className={styles.topGrid}>

          {/* Weekly Snapshot */}
          <div className={styles.card}>
            <div className={styles.snapshotHeader}>
              <div>
                <h2 className={styles.cardTitle}>Weekly Snapshot</h2>
                <p className={styles.cardSub}>Completion rate over the last 7 days</p>
              </div>
              <span className={styles.avgBadge}>
                <span className={styles.avgDot} />
                Avg: {avgWeeklyPct}%
              </span>
            </div>
            <div className={styles.barChart}>
              {weeklyBars.map((bar, i) => (
                <div key={i} className={styles.barCol}>
                  <div className={styles.barTrack}>
                    <div
                      className={`${styles.barFill} ${weekDays[i].iso > todayStr ? styles.barFuture : ''}`}
                      style={{ height: `${Math.max(bar.pct, 4)}%` }}
                    />
                  </div>
                  <span className={styles.barLabel}>{bar.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Filters</h2>

            <div className={styles.filterSection}>
              <span className={styles.filterLabel}>Category</span>
              <div className={styles.catPills}>
                {availableCategories.map(cat => (
                  <button
                    key={cat}
                    className={`${styles.catPill} ${catFilter === cat ? styles.catPillActive : ''}`}
                    onClick={() => setCatFilter(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.filterSection}>
              <span className={styles.filterLabel}>Priority</span>
              <select
                className={styles.filterSelect}
                value={priorityFilter}
                onChange={e => setPriorityFilter(e.target.value)}
              >
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>

            <div className={styles.filterSection}>
              <span className={styles.filterLabel}>Status</span>
              <select
                className={styles.filterSelect}
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Habits list */}
        <div className={styles.habitsSection}>
          <div className={styles.habitsSectionHeader}>
            <h2 className={styles.sectionTitle}>Your Habits</h2>
            <span className={styles.activeCount}>{activeCount} habit{activeCount !== 1 ? 's' : ''} active</span>
          </div>

          {isLoading && (
            <div className={styles.skeletonList}>
              {[1, 2, 3].map(i => <div key={i} className={styles.skeletonRow} />)}
            </div>
          )}

          {!isLoading && displayHabits.length === 0 && (
            <div className={styles.emptyState}>
              <p>No habits match your filters.</p>
              {nonArchivedHabits.length === 0 && (
                <button className={styles.addBtn} onClick={() => { setEditingHabit(null); setShowForm(true); }}>
                  <PlusIcon style={{ width: 14, height: 14 }} /> Add Your First Habit
                </button>
              )}
            </div>
          )}

          {!isLoading && displayHabits.map(habit => {
            const ci = todayCheckInMap.get(habit._id);
            const isCompleted = ci?.status === 'Completed';
            const isPaused = habit.status === 'Paused';
            const desc = habit.description;

            return (
              <div key={habit._id} className={styles.habitRow}>
                <HabitCategoryIcon category={habit.category} size={44} completed={isCompleted} />

                <div className={styles.habitInfo}>
                  <div className={styles.habitNameRow}>
                    <button
                      className={styles.habitName}
                      onClick={() => navigate(`/habits/${habit._id}`)}
                      title="View details"
                    >
                      {habit.name}
                    </button>
                    <span className={`${styles.priorityBadge} ${styles[`priority${habit.priority}`]}`}>
                      {habit.priority.toUpperCase()}
                    </span>
                  </div>
                  {desc && <p className={styles.habitDesc}>{desc}</p>}
                </div>

                <div className={styles.statusCol}>
                  <span className={styles.statusColLabel}>Status</span>
                  <span className={styles.statusValue}>
                    <span className={`${styles.statusDot} ${styles[`dot${habit.status}`]}`} />
                    {habit.status}
                  </span>
                </div>

                <div className={styles.habitActions}>
                  <button className={styles.iconBtn} onClick={() => { setEditingHabit(habit); setShowForm(true); }} title="Edit">
                    <EditIcon style={{ width: 15, height: 15 }} />
                  </button>
                  <button className={`${styles.iconBtn} ${styles.deleteBtnIcon}`} onClick={() => setDeleteTarget(habit)} title="Delete">
                    <TrashIcon style={{ width: 15, height: 15 }} />
                  </button>

                  <div className={styles.actionBtnWrap}>
                    {isCompleted && (
                      <span className={styles.goalBadge}>GOAL ACHIEVED TODAY</span>
                    )}
                    {isPaused ? (
                      <button className={styles.resumeBtn} onClick={() => changeStatus(habit._id, 'Active')}>
                        <PlayIcon style={{ width: 11, height: 11 }} /> Resume
                      </button>
                    ) : isCompleted ? (
                      <button className={styles.loggedBtn} disabled>Logged</button>
                    ) : (
                      <button className={styles.logBtn} onClick={() => handleLogActivity(habit)}>
                        Log Activity
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Consistency Landscape */}
        {!isLoading && (
          <div className={`${styles.card} ${styles.heatmapCard}`}>
            <div className={styles.heatmapHeader}>
              <div>
                <h2 className={styles.cardTitle}>Consistency Landscape</h2>
                <p className={styles.cardSub}>Daily activity heatmap (last 60 days)</p>
              </div>
              <div className={styles.heatLegend}>
                <span className={styles.legendLabel}>Less</span>
                {['#EDEDED', '#FCE8EE', '#F4ACBA', '#C4789A', '#896474'].map((c, i) => (
                  <span key={i} className={styles.legendCell} style={{ background: c }} />
                ))}
                <span className={styles.legendLabel}>More</span>
              </div>
            </div>
            <div className={styles.heatmapGrid}>
              {heatmapData.map(({ date, pct }) => (
                <div
                  key={date}
                  className={styles.heatCell}
                  style={{ background: heatColor(pct) }}
                  title={`${date}: ${pct}%`}
                />
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Modals */}
      {showForm && (
        <HabitForm
          editingHabit={editingHabit}
          onClose={() => { setShowForm(false); setEditingHabit(null); }}
        />
      )}

      <ConfirmDialog
        isOpen={!!archiveTarget}
        title="Archive Habit"
        message={archiveTarget ? `Archive "${archiveTarget.name}"? You can restore it later.` : ''}
        type="warning"
        confirmLabel="Archive"
        cancelLabel="Cancel"
        onConfirm={handleArchive}
        onCancel={() => setArchiveTarget(null)}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Habit"
        message={deleteTarget ? `Delete "${deleteTarget.name}"? This cannot be undone.` : ''}
        type="warning"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {toast && (
        <Toast message={toast} type="success" duration={3000} onClose={() => setToast(null)} />
      )}
    </AppLayout>
  );
}
