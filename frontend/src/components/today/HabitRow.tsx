import type { Habit, CheckIn, Goal, CheckInStatus } from "../../types";
import HabitCategoryIcon from "@/components/shared/HabitCategoryIcon";
import styles from "./HabitRow.module.css";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HabitWithCheckIn {
    habit: Habit;
    checkIn: CheckIn;
    goal: Goal | null;
}

interface HabitRowProps {
    row: HabitWithCheckIn;
    onIncrement: (row: HabitWithCheckIn) => void;
    onDecrement: (row: HabitWithCheckIn) => void;
    isPending: boolean;
    isReadOnly: boolean; // ← NEW: true when viewing a non-today date
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function deriveStatus(completedCount: number, targetPerDay: number): CheckInStatus {
    if (completedCount <= 0) return "Not Started";
    if (completedCount >= targetPerDay) return "Completed";
    return "In Progress";
}

// ── StatusLine ────────────────────────────────────────────────────────────────
// Only used inside HabitRow, kept in the same file since it's tightly coupled
// to the row's status/goal display logic.

function StatusLine({ status, completedCount, targetPerDay, goal }: {
    status: CheckInStatus;
    completedCount: number;
    targetPerDay: number;
    goal: Goal | null;
}) {
    // ── Completed ──────────────────────────────────────────────────────────────
    if (status === "Completed") {
        if (goal?.targetType === "Streak") {
            const mockCurrentStreak = 5; // TODO: derive from real check-in history
            return (
                <span className={`${styles.statusLine} ${styles.statusCompleted}`}>
                    <span className={styles.statusDot} />
                    Done · 🔥 {mockCurrentStreak} day streak
                </span>
            );
        }
        if (goal?.targetType === "Total Completions") {
            const mockTotalSoFar = 14; // TODO: derive from all-time check-ins
            const remaining = Math.max(0, goal.targetValue - mockTotalSoFar);
            return (
                <span className={`${styles.statusLine} ${styles.statusCompleted}`}>
                    <span className={styles.statusDot} />
                    Done · {remaining > 0 ? `${remaining} more to goal` : "Goal reached! 🎉"}
                </span>
            );
        }
        return (
            <span className={`${styles.statusLine} ${styles.statusCompleted}`}>
                <span className={styles.statusDot} />
                Completed
            </span>
        );
    }

    // ── Not Started ────────────────────────────────────────────────────────────
    if (status === "Not Started") {
        if (goal?.targetType === "Streak") {
            return (
                <span className={`${styles.statusLine} ${styles.statusAtRisk}`}>
                    ⚠ At risk of breaking streak
                </span>
            );
        }
        if (goal?.targetType === "Total Completions") {
            const mockTotalSoFar = 14;
            const remaining = Math.max(0, goal.targetValue - mockTotalSoFar);
            return (
                <span className={`${styles.statusLine} ${styles.statusNotStarted}`}>
                    {remaining > 0 ? `${remaining} more to reach goal` : "Goal reached! 🎉"}
                </span>
            );
        }
        return (
            <span className={`${styles.statusLine} ${styles.statusAtRisk}`}>
                ⚠ Not started
            </span>
        );
    }

    // ── In Progress ────────────────────────────────────────────────────────────
    if (goal?.targetType === "Streak") {
        const mockCurrentStreak = 5;
        return (
            <span className={`${styles.statusLine} ${styles.statusInProgress}`}>
                🔥 {mockCurrentStreak} day streak · {targetPerDay - completedCount} left today
            </span>
        );
    }
    if (goal?.targetType === "Total Completions") {
        const mockTotalSoFar = 14;
        const remaining = Math.max(0, goal.targetValue - mockTotalSoFar);
        return (
            <span className={`${styles.statusLine} ${styles.statusInProgress}`}>
                {remaining > 0 ? `${remaining} more to goal` : "Goal reached!"} · {targetPerDay - completedCount} left today
            </span>
        );
    }
    return (
        <span className={`${styles.statusLine} ${styles.statusInProgress}`}>
            In Progress · {targetPerDay - completedCount} left
        </span>
    );
}

// ── HabitRow ──────────────────────────────────────────────────────────────────

export default function HabitRow({ row, onIncrement, onDecrement, isPending, isReadOnly }: HabitRowProps) {
    const { habit, checkIn, goal } = row;
    const status = deriveStatus(checkIn.completedCount, habit.targetPerDay);
    const isCompleted = status === "Completed";
    const isAtRisk = status === "Not Started";
    const isBinary = habit.targetPerDay === 1;

    const progress = Math.min((checkIn.completedCount / habit.targetPerDay) * 100, 100);

    const rowClass = [
        styles.habitRow,
        styles[`priority${habit.priority}`],
        isCompleted ? styles.habitRowCompleted : "",
        isAtRisk ? styles.habitRowAtRisk : "",
    ].join(" ");

    return (
        <div className={rowClass}>
            <div
                className={styles.habitProgressFill}
                style={{ width: `${progress}%` }}
            />
            <div className={styles.habitLeft}>
                <HabitCategoryIcon
                    category={habit.category}
                    size={40}
                    completed={isCompleted}
                />
                <div className={styles.habitInfo}>
                    <div className={styles.habitNameRow}>
                        <span className={styles.habitName}>{habit.name}</span>
                        <span
                            className={`${styles.priorityBadge} ${styles[`priorityBadge${habit.priority}`]}`}
                        >
                            {habit.priority.toUpperCase()}
                        </span>
                    </div>
                    <StatusLine
                        status={status}
                        completedCount={checkIn.completedCount}
                        targetPerDay={habit.targetPerDay}
                        goal={goal}
                    />
                </div>
            </div>
            <div className={styles.counter}>
                {isBinary ? (
                    <button
                        className={`${styles.checkBtn} ${checkIn.completedCount > 0 ? styles.checkBtnDone : ""}`}
                        onClick={() => checkIn.completedCount > 0 ? onDecrement(row) : onIncrement(row)}
                        disabled={isPending || isReadOnly}
                        aria-label={checkIn.completedCount > 0 ? `Undo ${habit.name}` : `Complete ${habit.name}`}
                    >
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3.5 9 7.5 13 14.5 5" />
                        </svg>
                    </button>
                ) : (
                    <div className={styles.counterPill}>
                        <button
                            className={styles.counterBtn}
                            onClick={() => onDecrement(row)}
                            disabled={isPending || isReadOnly || checkIn.completedCount <= 0}
                            aria-label={`Decrease ${habit.name}`}
                        >-</button>
                        <span className={styles.counterValue}>
                            {checkIn.completedCount}
                            <span className={styles.counterTotal}> / {habit.targetPerDay}</span>
                        </span>
                        <button
                            className={styles.counterBtn}
                            onClick={() => onIncrement(row)}
                            disabled={isPending || isReadOnly || isCompleted}
                            aria-label={`Increase ${habit.name}`}
                        >+</button>
                    </div>
                )}
            </div>
        </div>
    );
}