import { useState, useMemo } from 'react';
import { Habit } from '../../types';
import { useHabitContext } from '../../context/HabitContext';
import AppLayout from '../../components/layout/AppLayout';
import HabitFilters from '../../components/habits/HabitFilters';
import HabitCard from '../../components/habits/HabitCard';
import HabitForm from '../../components/habits/HabitForm';
import GoalHabitForm from '../../components/habits/GoalHabitForm';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import Toast from '../../components/shared/Toast';
import EmptyState from '../../components/shared/EmptyState';
import ErrorMessage from '../../components/shared/ErrorMessage';
import { TargetIcon, SearchIcon, PlusIcon, CheckIcon, PauseIcon, ArchiveIcon, DownloadIcon } from '../../components/shared/Icons';
import styles from './HabitsPage.module.css';

const CATEGORIES_ORDER = ['Health', 'Study', 'Work', 'Mindfulness', 'Other'] as const;

const CATEGORY_DOT_COLORS: Record<string, string> = {
  Health: 'var(--color-category-health-text)',
  Study: 'var(--color-category-study-text)',
  Work: 'var(--color-category-work-text)',
  Mindfulness: 'var(--color-category-mindfulness-text)',
  Other: 'var(--color-category-other-text)',
};

export default function HabitsPage() {
  const { filteredHabits, habits, loading, error, removeHabit, clearError, changeStatus, filters, setFilters } = useHabitContext();

  // Calculate status counts
  const { activeCount, pausedCount, archivedCount } = useMemo(() => {
    let active = 0;
    let paused = 0;
    let archived = 0;
    habits.forEach(habit => {
      if (habit.status === 'Active') active++;
      else if (habit.status === 'Paused') paused++;
      else if (habit.status === 'Archived') archived++;
    });
    return { activeCount: active, pausedCount: paused, archivedCount: archived };
  }, [habits]);

  const [showForm, setShowForm]         = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [habitToArchive, setHabitToArchive] = useState<Habit | null>(null);
  const [habitToDelete, setHabitToDelete] = useState<Habit | null>(null);

  type ActionState = 
    | { type: 'status'; habitId: string; prevStatus: string; message: string }
    | { type: 'delete'; habitId: string; message: string; timeoutId: ReturnType<typeof setTimeout> };

  const [lastAction, setLastAction] = useState<ActionState | null>(null);
  const [toastKey, setToastKey] = useState(0);

  function undoLast() {
    if (!lastAction) return;
    if (lastAction.type === 'status') {
      changeStatus(lastAction.habitId, lastAction.prevStatus as any);
    } else if (lastAction.type === 'delete') {
      clearTimeout(lastAction.timeoutId);
    }
    setLastAction(null);
  }

  function triggerActionToast(action: ActionState) {
    if (lastAction && lastAction.type === 'delete') {
      // If there was a previous pending delete, it stays pending until timeout. 
      // Actually we don't need to force it here since the timeout is still running.
    }
    setLastAction(action);
    setToastKey(k => k + 1);
  }

  // GoalHabitForm states
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalHabit, setGoalHabit] = useState<Habit | null>(null);
  const [goalStreak, setGoalStreak] = useState(0);
  const [goalCompletions, setGoalCompletions] = useState(0);

  // Group filtered habits by category
  const habitsByCategory = useMemo(() => {
    const groups: Record<string, Habit[]> = {};
    filteredHabits.forEach(habit => {
      if (!groups[habit.category]) {
        groups[habit.category] = [];
      }
      groups[habit.category].push(habit);
    });
    return groups;
  }, [filteredHabits]);

  // Determine active categories to show in predefined order
  const activeCategories = useMemo(() => {
    const defined = CATEGORIES_ORDER.filter(cat => habitsByCategory[cat] && habitsByCategory[cat].length > 0);
    const undefinedCats = Object.keys(habitsByCategory).filter(cat => !CATEGORIES_ORDER.includes(cat as any));
    return [...defined, ...undefinedCats];
  }, [habitsByCategory]);

  function openCreate() { setEditingHabit(null); setShowForm(true); }
  function openEdit(habit: Habit) { setEditingHabit(habit); setShowForm(true); }
  function closeForm() { setShowForm(false); setEditingHabit(null); }
  
  function requestArchive(habit: Habit) {
    setHabitToArchive(habit);
    setShowArchiveDialog(true);
  }
  
  function confirmArchive() {
    if (habitToArchive) {
      changeStatus(habitToArchive._id, 'Archived');
      triggerActionToast({
        type: 'status',
        habitId: habitToArchive._id,
        prevStatus: habitToArchive.status,
        message: `"${habitToArchive.name}" archived`
      });
      setShowArchiveDialog(false);
      setHabitToArchive(null);
    }
  }
  
  function handleStatusChangeNotification(habitId: string, habitName: string, action: 'paused' | 'resumed' | 'restored', prevStatus: string) {
    if (action === 'resumed') {
      triggerActionToast({ type: 'status', habitId, prevStatus, message: `"${habitName}" resumed` });
    } else if (action === 'paused') {
      triggerActionToast({ type: 'status', habitId, prevStatus, message: `"${habitName}" paused` });
    } else if (action === 'restored') {
      triggerActionToast({ type: 'status', habitId, prevStatus, message: `"${habitName}" restored` });
    }
  }

  function handleDeleteConfirm() {
    if (habitToDelete) {
      const id = habitToDelete._id;
      const name = habitToDelete.name;
      // We don't remove immediately. We delay it to allow Undo.
      const timeoutId = setTimeout(() => {
        removeHabit(id);
      }, 5500);

      triggerActionToast({
        type: 'delete',
        habitId: id,
        message: `"${name}" deleted`,
        timeoutId
      });
    }
    setHabitToDelete(null);
  }

  function openSetGoal(habit: Habit, streak: number, completions: number) {
    setGoalHabit(habit);
    setGoalStreak(streak);
    setGoalCompletions(completions);
    setShowGoalForm(true);
  }

  const handleExportData = () => {
    // Clean up internal database fields and group by category
    const groupedHabits: Record<string, any[]> = {};

    habits.forEach(habit => {
      const { _id, userId, __v, createdAt, updatedAt, goalStartedAt, ...cleanData } = habit as any;
      const category = cleanData.category || 'Other';
      
      if (!groupedHabits[category]) {
        groupedHabits[category] = [];
      }
      groupedHabits[category].push(cleanData);
    });

    // Enforce display order
    const orderedGroupedHabits: Record<string, any[]> = {};
    CATEGORIES_ORDER.forEach(cat => {
      if (groupedHabits[cat] && groupedHabits[cat].length > 0) {
        orderedGroupedHabits[cat] = groupedHabits[cat];
      }
    });
    // Catch any unexpected categories not in CATEGORIES_ORDER
    Object.keys(groupedHabits).forEach(cat => {
      if (!orderedGroupedHabits[cat]) {
        orderedGroupedHabits[cat] = groupedHabits[cat];
      }
    });

    const dataStr = JSON.stringify(orderedGroupedHabits, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-habit-data.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <div className="page-container">

        {/* Page Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Manage Habits</h1>
            <p className="page-subtitle">
              Define your routines and track your long-term consistency.
              Each small step leads to significant change.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={handleExportData} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <DownloadIcon /> Export Habit Data
            </button>
            <button className="btn btn-primary" onClick={openCreate} id="add-new-habit-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <PlusIcon /> Add New Habit
            </button>
          </div>
        </div>

        {/* Error banner */}
        {error && <ErrorMessage message={error} onDismiss={clearError} />}

        {/* Summary stats cards */}
        {!loading && (
          <div className={styles.statsRow}>
            <div
              className={`${styles.statCard} ${filters.status === 'Active' ? styles.activeFilter : ''}`}
              onClick={() => setFilters({ status: filters.status === 'Active' ? 'All' : 'Active' })}
              title="Filter by Active habits"
            >
              <div className={`${styles.statIcon} ${styles.iconActive}`}>
                <CheckIcon style={{ width: 20, height: 20 }} />
              </div>
              <div className={styles.statDetails}>
                <span className={styles.statNumber}>{activeCount}</span>
                <span className={styles.statName}>Active</span>
              </div>
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
                      key={habit._id}
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <HabitCard
                        habit={habit}
                        onEdit={openEdit}
                        onArchiveRequest={requestArchive}
                        onDeleteRequest={setHabitToDelete}
                        onStatusChange={(name, action, prevStatus) => handleStatusChangeNotification(habit._id, name, action, prevStatus)}
                        onSetGoal={openSetGoal}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}



      </div>

      {/* Form Modal */}
      {showForm && (
        <HabitForm
          editingHabit={editingHabit}
          onClose={closeForm}
        />
      )}

      {/* Goal Form Modal */}
      {showGoalForm && (
        <GoalHabitForm
          editingHabit={goalHabit}
          onClose={() => {
            setShowGoalForm(false);
            setGoalHabit(null);
          }}
          currentStreak={goalStreak}
          totalCompletions={goalCompletions}
        />
      )}

      {/* Archive Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showArchiveDialog}
        title="Archive Habit"
        message={habitToArchive ? `Are you sure you want to archive "${habitToArchive.name}"? You can restore it later.` : ''}
        type="warning"
        confirmLabel="Archive"
        cancelLabel="Cancel"
        onConfirm={confirmArchive}
        onCancel={() => setShowArchiveDialog(false)}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!habitToDelete}
        title="Delete Habit"
        message={`Are you sure you want to delete "${habitToDelete?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        type="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setHabitToDelete(null)}
      />

      {/* Toast Notification */}
      {lastAction && (
        <Toast
          key={toastKey}
          message={lastAction.message}
          type="info"
          duration={5500}
          actionLabel="Undo"
          onAction={undoLast}
          onClose={() => setLastAction(null)}
        />
      )}
    </AppLayout>
  );
}
