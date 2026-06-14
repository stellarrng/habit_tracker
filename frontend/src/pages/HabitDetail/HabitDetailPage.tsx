import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { useHabitContext } from '../../context/HabitContext';
import { HabitStatus } from '../../types';
import AppLayout from '../../components/layout/AppLayout';
import HabitForm from '../../components/habits/HabitForm';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import {
  DropletIcon,
  BookIcon,
  BriefcaseIcon,
  LotusIcon,
  StarIcon,
  InfoIcon,
  TrophyIcon,
  CalendarIcon
} from '../../components/shared/Icons';
import styles from './HabitDetailPage.module.css';

// ─── Color maps ──────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  Health: '#D3F9D8', Study: '#F3D9FA', Work: '#D0EBFF', Mindfulness: '#FFD6E7', Other: '#E9FAC8',
};
const PRIORITY_COLORS: Record<string, { bg: string; color: string }> = {
  Low:    { bg: '#DBF4FF', color: '#1864AB' },
  Medium: { bg: '#FFF3BF', color: '#855C04' },
  High:   { bg: '#FFE3E3', color: '#C92A2A' },
};
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  Active:   { bg: '#D3F9D8', color: '#2F9E44' },
  Paused:   { bg: '#F1F3F5', color: '#868E96' },
  Archived: { bg: '#FFF3CD', color: '#E67700' },
};

function fakeStats(habit: { createdAt: string; _id: string }) {
  const ageDays = Math.floor((Date.now() - new Date(habit.createdAt).getTime()) / 86_400_000);
  const streak  = Math.max(0, Math.min(Math.floor(ageDays * 0.75), 60));
  const total   = Math.floor(ageDays * 0.9);
  return { streak, total };
}

// ─── Page ─────────────────────────────────────────────────────────────────
export default function HabitDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { habits, changeStatus, removeHabit } = useHabitContext();
  const [showEdit, setShowEdit] = useState(false);
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
    onConfirm: () => {},
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

  // 1. Stable mock calendar days and completion calculations
  const last7Days = useMemo(() => {
    if (!habit) return [];
    const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const ageDays = Math.floor((Date.now() - new Date(habit.createdAt).getTime()) / 86_400_000);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dayLabel = labels[d.getDay()][0]; // Single character S, M, T, W...
      
      const dayDiff = 6 - i;
      const isBeforeCreation = dayDiff > ageDays;
      
      let completed = false;
      if (!isBeforeCreation) {
        // Stable pseudo-random completion based on habit ID and date
        const hash = (habit._id.charCodeAt(0) + d.getDate() * 7 + d.getMonth() * 31) % 10;
        completed = hash > 2; // ~70% completion rate
      }
      return { label: dayLabel, completed };
    });
  }, [habit]);

  const completionRate = useMemo(() => {
    if (!last7Days.length) return 0;
    const completed = last7Days.filter(d => d.completed).length;
    return Math.round((completed / 7) * 100);
  }, [last7Days]);

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

  const { streak: baseStreak, total: baseTotal } = fakeStats(habit);
  const longestStreak = baseStreak > 0 ? Math.round(baseStreak * 1.5) : 0;

  // Goal details
  const hasGoal  = !!habit.goalTargetType && !!habit.goalTargetValue;
  const goalType = habit.goalTargetType || 'Streak';
  const target   = habit.goalTargetValue || 30;
  const currentValue = goalType === 'Streak' ? baseStreak : baseTotal;
  const pct        = Math.min(Math.round((currentValue / target) * 100), 100);
  const isComplete = pct >= 100;

  const isActive      = habit.status === 'Active';
  const iconBg        = CATEGORY_COLORS[habit.category] ?? '#EEF0F7';
  const statusStyle   = STATUS_COLORS[habit.status]   ?? STATUS_COLORS.Active;
  const priorityStyle = PRIORITY_COLORS[habit.priority] ?? PRIORITY_COLORS.Medium;

  const goalMsg = hasGoal
    ? isComplete
      ? '🎉 Goal achieved — amazing work!'
      : pct >= 80
      ? 'Almost there! Keep going!'
      : `Keep going! ${target - currentValue} more to reach your goal.`
    : null;

  function renderCategoryIcon() {
    const props = { style: { color: 'rgba(0,0,0,0.6)', width: 24, height: 24 } };
    switch (habit!.category) {
      case 'Health':      return <DropletIcon {...props} />;
      case 'Study':       return <BookIcon {...props} />;
      case 'Work':        return <BriefcaseIcon {...props} />;
      case 'Mindfulness': return <LotusIcon {...props} />;
      default:            return <StarIcon {...props} />;
    }
  }

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
      },
    });
  }

  function handleToggle() {
    const next: HabitStatus = isActive ? 'Paused' : 'Active';
    const actionText = isActive ? 'pause' : 'resume';
    triggerConfirm({
      title: `${isActive ? 'Pause' : 'Resume'} Habit`,
      message: `Are you sure you want to ${actionText} "${habit!.name}"?`,
      confirmLabel: isActive ? 'Pause' : 'Resume',
      type: 'warning',
      onConfirm: () => {
        changeStatus(habit!._id, next);
        closeConfirm();
      },
    });
  }

  function handleOpenEdit() {
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
        closeConfirm();
      },
    });
  }

  function handleUnarchive() {
    triggerConfirm({
      title: 'Unarchive Habit',
      message: `Are you sure you want to unarchive "${habit!.name}"?`,
      confirmLabel: 'Unarchive',
      type: 'info',
      onConfirm: () => {
        changeStatus(habit!._id, 'Active');
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
          <div className={styles.iconWrapper} style={{ background: iconBg }}>
            {renderCategoryIcon()}
          </div>
          <div className={styles.titleArea}>
            <h1 className={styles.titleText}>{habit.name}</h1>
            <span className={styles.statusIndicator} style={{ color: statusStyle.color, background: statusStyle.bg }}>
              ● {habit.status}
            </span>
          </div>
          {habit.status !== 'Archived' && (
            <label className="toggle" style={{ transform: 'scale(1.1)' }} title={isActive ? 'Pause habit' : 'Resume habit'}>
              <input type="checkbox" checked={isActive} onChange={handleToggle} id={`detail-toggle-${habit._id}`} />
              <span className="toggle-track" />
              <span className="toggle-thumb" />
            </label>
          )}
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
            <span className={styles.aboutTitle}>About</span>
            <button className={styles.editLink} onClick={handleOpenEdit}>
              Edit
            </button>
          </div>
          <p className={styles.aboutDesc}>
            {habit.description ||
              `Track your ${habit.name} habit consistently. Stay focused on your ${habit.category.toLowerCase()} goals and build a lasting routine. Every session counts toward your progress.`}
          </p>
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
                <button className={styles.editLink} onClick={handleOpenEdit}>
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
                onClick={handleOpenEdit}
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
              <span className={styles.statValue}>{baseStreak} days</span>
              <span className={styles.statLabel}>Current streak</span>
            </div>
            <div className={styles.statColDivider} />
            <div className={styles.statCol}>
              <span className={styles.statValue}>{longestStreak} days</span>
              <span className={styles.statLabel}>Longest streak</span>
            </div>
            <div className={styles.statColDivider} />
            <div className={styles.statCol}>
              <span className={styles.statValue}>{baseTotal}</span>
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

        {/* ── Actions Row ────────────────────────────────────────── */}
        <div className={styles.actionsRow}>
          <button className={`${styles.actionBtn} ${styles.editBtn}`} onClick={handleOpenEdit} id={`detail-edit-${habit._id}`}>
            Edit Habit
          </button>
          {habit.status !== 'Archived' ? (
            <button className={`${styles.actionBtn} ${styles.archiveBtn}`} onClick={handleArchive}>
              Archive Habit
            </button>
          ) : (
            <button className={`${styles.actionBtn} ${styles.archiveBtn}`} onClick={handleUnarchive}>
              Unarchive Habit
            </button>
          )}
          <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={handleDelete}>
            Delete Habit
          </button>
        </div>
      </div>

      {showEdit && <HabitForm editingHabit={habit} onClose={() => setShowEdit(false)} />}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        type={confirmState.type}
        onConfirm={confirmState.onConfirm}
        onCancel={closeConfirm}
      />
    </AppLayout>
  );
}

