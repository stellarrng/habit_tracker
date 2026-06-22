import { useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { Habit, HabitStatus, CheckIn } from '../../types';
import { useHabitContext } from '../../context/HabitContext';
import { getCheckIns } from '../../api/checkins';
import { useStreaks } from '../../hooks/useStreaks';
import {
  MoreVerticalIcon
} from '../shared/Icons';
import styles from './HabitCard.module.css';
import HabitCategoryIcon from '../shared/HabitCategoryIcon';

// ─── Helpers ──────────────────────────────────────────────────────────────

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
      <circle cx="20" cy="20" r={r} fill="none" stroke="var(--progress-track)" strokeWidth="4" />
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
  onArchiveRequest?: (habit: Habit) => void;
  onStatusChange?: (habitName: string, action: 'paused' | 'resumed' | 'restored', prevStatus: string) => void;
  onDeleteRequest?: (habit: Habit) => void;
  onSetGoal?: (habit: Habit, currentStreak: number, totalCompletions: number) => void;
}

export default function HabitCard({ habit, onEdit, onArchiveRequest, onDeleteRequest, onStatusChange, onSetGoal }: HabitCardProps) {
  const { changeStatus } = useHabitContext();
  const navigate = useNavigate();
  const isActive = habit.status === 'Active';

  // Menu state
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Check-ins and streaks
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const streaks = useStreaks(checkIns);

  // Fetch check-ins for this habit
  useEffect(() => {
    let alive = true;
    getCheckIns({ habitId: habit._id })
      .then(data => {
        if (alive) setCheckIns(data);
      })
      .catch(err => console.error('Failed to fetch check-ins:', err));
    return () => { alive = false; };
  }, [habit._id]);

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

  // Goal config
  const hasGoal = !!habit.goalTargetType && !!habit.goalTargetValue;
  const goalType = habit.goalTargetType || 'Streak';
  const target = habit.goalTargetValue || 30;

  // const goalCheckIns = useMemo(() => {
  //   if (!habit) return [];
  //   const startStr = habit.goalStartedAt || habit.createdAt;
  //   const startDate = new Date(startStr);
  //   startDate.setHours(0, 0, 0, 0);

  //   return checkIns.filter(c => {
  //     const checkInDate = new Date(c.date);
  //     checkInDate.setHours(0, 0, 0, 0);
  //     return checkInDate >= startDate;
  //   });
  // }, [habit, checkIns]);

  // const goalStreaks = useStreaks(goalCheckIns);

  // Calculate progress from real check-in data
  // const currentValue = goalType === 'Streak'
  //   ? goalStreaks.current
  //   : goalStreaks.totalSessions;
  const currentValue =
    goalType === 'Streak'
      ? streaks.current
      : streaks.totalSessions;
  const pct = Math.min(Math.round((currentValue / target) * 100), 100);
  const isComplete = pct >= 100;

  const goalMsg = hasGoal
    ? isComplete
      ? '🎉 Goal achieved!'
      : pct >= 80
        ? `Almost there! ${target - currentValue} more to go.`
        : null
    : null;

  function handlePause(e: React.MouseEvent) {
    e.stopPropagation();
    const prevStatus = habit.status;
    const nextStatus: HabitStatus = isActive ? 'Paused' : 'Active';
    changeStatus(habit._id, nextStatus);
    setMenuOpen(false);
    if (onStatusChange) {
      onStatusChange(habit.name, isActive ? 'paused' : 'resumed', prevStatus);
    }
  }

  function handleRestore(e: React.MouseEvent) {
    e.stopPropagation();
    const prevStatus = habit.status;
    changeStatus(habit._id, 'Active');
    setMenuOpen(false);
    if (onStatusChange) {
      onStatusChange(habit.name, 'restored', prevStatus);
    }
  }

  function handleArchive(e: React.MouseEvent) {
    e.stopPropagation();
    if (onArchiveRequest) {
      onArchiveRequest(habit);
    }
    setMenuOpen(false);
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();

    if (onDeleteRequest) {
      onDeleteRequest(habit);
    }

    setMenuOpen(false);
  }

  return (
    <div
      className={`habit-card ${habit.status.toLowerCase()}`}
      id={`habit-card-${habit._id}`}
      onClick={() => navigate(`/habits/${habit._id}`)}
      style={{ cursor: 'pointer' }}
      role="button"
      tabIndex={0}>

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
        {/* 3-dot menu */}
        <div className={styles.menuContainer} ref={menuRef}>
          <button
            className={styles.menuButton}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            title="More options"
          >
            <MoreVerticalIcon style={{ width: 18, height: 18 }} />
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

      {/* Meta chips */}
      <div className="habit-meta">
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
            onClick={(e) => {
              e.stopPropagation();
              if (onSetGoal) {
                onSetGoal(habit, streaks.current, streaks.totalSessions);
              } else {
                onEdit(habit);
              }
            }}
            id={`set-goal-${habit._id}`}
          >
            Set a goal →
          </button>
        </div>
      )}
    </div>
  );
}
