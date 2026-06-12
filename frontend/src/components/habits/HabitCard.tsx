import { useNavigate } from 'react-router-dom';
import { Habit, HabitStatus } from '../../types';
import { useHabitContext } from '../../context/HabitContext';
import {
  DropletIcon,
  BookIcon,
  BriefcaseIcon,
  LotusIcon,
  StarIcon,
  TrashIcon
} from '../shared/Icons';

// ─── Helpers ──────────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  Health: '#D3F9D8', Study: '#F3D9FA', Work: '#D0EBFF', Mindfulness: '#FFD6E7', Other: '#E9FAC8',
};

function categoryClass(cat: string) {
  return `chip chip-category-${cat.toLowerCase().replace(/\s+/g, '')}`;
}
function priorityClass(p: string) {
  return `chip chip-${p.toLowerCase()}`;
}
function statusClass(s: string) {
  return `chip chip-${s.toLowerCase()}`;
}



// ─── Component ────────────────────────────────────────────────────────────
interface HabitCardProps {
  habit:    Habit;
  onEdit:   (habit: Habit) => void;
}

export default function HabitCard({ habit }: HabitCardProps) {
  const { changeStatus, removeHabit } = useHabitContext();
  const navigate = useNavigate();
  const isActive = habit.status === 'Active';

  // Determine if a goal is configured
  const hasGoal = !!habit.goalTargetType && !!habit.goalTargetValue;
  const goalType = habit.goalTargetType || 'Streak';
  const target = habit.goalTargetValue || 30;

  // Mock current progress values based on habit age/status
  const age = Math.floor((Date.now() - new Date(habit.createdAt).getTime()) / 86_400_000);
  const baseProgress = habit.status === 'Paused' ? Math.floor(age * 0.4) : Math.min(Math.floor(age * 0.85), 60);

  const currentValue = goalType === 'Streak'
    ? Math.min(baseProgress, target)
    : Math.min(Math.floor(baseProgress * 1.5), target);

  const pct = Math.min(Math.round((currentValue / target) * 100), 100);
  const isComplete = pct >= 100;

  const goalMsg = hasGoal
    ? isComplete
      ? 'Goal Achieved! You hit your target!'
      : pct >= 80
      ? "Almost there! Keep pushing."
      : null
    : null;

  const iconBg = CATEGORY_COLORS[habit.category] ?? '#EEF0F7';

  function renderCategoryIcon() {
    const props = { style: { color: 'rgba(0,0,0,0.6)' } };
    switch (habit.category) {
      case 'Health':      return <DropletIcon {...props} />;
      case 'Study':       return <BookIcon {...props} />;
      case 'Work':        return <BriefcaseIcon {...props} />;
      case 'Mindfulness': return <LotusIcon {...props} />;
      default:            return <StarIcon {...props} />;
    }
  }

  function toggleStatus() {
    const next: HabitStatus = isActive ? 'Paused' : 'Active';
    changeStatus(habit._id, next);
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (window.confirm(`Delete "${habit.name}"? This cannot be undone.`)) {
      removeHabit(habit._id);
    }
  }

  const metricLabel = hasGoal
    ? goalType === 'Streak' ? 'Current Streak' : 'Total Completions'
    : 'Streak (No goal set)';

  return (
    <div className={`habit-card ${habit.status.toLowerCase()}`} id={`habit-card-${habit._id}`}>

      {/* Header */}
      <div className="habit-card-header">
        <div className="habit-icon" style={{ background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {renderCategoryIcon()}
        </div>
        <div
          className="habit-card-title-group"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate(`/habits/${habit._id}`)}
          title="View details"
        >
          <div className="habit-card-name" title={habit.name}>{habit.name}</div>
          <div className="habit-card-status-row">
            <span className={statusClass(habit.status)}>{habit.status}</span>
          </div>
        </div>
        {/* Active/Pause toggle */}
        {habit.status !== 'Archived' && (
          <label className="toggle" title={isActive ? 'Pause habit' : 'Resume habit'}>
            <input
              type="checkbox"
              checked={isActive}
              onChange={toggleStatus}
              id={`toggle-${habit._id}`}
            />
            <span className="toggle-track" />
            <span className="toggle-thumb" />
          </label>
        )}
      </div>

      {/* Meta chips */}
      <div className="habit-meta">
        <span className={categoryClass(habit.category)}>{habit.category}</span>
        <span className="chip chip-freq">
          {habit.frequency === 'Daily'
            ? 'Daily'
            : habit.specificDays.join(', ') || 'Specific days'}
        </span>
        <span className={priorityClass(habit.priority)}>{habit.priority}</span>
      </div>

      {/* Progress */}
      <div>
        <div className="habit-progress-label">{metricLabel}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '4px 0 10px' }}>
          <span className="habit-progress-value">{currentValue}</span>
          <span className="habit-progress-suffix">/ {target} {goalType === 'Streak' ? 'days' : 'sessions'}</span>
        </div>

        <div className="habit-progress-bar-wrap">
          <div
            className={`habit-progress-bar ${isComplete ? 'complete' : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {goalMsg && (
          <div className={`habit-goal-msg ${isComplete ? 'achieved' : 'near'}`} style={{ marginTop: 6 }}>
            {goalMsg}
          </div>
        )}
        {!hasGoal && (
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 6 }}>
            No goal target configured for this habit.
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="habit-card-footer">
        {habit.status === 'Paused' ? (
          <button className="habit-view-link" onClick={() => changeStatus(habit._id, 'Active')} id={`resume-${habit._id}`}>
            Resume
          </button>
        ) : (
          <button className="habit-view-link" onClick={() => navigate(`/habits/${habit._id}`)} id={`edit-${habit._id}`}>
            View Details
          </button>
        )}
        <button
          className="habit-delete-btn"
          onClick={handleDelete}
          title="Delete habit"
          id={`delete-${habit._id}`}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <TrashIcon style={{ width: 14, height: 14 }} />
        </button>
      </div>
    </div>
  );
}
