import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useHabitContext } from '../../context/HabitContext';
import { HabitStatus } from '../../types';
import AppLayout from '../../components/layout/AppLayout';
import HabitForm from '../../components/habits/HabitForm';
import {
  DropletIcon,
  BookIcon,
  BriefcaseIcon,
  LotusIcon,
  StarIcon,
  FlameIcon,
  TrophyIcon,
  InfoIcon,
  EditIcon,
  PauseIcon,
  PlayIcon,
  TrashIcon,
  CalendarIcon
} from '../../components/shared/Icons';
import styles from './HabitDetailPage.module.css';

// ─── Colour maps ──────────────────────────────────────────────────────────
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

function fakeStats(habit: { createdAt: string; targetPerDay: number }) {
  const ageDays = Math.floor((Date.now() - new Date(habit.createdAt).getTime()) / 86_400_000);
  const streak  = Math.max(0, Math.min(Math.floor(ageDays * 0.75), 60));
  const total   = Math.floor(ageDays * 0.9);
  return { streak, total };
}

/** Circular SVG ring — radius 36, circ ≈ 226 */
function GoalRing({ pct, complete }: { pct: number; complete: boolean }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = ((pct / 100) * circ).toFixed(2);
  const color = complete ? 'var(--color-success)' : 'var(--color-primary)';
  return (
    <svg width="88" height="88" viewBox="0 0 88 88">
      <circle cx="44" cy="44" r={r} fill="none" stroke="#EEF0F7" strokeWidth="7" />
      <circle
        cx="44" cy="44" r={r}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        strokeDashoffset="0"
        transform="rotate(-90 44 44)"
        style={{ transition: 'stroke-dasharray 0.5s ease' }}
      />
    </svg>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────
export default function HabitDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { habits, changeStatus, removeHabit } = useHabitContext();
  const [showEdit, setShowEdit] = useState(false);

  const habit = habits.find(h => h._id === id);

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

  // Goal
  const hasGoal  = !!habit.goalTargetType && !!habit.goalTargetValue;
  const goalType = habit.goalTargetType || 'Streak';
  const target   = habit.goalTargetValue || 30;
  const currentValue = goalType === 'Streak'
    ? Math.min(baseStreak, target)
    : Math.min(baseTotal, target);
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
      ? `Almost there! Just ${target - currentValue} more ${goalType === 'Streak' ? 'days' : 'sessions'} to go.`
      : null
    : null;

  function renderCategoryIcon() {
    const props = { style: { color: 'rgba(0,0,0,0.6)', width: 28, height: 28 } };
    switch (habit!.category) {
      case 'Health':      return <DropletIcon {...props} />;
      case 'Study':       return <BookIcon {...props} />;
      case 'Work':        return <BriefcaseIcon {...props} />;
      case 'Mindfulness': return <LotusIcon {...props} />;
      default:            return <StarIcon {...props} />;
    }
  }

  function handleDelete() {
    if (window.confirm(`Delete "${habit!.name}"? This cannot be undone.`)) {
      removeHabit(habit!._id);
      navigate('/habits');
    }
  }

  function handleToggle() {
    const next: HabitStatus = isActive ? 'Paused' : 'Active';
    changeStatus(habit!._id, next);
  }

  return (
    <AppLayout onNewHabit={() => navigate('/habits')}>
      <div className="page-container">

        {/* Back */}
        <button onClick={() => navigate('/habits')} className={styles.backButton} id="back-to-habits">
          ← Back to Habits
        </button>

        {/* ── Header ──────────────────────────────────────────────── */}
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
            <label className="toggle" style={{ transform: 'scale(1.2)' }} title={isActive ? 'Pause habit' : 'Resume habit'}>
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

        {/* ── Goal card (full-width, above the 2-col grid) ─────────── */}
        <div className={styles.goalCard} style={{ marginBottom: 16 }}>
          <div className={styles.goalCardHeader}>
            <span className={styles.goalCardTitle}>Goal Progress</span>
            {hasGoal && (
              <span className={`${styles.goalTypeBadge} ${isComplete ? styles.goalTypeBadgeComplete : ''}`}>
                {goalType === 'Streak' ? 'Streak' : 'Completions'} target
              </span>
            )}
          </div>

          {hasGoal ? (
            <>
              <div className={styles.goalBody}>
                {/* Ring */}
                <div className={styles.goalRingWrap}>
                  <GoalRing pct={pct} complete={isComplete} />
                  <div className={styles.goalRingText}>
                    <span className={`${styles.goalRingPct} ${isComplete ? styles.goalRingPctComplete : ''}`}>
                      {pct}%
                    </span>
                    <span className={styles.goalRingLabel}>done</span>
                  </div>
                </div>

                {/* Numbers + bar */}
                <div className={styles.goalDetails}>
                  <div className={styles.goalValues}>
                    <span className={`${styles.goalCurrent} ${isComplete ? styles.goalCurrentComplete : ''}`}>
                      {currentValue}
                    </span>
                    <span className={styles.goalDenom}>
                      / {target} {goalType === 'Streak' ? 'days' : 'sessions'}
                    </span>
                  </div>

                  <div className={styles.goalBarTrack}>
                    <div
                      className={`${styles.goalBarFill} ${isComplete ? styles.goalBarFillComplete : ''}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className={styles.goalBarLabels}>
                    <span>0</span>
                    <span>{target}</span>
                  </div>
                </div>
              </div>

              {/* Status banner */}
              {goalMsg && (
                <div className={`${styles.goalMsg} ${isComplete ? styles.goalMsgAchieved : styles.goalMsgNear}`}>
                  {goalMsg}
                </div>
              )}
            </>
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
                onClick={() => setShowEdit(true)}
                id="set-goal-detail"
              >
                Set Goal
              </button>
            </div>
          )}
        </div>

        {/* ── 2-col secondary stats ───────────────────────────────── */}
        <div className={styles.statsGrid}>
          {/* Streak */}
          <div className={styles.card} style={{ position: 'relative', overflow: 'hidden' }}>
            <div className={styles.statLabel}>Current Streak</div>
            <div className={styles.streakValueRow}>
              <span className={styles.streakValText}>{baseStreak} days</span>
              <div className={styles.streakIconBox}>
                <FlameIcon style={{ width: 24, height: 24 }} />
              </div>
            </div>
            <div className={styles.dotContainer}>
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className={styles.dot}
                  style={{ background: i < Math.min(baseStreak, 7) ? 'var(--color-primary)' : '#EEF0F7' }}
                />
              ))}
            </div>
            <div className={styles.streakFooter}>
              {baseStreak >= 7 ? (
                <>
                  <TrophyIcon style={{ width: 14, height: 14, color: '#E67700' }} />
                  <span>You're on a fantastic streak!</span>
                </>
              ) : (
                <span>{7 - baseStreak} more day{7 - baseStreak !== 1 ? 's' : ''} for a 7-day streak</span>
              )}
            </div>
          </div>

          {/* Total */}
          <div className={styles.card}>
            <div className={styles.statLabel}>Total Completions</div>
            <div className={styles.totalValText}>{baseTotal}</div>
            <div className={styles.totalSub}>sessions recorded overall</div>
            <div className={styles.totalDaily}>
              Target per day: <strong>{habit.targetPerDay}×</strong>
            </div>
          </div>
        </div>

        {/* ── Description ─────────────────────────────────────────── */}
        <div className={styles.card} style={{ marginBottom: 20 }}>
          <div className={styles.descHeader}>
            <InfoIcon style={{ width: 18, height: 18, color: 'var(--text-secondary)' }} />
            <span className={styles.descTitle}>Description</span>
          </div>
          <p className={styles.descContent}>
            {(habit as any).description ||
              `Track your ${habit.name} habit consistently. Stay focused on your ${habit.category.toLowerCase()} goals and build a lasting routine. Every session counts toward your progress.`}
          </p>
        </div>

        {/* ── Motivation ──────────────────────────────────────────── */}
        <div className={styles.motivationCard}>
          <div>
            <div className={styles.motivationLabel}>Motivation</div>
            <div className={styles.motivationText}>
              {habit.category === 'Health'      && 'Your body is your most important asset.'}
              {habit.category === 'Study'       && 'Knowledge compounds — keep reading.'}
              {habit.category === 'Work'        && 'Discipline builds the life you want.'}
              {habit.category === 'Mindfulness' && 'A calm mind is a clear mind.'}
              {habit.category === 'Other'       && 'Small actions, big results over time.'}
            </div>
          </div>
        </div>

        {/* ── Actions ─────────────────────────────────────────────── */}
        <div className={styles.actionsArea}>
          <button className="btn btn-primary" onClick={() => setShowEdit(true)} id={`detail-edit-${habit._id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <EditIcon /> Edit Habit
          </button>
          {habit.status !== 'Archived' && (
            <button className="btn btn-secondary" onClick={handleToggle} id={`detail-pause-${habit._id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {isActive ? <PauseIcon /> : <PlayIcon />}
              {isActive ? 'Pause Habit' : 'Resume Habit'}
            </button>
          )}
          <button className="btn btn-danger" onClick={handleDelete} id={`detail-delete-${habit._id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <TrashIcon /> Delete Habit
          </button>
        </div>
      </div>

      {showEdit && <HabitForm editingHabit={habit} onClose={() => setShowEdit(false)} />}
    </AppLayout>
  );
}
