import { useState, useMemo } from 'react';
import { Habit } from '../../types';
import { useHabitContext } from '../../context/HabitContext';
import AppLayout from '../../components/layout/AppLayout';
import HabitFilters from '../../components/habits/HabitFilters';
import HabitCard from '../../components/habits/HabitCard';
import HabitForm from '../../components/habits/HabitForm';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import Toast from '../../components/shared/Toast';
import EmptyState from '../../components/shared/EmptyState';
import ErrorMessage from '../../components/shared/ErrorMessage';
import { TargetIcon, SearchIcon, SparklesIcon, PlusIcon } from '../../components/shared/Icons';
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
  const { filteredHabits, habits, loading, error, clearError, changeStatus } = useHabitContext();

  const [showForm, setShowForm]         = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [habitToArchive, setHabitToArchive] = useState<Habit | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
      setShowArchiveDialog(false);
      setHabitToArchive(null);
    }
  }
  
  function handlePauseNotification(habitName: string) {
    setToastMessage(`${habitName} paused successfully`);
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
                      <HabitCard habit={habit} onEdit={openEdit} onArchiveRequest={requestArchive} onPause={handlePauseNotification} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* "Build Your Routine" banner — shown when fewer than 3 habits */}
        {!loading && habits.length > 0 && habits.length < 3 && (
          <div className={styles.routineBanner}>
            <div className={styles.routineBannerIcon}>
              <SparklesIcon style={{ width: 24, height: 24, color: '#FFD700' }} />
            </div>
            <div>
              <h3>Build Your Routine</h3>
              <p>
                You have {habits.filter(h => h.status === 'Active').length} active habit
                {habits.filter(h => h.status === 'Active').length !== 1 ? 's' : ''}.
                Studies show that maintaining at least 3 habits simultaneously increases
                long-term adherence by 40%.
              </p>
              <button className="btn btn-primary btn-sm" onClick={openCreate} id="browse-suggestions-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <PlusIcon /> Add Another Habit
              </button>
            </div>
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
