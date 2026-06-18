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
import { TargetIcon, SearchIcon, PlusIcon, CheckIcon, PauseIcon, ArchiveIcon } from '../../components/shared/Icons';
import styles from './HabitsPage.module.css';

const CATEGORIES_ORDER = ['Health', 'Study', 'Work', 'Mindfulness', 'Other'] as const;

const CATEGORY_DOT_COLORS: Record<string, string> = {
  Health: 'var(--color-health)',
  Study: 'var(--color-study)',
  Work: 'var(--color-work)',
  Mindfulness: 'var(--color-mindful)',
  Other: 'var(--color-other)',
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
      setToastMessage(`"${habitToArchive.name}" archived successfully`);
      setShowArchiveDialog(false);
      setHabitToArchive(null);
    }
  }
  
  function handleStatusChangeNotification(habitName: string, action: 'paused' | 'resumed' | 'restored') {
    if (action === 'resumed') {
      setToastMessage(`"${habitName}" resumed successfully`);
    } else if (action === 'paused') {
      setToastMessage(`"${habitName}" paused successfully`);
    } else if (action === 'restored') {
      setToastMessage(`"${habitName}" restored successfully`);
    }
  }

  function openSetGoal(habit: Habit, streak: number, completions: number) {
    setGoalHabit(habit);
    setGoalStreak(streak);
    setGoalCompletions(completions);
    setShowGoalForm(true);
  }

  return (
    <AppLayout onNewHabit={openCreate}>
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
          <button className="btn btn-primary" onClick={openCreate} id="add-new-habit-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <PlusIcon /> Add New Habit
          </button>
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
                    style={{ backgroundColor: CATEGORY_DOT_COLORS[category] || '#ccc' }}
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
                        onStatusChange={handleStatusChangeNotification}
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
