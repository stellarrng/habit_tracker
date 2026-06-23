import { useState, useEffect, FormEvent } from 'react';
import { Habit, HabitCategory, HabitFrequency, HabitPriority, WeekDay, CreateHabitInput, UpdateHabitInput } from '../../types';
import { useHabitContext } from '../../context/HabitContext';
import { CloseIcon } from '../shared/Icons';
import ConfirmDialog from '../shared/ConfirmDialog';
import styles from './InforHabitForm.module.css';

const CATEGORIES: HabitCategory[]  = ['Health', 'Study', 'Work', 'Mindfulness', 'Other'];
const FREQUENCIES: HabitFrequency[] = ['Daily', 'Specific days'];
const PRIORITIES: HabitPriority[]   = ['Low', 'Medium', 'High'];
const WEEK_DAYS: WeekDay[]          = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface FormErrors {
  name?: string;
  category?: string;
  targetPerDay?: string;
  specificDays?: string;
  goalTargetValue?: string;
}

interface InforHabitFormProps {
  editingHabit?: Habit | null;
  onClose: () => void;
}

const BLANK = {
  name: '', category: 'Health' as HabitCategory,
  frequency: 'Daily' as HabitFrequency, specificDays: [] as WeekDay[],
  targetPerDay: 1, priority: 'Medium' as HabitPriority,
};

export default function InforHabitForm({ editingHabit, onClose }: InforHabitFormProps) {
  const { addHabit, editHabit } = useHabitContext();
  const isEdit = !!editingHabit;

  const [form, setForm]       = useState({ ...BLANK });
  const [errors, setErrors]   = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Pre-fill form when editing
  useEffect(() => {
    if (editingHabit) {
      setForm({
        name:        editingHabit.name,
        category:    editingHabit.category,
        frequency:   editingHabit.frequency,
        specificDays: editingHabit.specificDays,
        targetPerDay: editingHabit.targetPerDay,
        priority:    editingHabit.priority,
      });
    } else {
      setForm({ ...BLANK });
    }
    setErrors({});
  }, [editingHabit]);

  function validate(): boolean {
    const e: FormErrors = {};
    if (!form.name.trim()) e.name = 'Habit name is required.';
    if (form.targetPerDay < 1) e.targetPerDay = 'Target must be at least 1.';
    if (form.frequency === 'Specific days' && form.specificDays.length === 0)
      e.specificDays = 'Select at least one day.';
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

      if (isEdit && editingHabit) {
        const input: UpdateHabitInput = {
          name:        form.name.trim(),
          category:    form.category,
          frequency:   form.frequency,
          specificDays: form.specificDays,
          targetPerDay: form.targetPerDay,
          priority:    form.priority,
        };
        await editHabit(editingHabit._id, input);
      } else {
        const input: CreateHabitInput = {
          name:        form.name.trim(),
          category:    form.category,
          frequency:   form.frequency,
          specificDays: form.specificDays,
          targetPerDay: form.targetPerDay,
          priority:    form.priority,
        };
        await addHabit(input);
      }
      onClose();
    } catch {
      // error is set in context
    } finally {
      setSubmitting(false);
    }
  }

  function toggleDay(day: WeekDay) {
    setForm(prev => ({
      ...prev,
      specificDays: prev.specificDays.includes(day)
        ? prev.specificDays.filter(d => d !== day)
        : [...prev.specificDays, day],
    }));
  }

  return (
    <div className={styles.modalBackdrop} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="habit-form-title">
        {/* Header */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle} id="habit-form-title">
            {isEdit ? 'Edit Habit' : 'Add New Habit'}
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
          {/* Habit Name */}
          <div className={styles.formGroup} style={{ marginBottom: 18 }}>
            <label className={styles.formLabel} htmlFor="habit-name">
              Habit Name <span>*</span>
            </label>
            <input
              id="habit-name"
              type="text"
              className={`${styles.formInput} ${errors.name ? styles.error : ''}`}
              placeholder="e.g., Morning Meditation"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              maxLength={80}
            />
            {errors.name && <span className={styles.formError}>{errors.name}</span>}
          </div>

          {/* Category */}
          <div className={styles.formGroup} style={{ marginBottom: 18 }}>
            <label className={styles.formLabel} htmlFor="habit-category">Category <span>*</span></label>
            <select
              id="habit-category"
              className={`${styles.formSelect} ${errors.category ? styles.error : ''}`}
              value={form.category}
              onChange={e => setForm(p => ({ ...p, category: e.target.value as HabitCategory }))}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Frequency + Priority */}
          <div className={styles.formGrid2} style={{ marginBottom: 18 }}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="habit-frequency">Frequency <span>*</span></label>
              <select
                id="habit-frequency"
                className={styles.formSelect}
                value={form.frequency}
                onChange={e => setForm(p => ({ ...p, frequency: e.target.value as HabitFrequency, specificDays: [] }))}
              >
                {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Priority <span>*</span></label>
              <div className={styles.priorityGroup} role="group" aria-label="Select priority">
                {PRIORITIES.map(p => {
                  const selClass = p === 'Low' ? styles.selLow : p === 'Medium' ? styles.selMedium : styles.selHigh;
                  return (
                    <button
                      key={p} type="button"
                      className={`${styles.priorityBtn} ${form.priority === p ? selClass : ''}`}
                      onClick={() => setForm(prev => ({ ...prev, priority: p }))}
                      id={`priority-${p.toLowerCase()}`}
                    >
                      {p.toUpperCase().slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Specific days */}
          {form.frequency === 'Specific days' && (
            <div className={styles.formGroup} style={{ marginBottom: 18 }}>
              <label className={styles.formLabel}>Days of the Week <span>*</span></label>
              <div className={styles.daysPicker}>
                {WEEK_DAYS.map(day => (
                  <button
                    key={day} type="button"
                    className={`${styles.dayBtn} ${form.specificDays.includes(day) ? styles.selected : ''}`}
                    onClick={() => toggleDay(day)}
                    id={`day-${day}`}
                  >
                    {day}
                  </button>
                ))}
              </div>
              {errors.specificDays && <span className={styles.formError}>{errors.specificDays}</span>}
            </div>
          )}

          {/* Goal / Target */}
          <div className={styles.formGroup} style={{ marginBottom: 18 }}>
            <label className={styles.formLabel} htmlFor="habit-target">Goal / Target per day <span>*</span></label>
            <div className={styles.goalRow}>
              <input
                id="habit-target"
                type="number"
                className={`${styles.formInput} ${errors.targetPerDay ? styles.error : ''}`}
                min={1}
                value={form.targetPerDay}
                onChange={e => {
                  const v = parseInt(e.target.value, 10);
                  setForm(p => ({ ...p, targetPerDay: isNaN(v) ? 1 : Math.max(1, v) }));
                }}
              />
              <span className={styles.goalSuffix}>
                {form.targetPerDay === 1 ? 'session / day' : 'times / day'}
              </span>
            </div>
            {errors.targetPerDay && <span className={styles.formError}>{errors.targetPerDay}</span>}
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
