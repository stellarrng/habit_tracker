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
import Footer from "../../components/layout/Footer";
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
  Low: { bg: 'var(--color-priority-low-bg)', color: 'var(--color-priority-low-text)' },
  Medium: { bg: 'var(--color-priority-medium-bg)', color: 'var(--color-priority-medium-text)' },
  High: { bg: 'var(--color-priority-high-bg)', color: 'var(--color-priority-high-text)' },
};
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  Active: { bg: 'var(--color-status-active-bg)', color: 'var(--color-status-active-text)' },
  Paused: { bg: 'var(--color-status-paused-bg)', color: 'var(--color-status-paused-text)' },
  Archived: { bg: 'var(--color-status-archived-bg)', color: 'var(--color-status-archived-text)' },
};

// ─── Page ─────────────────────────────────────────────────────────────────
export default function HabitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { habits, changeStatus, removeHabit } = useHabitContext();
  const [showEdit, setShowEdit] = useState(false);
  const [editMode, setEditMode] = useState<'info' | 'goal'>('info');

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
      // Allow it to timeout independently
    }
    setLastAction(action);
    setToastKey(k => k + 1);
  }
  const [showCongrats, setShowCongrats] = useState(false);
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

  const currentStreak = streaks.current;
  const longestStreak = streaks.longest;
  const totalCompletions = streaks.totalSessions;

  // Calculate goal-specific check-ins since current goal started
  const goalCheckIns = useMemo(() => {
    if (!habit) return [];
    const startStr = habit.goalStartedAt || habit.createdAt;
    const startDate = new Date(startStr);
    startDate.setHours(0, 0, 0, 0);

    return checkIns.filter(c => {
      const checkInDate = new Date(c.date);
      checkInDate.setHours(0, 0, 0, 0);
      return checkInDate >= startDate;
    });
  }, [habit, checkIns]);

  const goalStreaks = useStreaks(goalCheckIns);

  const nextGoalStartDate = useMemo(() => {
    if (!habit || checkIns.length === 0) return new Date().toISOString();
    const completedCheckIns = checkIns.filter(c => c.completedCount >= habit.targetPerDay);
    if (completedCheckIns.length === 0) return new Date().toISOString();
    const sorted = [...completedCheckIns].sort((a, b) => b.date.localeCompare(a.date));
    const latestDateStr = sorted[0].date;
    const parts = latestDateStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    d.setDate(d.getDate() + 1);
    return d.toISOString();
  }, [habit, checkIns]);

  // Goal details
  const hasGoal = habit ? (!!habit.goalTargetType && !!habit.goalTargetValue) : false;
  const goalType = habit?.goalTargetType || 'Streak';
  const target = habit?.goalTargetValue || 30;
  const currentValue = goalType === 'Streak' ? goalStreaks.current : goalStreaks.totalSessions;
  const pct = Math.min(Math.round((currentValue / target) * 100), 100);
  const isComplete = pct >= 100;

  // Trigger congrats popup if goal completed (100%) and not yet shown for this goal config
  useEffect(() => {
    if (loadingCheckIns || !habit || !hasGoal || pct < 100) return;

    const storageKey = `congrats_shown_${habit._id}_${goalType}_${target}`;
    const isShown = localStorage.getItem(storageKey);

    if (!isShown) {
      setShowCongrats(true);
    }
  }, [loadingCheckIns, habit, hasGoal, pct, goalType, target]);

  if (!habit) {
    return (
      <AppLayout>
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
      <AppLayout>
        <div className="loading-center">
          <div className="spinner" />
        </div>
      </AppLayout>
    );
  }

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
        const id = habit!._id;
        const name = habit!.name;
        // Delay deletion by 5.5s to allow undo
        const timeoutId = setTimeout(() => {
          removeHabit(id);
          navigate('/habits');
        }, 5500);
        
        triggerActionToast({
          type: 'delete',
          habitId: id,
          message: `"${name}" deleted`,
          timeoutId
        });
        
        closeConfirm();
        setMenuOpen(false);
      },
    });
  }

  function handlePause() {
    if (habit) {
      const prevStatus = habit.status;
      changeStatus(habit._id, 'Paused');
      triggerActionToast({ type: 'status', habitId: habit._id, prevStatus, message: `"${habit.name}" paused` });
      setMenuOpen(false);
    }
  }

  function handleResume() {
    if (habit) {
      const prevStatus = habit.status;
      changeStatus(habit._id, 'Active');
      triggerActionToast({ type: 'status', habitId: habit._id, prevStatus, message: `"${habit.name}" resumed` });
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
        const prevStatus = habit!.status;
        changeStatus(habit!._id, 'Archived');
        triggerActionToast({ type: 'status', habitId: habit!._id, prevStatus, message: `"${habit!.name}" archived` });
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
        const prevStatus = habit!.status;
        changeStatus(habit!._id, 'Active');
        triggerActionToast({ type: 'status', habitId: habit!._id, prevStatus, message: `"${habit!.name}" restored` });
        closeConfirm();
      },
    });
  }

  function handleCloseCongrats() {
    if (habit) {
      const storageKey = `congrats_shown_${habit._id}_${goalType}_${target}`;
      localStorage.setItem(storageKey, 'true');
    }
    setShowCongrats(false);
  }

  function handleSetNewGoalFromCongrats() {
    if (habit) {
      const storageKey = `congrats_shown_${habit._id}_${goalType}_${target}`;
      localStorage.setItem(storageKey, 'true');
    }
    setShowCongrats(false);
    handleOpenGoalEdit();
  }

  return (
    <AppLayout>
      <div className={styles.detailPageContainer}>

        {/* Back */}
        <button onClick={() => navigate('/habits')} className={styles.backButton} id="back-to-habits">
          ← Back to Habits
        </button>

        <div className={styles.bannerCard}>
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
                    <button className={styles.menuItem} onClick={isActive ? handlePause : handleResume}>
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

        </div>

        <div className={styles.mainGrid}>
          <div className={styles.mainColumn}>
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
              {isComplete && (
                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-primary btn-sm" onClick={handleOpenGoalEdit} id="set-new-goal-completed">
                    Set New Goal
                  </button>
                </div>
              )}
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
          <div className={styles.sideColumn}>
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
          currentStreak={goalStreaks.current}
          totalCompletions={goalStreaks.totalSessions}
          nextGoalStartDate={nextGoalStartDate}
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

      {showCongrats && (
        <div className={styles.confirmBackdrop} onClick={e => { if (e.target === e.currentTarget) handleCloseCongrats(); }}>
          <div className={styles.confirmDialog} role="dialog" aria-modal="true" aria-labelledby="congrats-title">
            <div className={styles.confirmBody}>
              <div className={`${styles.confirmIconWrapper} ${styles.confirmIcon_success}`}>
                <TrophyIcon style={{ width: 22, height: 22 }} />
              </div>
              <div className={styles.confirmContent}>
                <h3 className={styles.confirmTitle} id="congrats-title">Goal Reached!</h3>
                <p className={styles.confirmMessage}>
                  Incredible job! You've successfully completed 100% of your goal target for <strong>{habit.name}</strong> ({target} {goalType === 'Streak' ? 'days streak' : 'sessions total'}).
                  <br /><br />
                  Would you like to keep the momentum going and set a new goal target now?
                </p>
              </div>
            </div>
            <div className={styles.confirmFooter}>
              <button type="button" className="btn btn-secondary" onClick={handleCloseCongrats}>
                Maybe Later
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSetNewGoalFromCongrats}>
                Set New Goal
              </button>
            </div>
          </div>
        </div>
      )}

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
      <Footer/>
    </AppLayout>
  );
}

