import { useState, useEffect, FormEvent } from 'react';
import { Habit, UpdateHabitInput } from '../../types';
import { useHabitContext } from '../../context/HabitContext';
import { CloseIcon } from '../shared/Icons';
import ConfirmDialog from '../shared/ConfirmDialog';
import styles from './GoalHabitForm.module.css';

interface FormErrors {
  targetPerDay?: string;
  goalTargetValue?: string;
}

interface GoalHabitFormProps {
  editingHabit?: Habit | null;
  onClose: () => void;
  currentStreak: number;
  totalCompletions: number;
  // nextGoalStartDate?: string;
}

const BLANK = {
  goalTargetType: 'Streak' as 'Streak' | 'Total Completions',
  goalTargetValue: 30,
};

// export default function GoalHabitForm({ editingHabit, onClose, currentStreak, totalCompletions, nextGoalStartDate }: GoalHabitFormProps) {
export default function GoalHabitForm({ editingHabit, onClose, currentStreak, totalCompletions }: GoalHabitFormProps) {
  const { editHabit } = useHabitContext();
  const isEdit = !!editingHabit;
  const hasExistingGoalType = !!editingHabit?.goalTargetType;

  const [form, setForm] = useState({ ...BLANK });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Determine current progress and minimum allowed goal value
  const currentProgress = form.goalTargetType === 'Streak' ? currentStreak : totalCompletions;
  const minGoalValue = Math.max(1, currentProgress);

  // Pre-fill form when editing
  useEffect(() => {
    if (editingHabit) {
      setForm({
        goalTargetType: editingHabit.goalTargetType ?? 'Streak',
        goalTargetValue: editingHabit.goalTargetValue ?? 30,
      });
    } else {
      setForm({ ...BLANK });
    }
    setErrors({});
  }, [editingHabit]);

  function validate(): boolean {
    const e: FormErrors = {};
    if (!form.goalTargetValue || form.goalTargetValue < minGoalValue) {
      e.goalTargetValue = `Goal target must be at least ${minGoalValue} ${form.goalTargetType === 'Streak' ? 'days' : 'sessions'
        }.`;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    if (isEdit) {
      setShowConfirm(true);
    } else {
      await saveHabit();
    }
  }

  async function saveHabit() {
    setSubmitting(true);
    try {
      const goalTargetType = form.goalTargetType ? form.goalTargetType : null;
      const goalTargetValue = form.goalTargetValue ? form.goalTargetValue : null;

      if (isEdit && editingHabit) {
        // const isCurrentlyComplete =
        //   editingHabit.goalTargetValue &&
        //   (editingHabit.goalTargetType === 'Streak' ? currentStreak : totalCompletions) >= editingHabit.goalTargetValue;

        // const input: UpdateHabitInput = {
        //   goalTargetType,
        //   goalTargetValue,
        //   ...(isCurrentlyComplete ? { goalStartedAt: nextGoalStartDate || new Date().toISOString() } : {})
        // };
        const input: UpdateHabitInput = {
          goalTargetType,
          goalTargetValue,
        };
        await editHabit(editingHabit._id, input);
      } else {
        // This form is only for goal editing, so creating a habit here is not supported.
        throw new Error('GoalHabitForm cannot create a new habit directly.');
      }
      onClose();
    } catch {
      // error is set in context
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.modalBackdrop} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="habit-form-title">
        {/* Header */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle} id="habit-form-title">
            {isEdit ? 'Edit Goal Target' : 'Set Goal Target'}
          </h2>
          <button
            className={styles.modalClose}
            onClick={onClose}
            aria-label="Close"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <CloseIcon style={{ width: 20, height: 20 }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>

          {/* Long-Term Goal Target */}
          <div className={styles.formGroup} style={{ marginBottom: 18, borderTop: '1px solid var(--border-color)', paddingTop: 14 }}>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label className={styles.formLabel} htmlFor="goal-type" style={{ fontSize: '12px' }}>Target Type</label>
              {hasExistingGoalType ? (
                <div className={styles.readOnlyField} style={{ padding: '10px 13px', fontSize: '14px' }}>
                  {form.goalTargetType === 'Streak'
                    ? 'Streak Target (Consecutive Days)'
                    : 'Total Completions Target (Total Sessions)'}
                </div>
              ) : (
                <select
                  id="goal-type"
                  className={styles.formInput}
                  value={form.goalTargetType}
                  onChange={e => setForm(p => ({ ...p, goalTargetType: e.target.value as any }))}
                  style={{ padding: '8px 12px', fontSize: '14px' }}
                >
                  <option value="Streak">Streak Target (Consecutive Days)</option>
                  <option value="Total Completions">Total Completions Target (Total Sessions)</option>
                </select>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label className={styles.formLabel} htmlFor="goal-value" style={{ fontSize: '12px' }}>Target Value</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  id="goal-value"
                  type="number"
                  className={`${styles.formInput} ${errors.goalTargetValue ? styles.error : ''}`}
                  min={minGoalValue}
                  value={form.goalTargetValue}
                  onChange={e => {
                    const v = parseInt(e.target.value, 10);
                    setForm(p => ({ ...p, goalTargetValue: isNaN(v) ? minGoalValue : Math.max(minGoalValue, v) }));
                  }}
                  style={{ maxWidth: 120 }}
                />
                <span className={styles.goalSuffix}>
                  {form.goalTargetType === 'Streak' ? 'days in a row' : 'completed sessions'}
                </span>
              </div>
              {errors.goalTargetValue ? (
                <span className={styles.formError}>{errors.goalTargetValue}</span>
              ) : (
                <span className={styles.fieldHint}>
                  Current progress: {currentProgress} {form.goalTargetType === 'Streak' ? 'days' : 'sessions'}.
                </span>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className={styles.modalFooter}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting} id="habit-form-submit">
              {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Habit'}
            </button>
          </div>
        </form>
      </div>
      {showConfirm && (
        <ConfirmDialog
          isOpen={showConfirm}
          title="Save Changes"
          message={`Are you sure you want to save changes to "${editingHabit?.name}"?`}
          confirmLabel="Save Changes"
          type="info"
          onConfirm={async () => {
            setShowConfirm(false);
            await saveHabit();
          }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}
