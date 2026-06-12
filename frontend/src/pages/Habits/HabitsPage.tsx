import { useState } from 'react';
import { Habit } from '../types';
import { useHabitContext } from '../context/HabitContext';
import AppLayout from '../components/layout/AppLayout';
import HabitFilters from '../components/habits/HabitFilters';
import HabitCard from '../components/habits/HabitCard';
import HabitForm from '../components/habits/HabitForm';
import EmptyState from '../components/shared/EmptyState';
import ErrorMessage from '../components/shared/ErrorMessage';
import { TargetIcon, SearchIcon, SparklesIcon, PlusIcon } from '../components/shared/Icons';

export default function HabitsPage() {
  const { filteredHabits, habits, loading, error, clearError } = useHabitContext();

  const [showForm, setShowForm]         = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  function openCreate() { setEditingHabit(null); setShowForm(true); }
  function openEdit(habit: Habit) { setEditingHabit(habit); setShowForm(true); }
  function closeForm() { setShowForm(false); setEditingHabit(null); }

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

        {/* Habit Grid */}
        {!loading && filteredHabits.length > 0 && (
          <div className="habits-grid">
            {filteredHabits.map((habit, idx) => (
              <div
                key={habit._id}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <HabitCard habit={habit} onEdit={openEdit} />
              </div>
            ))}
          </div>
        )}

        {/* "Build Your Routine" banner — shown when fewer than 3 habits */}
        {!loading && habits.length > 0 && habits.length < 3 && (
          <div className="routine-banner" style={{ marginTop: 28 }}>
            <div className="routine-banner-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
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
    </AppLayout>
  );
}
