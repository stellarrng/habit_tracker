import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useHabitContext } from '../../context/HabitContext';
import { CheckIn } from '../../types';
import AppLayout from '../../components/layout/AppLayout';
import InforHabitForm from '../../components/habits/InforHabitForm';
import GoalHabitForm from '../../components/habits/GoalHabitForm';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import Toast from '../../components/shared/Toast';
import { useStreaks } from '../../hooks/useStreaks';
import { getCheckIns } from '../../api/checkins';
import {
  InfoIcon,
  TrophyIcon,
  CalendarIcon,
  MoreVerticalIcon
} from '../../components/shared/Icons';
import styles from './HabitDetailPage.module.css';
import HabitCategoryIcon from '@/components/shared/HabitCategoryIcon';

// ─── Color maps ──────────────────────────────────────────────────────────
const PRIORITY_COLORS: Record<string, { bg: string; color: string }> = {
  Low: { bg: '#DBF4FF', color: '#1864AB' },
  Medium: { bg: '#FFF3BF', color: '#855C04' },
  High: { bg: '#FFE3E3', color: '#C92A2A' },
};
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  Active: { bg: '#D3F9D8', color: '#2F9E44' },
  Paused: { bg: '#F1F3F5', color: '#868E96' },
  Archived: { bg: '#FFF3CD', color: '#E67700' },
};

// ─── Page ─────────────────────────────────────────────────────────────────
export default function HabitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { habits, changeStatus, removeHabit } = useHabitContext();
  const [showEdit, setShowEdit] = useState(false);
  const [editMode, setEditMode] = useState<'info' | 'goal'>('info');

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menuOpen]);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    type?: 'info' | 'warning' | 'danger';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });

  function triggerConfirm(params: {
    title: string;
    message: string;
    confirmLabel?: string;
    type?: 'info' | 'warning' | 'danger';
    onConfirm: () => void;
  }) {
    setConfirmState({
      isOpen: true,
      ...params,
    });
  }

  function closeConfirm() {
    setConfirmState(prev => ({ ...prev, isOpen: false }));
  }

  const habit = habits.find(h => h._id === id);

  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loadingCheckIns, setLoadingCheckIns] = useState(true);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setLoadingCheckIns(true);
    getCheckIns({ habitId: id })
      .then(data => {
        if (alive) setCheckIns(data);
      })
      .catch(err => {
        console.error('Failed to fetch check-ins for habit:', err);
      })
      .finally(() => {
        if (alive) setLoadingCheckIns(false);
      });
    return () => { alive = false; };
  }, [id]);

  const streaks = useStreaks(checkIns);

  // 1. Calendar days and completion calculations using real check-ins
  const last7Days = useMemo(() => {
    if (!habit) return [];
    const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Create a set of completed dates for quick lookup
    const completedDates = new Set(
      checkIns
        .filter(c => c.completedCount >= habit.targetPerDay)
        .map(c => c.date)
    );

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dayLabel = labels[d.getDay()][0]; // Single character S, M, T, W...
      const dateStr = d.toISOString().slice(0, 10);

      const completed = completedDates.has(dateStr);
      return { label: dayLabel, completed };
    });
  }, [habit, checkIns]);

  const completionRate = streaks.completionRate;

  if (!habit) {
    return (
      <AppLayout onNewHabit={() => navigate('/habits')}>
        <div style={{ padding: 48, textAlign: 'center' }}>
          <InfoIcon style={{ width: 48, height: 48, color: 'var(--text-muted)', marginBottom: 16 }} />
          <h2 style={{ marginBottom: 8 }}>Habit not found</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
            This habit may have been deleted or the link is invalid.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/habits')}>
            Back to Habits
          </button>
        </div>
      </AppLayout>
    );
  }

  if (loadingCheckIns) {
    return (
      <AppLayout onNewHabit={() => navigate('/habits')}>
        <div className="loading-center">
          <div className="spinner" />
        </div>
      </AppLayout>
    );
  }

  const currentStreak = streaks.current;
  const longestStreak = streaks.longest;
  const totalCompletions = streaks.totalSessions;

  // Goal details
  const hasGoal = !!habit.goalTargetType && !!habit.goalTargetValue;
  const goalType = habit.goalTargetType || 'Streak';
  const target = habit.goalTargetValue || 30;
  const currentValue = goalType === 'Streak' ? currentStreak : totalCompletions;
  const pct = Math.min(Math.round((currentValue / target) * 100), 100);
  const isComplete = pct >= 100;

  const isActive = habit.status === 'Active';
  const statusStyle = STATUS_COLORS[habit.status] ?? STATUS_COLORS.Active;
  const priorityStyle = PRIORITY_COLORS[habit.priority] ?? PRIORITY_COLORS.Medium;

  const goalMsg = hasGoal
    ? isComplete
      ? '🎉 Goal achieved — amazing work!'
      : pct >= 80
        ? 'Almost there! Keep going!'
        : `Keep going! ${target - currentValue} more to reach your goal.`
    : null;

  function handleDelete() {
    triggerConfirm({
      title: 'Delete Habit',
      message: `Are you sure you want to delete "${habit!.name}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      type: 'danger',
      onConfirm: () => {
        removeHabit(habit!._id);
        navigate('/habits');
        closeConfirm();
        setMenuOpen(false);
      },
    });
  }

  function handlePause() {
    if (habit) {
      changeStatus(habit._id, 'Paused');
      setToastMessage(`"${habit.name}" paused successfully`);
      setMenuOpen(false);
    }
  }

  function handleResume() {
    if (habit) {
      changeStatus(habit._id, 'Active');
      setToastMessage(`"${habit.name}" resumed successfully`);
      setMenuOpen(false);
    }
  }

  function handleOpenEdit() {
    setEditMode('info');
    setShowEdit(true);
  }

  function handleOpenGoalEdit() {
    setEditMode('goal');
    setShowEdit(true);
  }

  function handleArchive() {
    triggerConfirm({
      title: 'Archive Habit',
      message: `Are you sure you want to archive "${habit!.name}"?`,
      confirmLabel: 'Archive',
      type: 'warning',
      onConfirm: () => {
        changeStatus(habit!._id, 'Archived');
        setToastMessage(`"${habit!.name}" archived successfully`);
        closeConfirm();
      },
    });
    setMenuOpen(false);
  }

  function handleRestore() {
    triggerConfirm({
      title: 'Restore Habit',
      message: `Are you sure you want to Restore "${habit!.name}"?`,
      confirmLabel: 'Restore',
      type: 'info',
      onConfirm: () => {
        changeStatus(habit!._id, 'Active');
        setToastMessage(`"${habit!.name}" Restored successfully`);
        closeConfirm();
      },
    });
  }

  return (
    <AppLayout onNewHabit={() => navigate('/habits')}>
      <div className={styles.detailPageContainer}>

        {/* Back */}
        <button onClick={() => navigate('/habits')} className={styles.backButton} id="back-to-habits">
          ← Back to Habits
        </button>

        {/* ── Header Row ────────────────────────────────────────── */}
        <div className={styles.headerRow}>
          {/* <div className={styles.iconWrapper} style={{ background: iconBg }}>
            {renderCategoryIcon()}
          </div> */}
          {/* Component for Category Icon */}
          <HabitCategoryIcon
            category={habit.category}
            size={55}
          />
          <div className={styles.titleArea}>
            <h1 className={styles.titleText}>{habit.name}</h1>
            <span className={styles.statusIndicator} style={{ color: statusStyle.color, background: statusStyle.bg }}>
              ● {habit.status}
            </span>
          </div>
          {/* 3-dot menu */}
          <div className={styles.menuContainer} ref={menuRef}>
            <button
              className={styles.menuButton}
              onClick={() => setMenuOpen(!menuOpen)}
              title="More options"
            >
              <MoreVerticalIcon style={{ width: 20, height: 20 }} />
            </button>
            {menuOpen && (
              <div className={styles.menu}>
                <button className={styles.menuItem} onClick={handleDelete}>
                  Delete
                </button>
                {habit.status === 'Archived' ? (
                  <button className={styles.menuItem} onClick={handleRestore}>
                    Restore
                  </button>
                ) : (
                  <>
                    <button className={styles.menuItem} onClick={handlePause}>
                      {isActive ? 'Pause' : 'Resume'}
                    </button>
                    <button className={styles.menuItem} onClick={handleArchive}>
                      Archive
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          
        </div>

        {/* ── Chips ───────────────────────────────────────────────── */}
        <div className={styles.chipsRow}>
          <span className={`chip chip-category-${habit.category.toLowerCase()}`}>{habit.category}</span>
          <span className="chip chip-freq" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <CalendarIcon style={{ width: 13, height: 13 }} />
            {habit.frequency === 'Daily' ? 'Daily' : habit.specificDays.join(', ')}
          </span>
          <span className={styles.priorityChip} style={{ color: priorityStyle.color, background: priorityStyle.bg }}>
            <InfoIcon style={{ width: 12, height: 12 }} />
            {habit.priority} Priority
          </span>
        </div>

        {/* ── About Card ─────────────────────────────────────────── */}
        <div className={styles.aboutCard}>
          <div className={styles.aboutHeader}>
            <span className={styles.aboutTitle}>Information</span>
            <button className={styles.editLink} onClick={handleOpenEdit}>
              Edit
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Category</p>
              <p style={{ fontSize: '14px', fontWeight: '500' }}>{habit.category}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Priority</p>
              <p style={{ fontSize: '14px', fontWeight: '500' }}>{habit.priority}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Frequency</p>
              <p style={{ fontSize: '14px', fontWeight: '500' }}>
                {habit.frequency === 'Daily' ? 'Daily' : habit.specificDays.join(', ')}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Target</p>
              <p style={{ fontSize: '14px', fontWeight: '500' }}>{habit.targetPerDay} per day</p>
            </div>
          </div>
        </div>

        {/* ── Goal progress card ──────────────────────────────────── */}
        <div className={styles.goalCard}>
          <div className={styles.goalCardHeader}>
            <div className={styles.goalCardTitleArea}>
              <span className={styles.goalCardTitle}>Goal Progress</span>
              {hasGoal && (
                <span className={styles.goalCardSubtitle}>
                  {goalType === 'Streak' ? 'Streak target' : 'Total completions target'}
                </span>
              )}
            </div>
            {hasGoal && (
              <div className={styles.goalHeaderRight}>
                <span className={styles.goalCardValues}>
                  {currentValue} / {target} {goalType === 'Streak' ? 'days' : 'sessions'}
                </span>
                <button className={styles.editLink} onClick={handleOpenGoalEdit}>
                  Edit
                </button>
              </div>
            )}
          </div>

          {hasGoal ? (
            <div className={styles.goalCardBody}>
              <div className={styles.goalBarTrack}>
                <div
                  className={`${styles.goalBarFill} ${isComplete ? styles.goalBarFillComplete : ''}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className={styles.goalBarFooter}>
                <span className={styles.goalBarPct}>{pct}%</span>
                {goalMsg && <span className={styles.goalBarMsg}>{goalMsg}</span>}
              </div>
            </div>
          ) : (
            /* No-goal empty state */
            <div className={styles.emptyGoalCard}>
              <div className={styles.emptyGoalIcon}>
                <TrophyIcon style={{ width: 22, height: 22, color: 'var(--text-muted)' }} />
              </div>
              <div className={styles.emptyGoalContent}>
                <div className={styles.emptyGoalTitle}>No goal target configured</div>
                <div className={styles.emptyGoalSub}>Add a streak or completion target to track your progress.</div>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleOpenGoalEdit}
                id="set-goal-detail"
              >
                Set Goal
              </button>
            </div>
          )}
        </div>

        {/* ── Statistics card ─────────────────────────────────────── */}
        <div className={styles.statsCard}>
          <div className={styles.statsCardTitle}>Statistics</div>

          <div className={styles.statsRow}>
            <div className={styles.statCol}>
              <span className={styles.statValue}>{currentStreak} days</span>
              <span className={styles.statLabel}>Current streak</span>
            </div>
            <div className={styles.statColDivider} />
            <div className={styles.statCol}>
              <span className={styles.statValue}>{longestStreak} days</span>
              <span className={styles.statLabel}>Longest streak</span>
            </div>
            <div className={styles.statColDivider} />
            <div className={styles.statCol}>
              <span className={styles.statValue}>{totalCompletions}</span>
              <span className={styles.statLabel}>Total completions</span>
            </div>
          </div>

          <div className={styles.statsDivider} />

          <div className={styles.weeklySection}>
            <div className={styles.weeklyHeader}>
              <span className={styles.weeklyValue}>{completionRate}%</span>
              <span className={styles.weeklyLabel}>Completion rate (last 7 days)</span>
            </div>

            <div className={styles.dotTrack}>
              {last7Days.map((day, idx) => (
                <div key={idx} className={styles.dotItem}>
                  <div className={`${styles.dot} ${day.completed ? styles.dotCompleted : ''}`} />
                  <span className={styles.dotDayLabel}>{day.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showEdit && editMode === 'info' && (
        <InforHabitForm editingHabit={habit} onClose={() => setShowEdit(false)} />
      )}
      {showEdit && editMode === 'goal' && (
        <GoalHabitForm
          editingHabit={habit}
          onClose={() => setShowEdit(false)}
          currentStreak={currentStreak}
          totalCompletions={totalCompletions}
        />
      )}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        type={confirmState.type}
        onConfirm={confirmState.onConfirm}
        onCancel={closeConfirm}
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

