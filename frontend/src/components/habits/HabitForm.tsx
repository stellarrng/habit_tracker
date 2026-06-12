import { useState, useEffect, FormEvent } from 'react';
import { Habit, HabitCategory, HabitFrequency, HabitPriority, WeekDay, CreateHabitInput, UpdateHabitInput } from '../../types';
import { useHabitContext } from '../../context/HabitContext';
import { CloseIcon } from '../shared/Icons';
import ConfirmDialog from '../shared/ConfirmDialog';

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

interface HabitFormProps {
  editingHabit?: Habit | null;
  onClose: () => void;
}

const BLANK = {
  name: '', category: 'Health' as HabitCategory,
  frequency: 'Daily' as HabitFrequency, specificDays: [] as WeekDay[],
  targetPerDay: 1, priority: 'Medium' as HabitPriority, description: '',
  enableGoal: false,
  goalTargetType: 'Streak' as 'Streak' | 'Total Completions',
  goalTargetValue: 30,
};

export default function HabitForm({ editingHabit, onClose }: HabitFormProps) {
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
        description: (editingHabit as any).description ?? '',
        enableGoal:  !!editingHabit.goalTargetType,
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
    if (!form.name.trim()) e.name = 'Habit name is required.';
    if (form.targetPerDay < 1) e.targetPerDay = 'Target must be at least 1.';
    if (form.frequency === 'Specific days' && form.specificDays.length === 0)
      e.specificDays = 'Select at least one day.';
    if (form.enableGoal) {
      if (!form.goalTargetValue || form.goalTargetValue < 1) {
        e.goalTargetValue = 'Goal target must be at least 1.';
      }
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
      const goalTargetType = form.enableGoal ? form.goalTargetType : null;
      const goalTargetValue = form.enableGoal ? form.goalTargetValue : null;

      if (isEdit && editingHabit) {
        const input: UpdateHabitInput = {
          name:        form.name.trim(),
          category:    form.category,
          frequency:   form.frequency,
          specificDays: form.specificDays,
          targetPerDay: form.targetPerDay,
          priority:    form.priority,
          goalTargetType,
          goalTargetValue,
          description: form.description.trim(),
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
          goalTargetType,
          goalTargetValue,
          description: form.description.trim(),
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
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="habit-form-title">
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title" id="habit-form-title">
            {isEdit ? 'Edit Habit' : 'Add New Habit'}
          </h2>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <CloseIcon style={{ width: 20, height: 20 }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Habit Name */}
          <div className="form-group" style={{ marginBottom: 18 }}>
            <label className="form-label" htmlFor="habit-name">
              Habit Name <span>*</span>
            </label>
            <input
              id="habit-name"
              type="text"
              className={`form-input ${errors.name ? 'error' : ''}`}
              placeholder="e.g., Morning Meditation"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              maxLength={80}
            />
            {errors.name && <span className="form-error">{errors.name}</span>}
          </div>

          {/* Category */}
          <div className="form-group" style={{ marginBottom: 18 }}>
            <label className="form-label" htmlFor="habit-category">Category <span>*</span></label>
            <select
              id="habit-category"
              className={`form-select ${errors.category ? 'error' : ''}`}
              value={form.category}
              onChange={e => setForm(p => ({ ...p, category: e.target.value as HabitCategory }))}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Frequency + Priority */}
          <div className="form-grid-2" style={{ marginBottom: 18 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="habit-frequency">Frequency <span>*</span></label>
              <select
                id="habit-frequency"
                className="form-select"
                value={form.frequency}
                onChange={e => setForm(p => ({ ...p, frequency: e.target.value as HabitFrequency, specificDays: [] }))}
              >
                {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Priority <span>*</span></label>
              <div className="priority-group" role="group" aria-label="Select priority">
                {PRIORITIES.map(p => (
                  <button
                    key={p} type="button"
                    className={`priority-btn ${form.priority === p ? `sel-${p.toLowerCase()}` : ''}`}
                    onClick={() => setForm(prev => ({ ...prev, priority: p }))}
                    id={`priority-${p.toLowerCase()}`}
                  >
                    {p.toUpperCase().slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Specific days */}
          {form.frequency === 'Specific days' && (
            <div className="form-group" style={{ marginBottom: 18 }}>
              <label className="form-label">Days of the Week <span>*</span></label>
              <div className="days-picker">
                {WEEK_DAYS.map(day => (
                  <button
                    key={day} type="button"
                    className={`day-btn ${form.specificDays.includes(day) ? 'selected' : ''}`}
                    onClick={() => toggleDay(day)}
                    id={`day-${day}`}
                  >
                    {day}
                  </button>
                ))}
              </div>
              {errors.specificDays && <span className="form-error">{errors.specificDays}</span>}
            </div>
          )}

          {/* Goal / Target */}
          <div className="form-group" style={{ marginBottom: 18 }}>
            <label className="form-label" htmlFor="habit-target">Goal / Target per day</label>
            <div className="goal-row">
              <input
                id="habit-target"
                type="number"
                className={`form-input ${errors.targetPerDay ? 'error' : ''}`}
                min={1}
                value={form.targetPerDay}
                onChange={e => {
                  const v = parseInt(e.target.value, 10);
                  setForm(p => ({ ...p, targetPerDay: isNaN(v) ? 1 : Math.max(1, v) }));
                }}
              />
              <span className="goal-suffix">
                {form.targetPerDay === 1 ? 'session / day' : 'times / day'}
              </span>
            </div>
            {errors.targetPerDay && <span className="form-error">{errors.targetPerDay}</span>}
          </div>

          {/* Long-Term Goal Target */}
          <div className="form-group" style={{ marginBottom: 18, borderTop: '1px solid var(--border-color)', paddingTop: 14 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={form.enableGoal}
                onChange={e => setForm(p => ({ ...p, enableGoal: e.target.checked }))}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              Define a Measurable Goal Target
            </label>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 10px 24px' }}>
              Set a long-term milestone (e.g. a 30-day streak or 100 completions total) to stay motivated.
            </p>

            {form.enableGoal && (
              <div style={{ marginLeft: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label className="form-label" htmlFor="goal-type" style={{ fontSize: '12px' }}>Target Type</label>
                  <select
                    id="goal-type"
                    className="form-input"
                    value={form.goalTargetType}
                    onChange={e => setForm(p => ({ ...p, goalTargetType: e.target.value as any }))}
                    style={{ padding: '8px 12px', fontSize: '14px' }}
                  >
                    <option value="Streak">Streak Target (Consecutive Days)</option>
                    <option value="Total Completions">Total Completions Target (Total Sessions)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label className="form-label" htmlFor="goal-value" style={{ fontSize: '12px' }}>Target Value</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      id="goal-value"
                      type="number"
                      className={`form-input ${errors.goalTargetValue ? 'error' : ''}`}
                      min={1}
                      value={form.goalTargetValue}
                      onChange={e => {
                        const v = parseInt(e.target.value, 10);
                        setForm(p => ({ ...p, goalTargetValue: isNaN(v) ? 1 : Math.max(1, v) }));
                      }}
                      style={{ maxWidth: 120 }}
                    />
                    <span className="goal-suffix">
                      {form.goalTargetType === 'Streak' ? 'days in a row' : 'completed sessions'}
                    </span>
                  </div>
                  {errors.goalTargetValue && <span className="form-error">{errors.goalTargetValue}</span>}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="form-group" style={{ marginBottom: 4 }}>
            <label className="form-label" htmlFor="habit-description">Description</label>
            <textarea
              id="habit-description"
              className="form-textarea"
              placeholder="Add some details about your habit…"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              maxLength={400}
            />
          </div>

          {/* Footer */}
          <div className="modal-footer">
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
