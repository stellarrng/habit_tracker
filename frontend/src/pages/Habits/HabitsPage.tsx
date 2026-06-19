import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Habit, CheckIn } from '../../types';
import { useHabitContext } from '../../context/HabitContext';
import { getCheckIns, upsertCheckIn } from '../../api/checkins';
import AppLayout from '../../components/layout/AppLayout';
import HabitForm from '../../components/habits/HabitForm';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import Toast from '../../components/shared/Toast';
import EmptyState from '../../components/shared/EmptyState';
import { TargetIcon, SearchIcon, PlusIcon, CheckIcon, PauseIcon, ArchiveIcon } from '../../components/shared/Icons';
import HabitCategoryIcon from '../../components/shared/HabitCategoryIcon';
import styles from './HabitsPage.module.css';

// ── Inline icon ───────────────────────────────────────────────────────────────

const CATEGORY_DOT_COLORS: Record<string, string> = {
  Health: 'var(--color-category-health-text)',
  Study: 'var(--color-category-study-text)',
  Work: 'var(--color-category-work-text)',
  Mindfulness: 'var(--color-category-mindfulness-text)',
  Other: 'var(--color-category-other-text)',
};

export default function HabitsPage() {
  const { filteredHabits, habits, loading, error, removeHabit, clearError, changeStatus, filters, setFilters } = useHabitContext();

  const [allCheckIns, setAllCheckIns] = useState<CheckIn[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [showForm, setShowForm]         = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [habitToArchive, setHabitToArchive] = useState<Habit | null>(null);
  const [habitToDelete, setHabitToDelete] = useState<Habit | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

            <div
              className={`${styles.statCard} ${filters.status === 'Paused' ? styles.activeFilter : ''}`}
              onClick={() => setFilters({ status: filters.status === 'Paused' ? 'All' : 'Paused' })}
              title="Filter by Paused habits"
            >
              <div className={`${styles.statIcon} ${styles.iconPaused}`}>
                <PauseIcon style={{ width: 20, height: 20 }} />
              </div>
              <div className={styles.statDetails}>
                <span className={styles.statNumber}>{pausedCount}</span>
                <span className={styles.statName}>Paused</span>
              </div>
            </div>

            <div
              className={`${styles.statCard} ${filters.status === 'Archived' ? styles.activeFilter : ''}`}
              onClick={() => setFilters({ status: filters.status === 'Archived' ? 'All' : 'Archived' })}
              title="Filter by Archived habits"
            >
              <div className={`${styles.statIcon} ${styles.iconArchived}`}>
                <ArchiveIcon style={{ width: 20, height: 20 }} />
              </div>
              <div className={styles.statDetails}>
                <span className={styles.statNumber}>{archivedCount}</span>
                <span className={styles.statName}>Archived</span>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <HabitFilters />

        {/* Loading */}
        {loading && (
          <div className="loading-center">
            <div className="spinner" />
          </div>
        )}

        {/* Empty: no habits at all */}
        {!loading && habits.length === 0 && (
          <EmptyState
            icon={<TargetIcon style={{ width: 48, height: 48 }} />}
            title="No habits yet"
            subtitle="Start building your routine by adding your first habit. Track daily progress and build streaks!"
            action={{ label: 'Add Your First Habit', onClick: openCreate }}
          />
        )}

        {/* Empty: habits exist but filters give 0 results */}
        {!loading && habits.length > 0 && filteredHabits.length === 0 && (
          <EmptyState
            icon={<SearchIcon style={{ width: 48, height: 48 }} />}
            title="No habits match your filters"
            subtitle="Try adjusting the filters above to see your habits."
          />
        )}

        {/* Habit Groups by Category */}
        {!loading && filteredHabits.length > 0 && (
          <div className={styles.categoryGroups}>
            {activeCategories.map(category => (
              <div key={category} className={styles.categorySection}>
                <h2 className={styles.categoryHeading}>
                  <span
                    className={styles.categoryHeadingDot}
                    style={{ backgroundColor: CATEGORY_DOT_COLORS[category] || 'var(--text-muted)' }}
                  />
                  {category}
                  <span className={styles.categoryCount}>
                    ({habitsByCategory[category].length})
                  </span>
                </h2>
                <div className={styles.habitsGrid}>
                  {habitsByCategory[category].map((habit, idx) => (
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
                      <HabitCard
                        habit={habit}
                        onEdit={openEdit}
                        onArchiveRequest={requestArchive}
                        onDeleteRequest={setHabitToDelete}
                        onStatusChange={handleStatusChangeNotification}
                        onSetGoal={openSetGoal}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>


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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!habitToDelete}
        title="Delete Habit"
        message={`Are you sure you want to delete "${habitToDelete?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        type="danger"
        onConfirm={() => {
          if (habitToDelete) {
            removeHabit(habitToDelete._id);
          }
          setHabitToDelete(null);
        }}
        onCancel={() => setHabitToDelete(null)}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="success"
          duration={3000}
          onClose={() => setToastMessage(null)}
        />
      )}
    </AppLayout>
  );
}
