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
import styles from './HabitCard.module.css';
import HabitCategoryIcon from '../shared/HabitCategoryIcon';

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

/** Small SVG ring showing progress (r=16 → circumference ≈ 100) */
function GoalRing({ pct, complete }: { pct: number; complete: boolean }) {
  const r = 16;
  const circ = 2 * Math.PI * r;
  const dash = ((pct / 100) * circ).toFixed(1);
  const color = complete ? 'var(--color-success)' : 'var(--color-primary)';
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" className={styles.goalRing}>
      <circle cx="20" cy="20" r={r} fill="none" stroke="#EEF0F7" strokeWidth="4" />
      <circle
        cx="20" cy="20" r={r}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        strokeDashoffset="0"
        transform="rotate(-90 20 20)"
        style={{ transition: 'stroke-dasharray 0.4s ease' }}
      />
      <text
        x="20" y="20"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="9"
        fontWeight="700"
        fill={color}
      >
        {pct}%
      </text>
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────
interface HabitCardProps {
  habit: Habit;
  onEdit: (habit: Habit) => void;
}

export default function HabitCard({ habit, onEdit }: HabitCardProps) {
  const { changeStatus, removeHabit } = useHabitContext();
  const navigate = useNavigate();
  const isActive = habit.status === 'Active';

  // Goal config
  const hasGoal = !!habit.goalTargetType && !!habit.goalTargetValue;
  const goalType = habit.goalTargetType || 'Streak';
  const target = habit.goalTargetValue || 30;

  // Stable progress derived from habit age only
  const age = Math.floor((Date.now() - new Date(habit.createdAt).getTime()) / 86_400_000);
  const baseProgress = Math.max(0, Math.min(Math.floor(age * 0.75), 60));
  const currentValue = goalType === 'Streak'
    ? Math.min(baseProgress, target)
    : Math.min(Math.floor(baseProgress * 1.5), target);
  const pct = Math.min(Math.round((currentValue / target) * 100), 100);
  const isComplete = pct >= 100;

  const goalMsg = hasGoal
    ? isComplete
      ? '🎉 Goal achieved!'
      : pct >= 80
        ? `Almost there! ${target - currentValue} more to go.`
        : null
    : null;

  const iconBg = CATEGORY_COLORS[habit.category] ?? '#EEF0F7';

  function renderCategoryIcon() {
    const props = { style: { color: 'rgba(0,0,0,0.6)' } };
    switch (habit.category) {
      case 'Health': return <DropletIcon {...props} />;
      case 'Study': return <BookIcon {...props} />;
      case 'Work': return <BriefcaseIcon {...props} />;
      case 'Mindfulness': return <LotusIcon {...props} />;
      default: return <StarIcon {...props} />;
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

  return (
    <div className={`habit-card ${habit.status.toLowerCase()}`} id={`habit-card-${habit._id}`}>

      {/* Header */}
      <div className="habit-card-header">
        {/* <div className="habit-icon" style={{ background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {renderCategoryIcon()}
        </div> */}
        {/* Component for Category Icon */}
        <HabitCategoryIcon
          category={habit.category}
          size={45}
        />
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

      {/* ── Goal Section ─────────────────────────────────────────── */}
      {hasGoal ? (
        <div className={styles.goalSection}>
          {/* Header row: type label + pct badge */}
          <div className={styles.goalHeader}>
            <span className={styles.goalTypeLabel}>
              {goalType === 'Streak' ? 'Streak target' : 'Completion target'}
            </span>
            <span className={`${styles.goalPct} ${isComplete ? styles.goalPctComplete : ''}`}>
              {pct}%
            </span>
          </div>

          {/* Ring + numbers */}
          <div className={styles.goalProgressRow}>
            <GoalRing pct={pct} complete={isComplete} />
            <div className={styles.goalNumbers}>
              <div className={`${styles.goalValue} ${isComplete ? styles.goalValueComplete : ''}`}>
                {currentValue}
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 4 }}>
                  / {target} {goalType === 'Streak' ? 'days' : 'sessions'}
                </span>
              </div>
              {/* Progress bar */}
              <div className={styles.goalBar} style={{ marginTop: 8 }}>
                <div
                  className={`${styles.goalBarFill} ${isComplete ? styles.goalBarFillComplete : ''}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Status message */}
          {goalMsg && (
            <div className={`${styles.goalMsg} ${isComplete ? styles.goalMsgAchieved : styles.goalMsgNear}`}>
              {goalMsg}
            </div>
          )}
        </div>
      ) : (
        <div className={styles.noGoalRow}>
          <span className={styles.noGoalText}>No goal target set</span>
          <button
            className={styles.noGoalLink}
            onClick={() => onEdit(habit)}
            id={`set-goal-${habit._id}`}
          >
            Set a goal →
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="habit-card-footer">
        {habit.status === 'Paused' ? (
          <button className="habit-view-link" onClick={() => changeStatus(habit._id, 'Active')} id={`resume-${habit._id}`}>
            Resume
          </button>
        ) : (
          <button className="habit-view-link" onClick={() => navigate(`/habits/${habit._id}`)} id={`view-${habit._id}`}>
            View Details →
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
