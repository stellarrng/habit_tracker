import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useHabitContext } from '../context/HabitContext';
import { HabitStatus } from '../types';
import AppLayout from '../components/layout/AppLayout';
import HabitForm from '../components/habits/HabitForm';
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
} from '../components/shared/Icons';

// ─── Helpers shared with HabitCard ────────────────────────────────────────
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

function fakeStats(habit: { createdAt: string; status: string; targetPerDay: number }) {
  const ageDays = Math.floor((Date.now() - new Date(habit.createdAt).getTime()) / 86_400_000);
  const streak  = habit.status === 'Paused' ? Math.floor(ageDays * 0.4) : Math.min(Math.floor(ageDays * 0.85), 60);
  const target  = habit.targetPerDay === 1 ? Math.max(30, streak + 10) : Math.max(habit.targetPerDay * 10, streak + 5);
  const total   = Math.floor(ageDays * 0.9);
  return { streak, target, total };
}

// ─── Component ────────────────────────────────────────────────────────────
export default function HabitDetailPage() {
  const { id }         = useParams<{ id: string }>();
  const navigate       = useNavigate();
  const { habits, changeStatus, removeHabit } = useHabitContext();

  const [showEdit, setShowEdit] = useState(false);

  const habit = habits.find(h => h._id === id);

  if (!habit) {
    return (
      <AppLayout onNewHabit={() => navigate('/habits')}>
        <div style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: 16 }}>
            <InfoIcon style={{ width: 48, height: 48, color: 'var(--text-muted)' }} />
          </div>
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

  // Determine if a goal is configured
  const hasGoal = !!habit.goalTargetType && !!habit.goalTargetValue;
  const goalType = habit.goalTargetType || 'Streak';
  const target = habit.goalTargetValue || 30;

  const currentValue = goalType === 'Streak'
    ? Math.min(baseStreak, target)
    : Math.min(baseTotal, target);

  const pct = Math.min(Math.round((currentValue / target) * 100), 100);
  const isComplete = pct >= 100;
  const isActive = habit.status === 'Active';
  const iconBg   = CATEGORY_COLORS[habit.category] ?? '#EEF0F7';
  const statusStyle   = STATUS_COLORS[habit.status]   ?? STATUS_COLORS.Active;
  const priorityStyle = PRIORITY_COLORS[habit.priority] ?? PRIORITY_COLORS.Medium;

  const goalMsg = hasGoal
    ? isComplete
      ? 'Goal Achieved! You hit your target — amazing work!'
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

        {/* Back link */}
        <button
          onClick={() => navigate('/habits')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24, padding: 0 }}
          id="back-to-habits"
        >
          ← Back to Habits
        </button>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ width: 60, height: 60, borderRadius: 16, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {renderCategoryIcon()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -.5, margin: 0 }}>{habit.name}</h1>
            <span style={{ fontSize: 13, fontWeight: 600, color: statusStyle.color, background: statusStyle.bg, borderRadius: 99, padding: '2px 10px', display: 'inline-block', marginTop: 4 }}>
              ● {habit.status}
            </span>
          </div>
          {/* Active toggle */}
          {habit.status !== 'Archived' && (
            <label className="toggle" style={{ transform: 'scale(1.2)' }} title={isActive ? 'Pause habit' : 'Resume habit'}>
              <input type="checkbox" checked={isActive} onChange={handleToggle} id={`detail-toggle-${habit._id}`} />
              <span className="toggle-track" />
              <span className="toggle-thumb" />
            </label>
          )}
        </div>

        {/* ── Chips row ──────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28, alignItems: 'center' }}>
          <span className={`chip chip-category-${habit.category.toLowerCase()}`}>{habit.category}</span>
          <span className="chip chip-freq" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <CalendarIcon style={{ width: 13, height: 13 }} />
            {habit.frequency === 'Daily'
              ? 'Daily'
              : habit.specificDays.join(', ')}
          </span>
          <span style={{ ...priorityStyle, borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <InfoIcon style={{ width: 12, height: 12 }} />
            {habit.priority} Priority
          </span>
        </div>

        {/* ── Stats row ──────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginBottom: 20 }}>

          {/* Current Progress */}
          <div style={cardStyle}>
            <div style={statLabelStyle}>GOAL PROGRESS</div>
            {hasGoal ? (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '8px 0 14px' }}>
                  <span style={{ fontSize: 48, fontWeight: 800, color: 'var(--color-primary)', letterSpacing: -2 }}>{currentValue}</span>
                  <span style={{ fontSize: 18, color: 'var(--text-secondary)', fontWeight: 500 }}>/ {target} {goalType === 'Streak' ? 'days' : 'sessions'}</span>
                </div>
                <div style={{ position: 'relative', height: 8, background: '#EEF0F7', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{ position: 'absolute', insetBlock: 0, left: 0, width: `${pct}%`, borderRadius: 99, background: pct >= 100 ? 'linear-gradient(90deg,#2F9E44,#69DB7C)' : 'linear-gradient(90deg,var(--color-primary),#6EB5FF)', transition: 'width .4s' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                  <span>0</span><span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{pct}% COMPLETE</span><span>{target}</span>
                </div>
                {goalMsg && (
                  <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: pct >= 100 ? 'var(--color-success)' : 'var(--color-primary)' }}>
                    {goalMsg}
                  </div>
                )}
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', minHeight: 96 }}>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 12px', lineHeight: '1.4' }}>
                  No goal milestone is configured for this habit.
                </p>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowEdit(true)}
                  style={{ alignSelf: 'flex-start', padding: '6px 12px', fontSize: 12 }}
                >
                  Set a Goal Target
                </button>
              </div>
            )}
          </div>

          {/* Current Streak */}
          <div style={{ ...cardStyle, position: 'relative', overflow: 'hidden' }}>
            <div style={statLabelStyle}>CURRENT STREAK</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '8px 0' }}>
              <span style={{ fontSize: 36, fontWeight: 800, color: 'var(--color-primary)', letterSpacing: -1 }}>
                {baseStreak} Days
              </span>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#FFF3BF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E67700' }}>
                <FlameIcon style={{ width: 24, height: 24 }} />
              </div>
            </div>
            {/* Mini bar of 7 dots */}
            <div style={{ display: 'flex', gap: 4, margin: '10px 0' }}>
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} style={{ flex: 1, height: 5, borderRadius: 99, background: i < Math.min(baseStreak, 7) ? 'var(--color-primary)' : '#EEF0F7' }} />
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
              {baseStreak >= 7 ? (
                <>
                  <TrophyIcon style={{ width: 14, height: 14, color: '#E67700' }} />
                  <span>You're on a fantastic streak!</span>
                </>
              ) : (
                <span>{7 - baseStreak} more days for a 7-day streak</span>
              )}
            </div>
          </div>

          {/* Total Completions */}
          <div style={cardStyle}>
            <div style={statLabelStyle}>TOTAL COMPLETIONS</div>
            <div style={{ fontSize: 48, fontWeight: 800, color: '#5C6370', letterSpacing: -2, margin: '8px 0' }}>{baseTotal}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>sessions recorded overall</div>
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
              Target per day: <strong>{habit.targetPerDay}×</strong>
            </div>
          </div>
        </div>

        {/* ── Description ────────────────────────────────────────────── */}
        <div style={{ ...cardStyle, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <InfoIcon style={{ width: 18, height: 18, color: 'var(--text-secondary)' }} />
            <span style={{ fontWeight: 700, fontSize: 17 }}>Description</span>
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
            {(habit as any).description ||
              `Track your ${habit.name} habit consistently. Stay focused on your ${habit.category.toLowerCase()} goals and build a lasting routine. Every session counts toward your progress.`}
          </p>
        </div>

        {/* ── Motivation banner ───────────────────────────────────────── */}
        <div style={{ borderRadius: 16, overflow: 'hidden', background: 'linear-gradient(135deg, #1A1D23 0%, #2C3E6B 100%)', padding: '28px 32px', marginBottom: 28, display: 'flex', alignItems: 'flex-end', minHeight: 120 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.5)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>Motivation</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>
              {habit.category === 'Health'      && 'Your body is your most important asset.'}
              {habit.category === 'Study'       && 'Knowledge compounds — keep reading.'}
              {habit.category === 'Work'        && 'Discipline builds the life you want.'}
              {habit.category === 'Mindfulness' && 'A calm mind is a clear mind.'}
              {habit.category === 'Other'       && 'Small actions, big results over time.'}
            </div>
          </div>
        </div>

        {/* ── Action buttons ──────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => setShowEdit(true)} id={`detail-edit-${habit._id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <EditIcon /> Edit Habit
          </button>
          {habit.status !== 'Archived' && (
            <button
              className="btn btn-secondary"
              onClick={handleToggle}
              id={`detail-pause-${habit._id}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              {isActive ? <PauseIcon /> : <PlayIcon />}
              {isActive ? 'Pause Habit' : 'Resume Habit'}
            </button>
          )}
          <button className="btn btn-danger" onClick={handleDelete} id={`detail-delete-${habit._id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <TrashIcon /> Delete Habit
          </button>
        </div>
      </div>

      {/* Edit modal */}
      {showEdit && (
        <HabitForm editingHabit={habit} onClose={() => setShowEdit(false)} />
      )}
    </AppLayout>
  );
}

// ─── Inline card style ─────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: '22px 24px',
  boxShadow: 'var(--shadow-sm)',
};
const statLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: .8,
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
};
