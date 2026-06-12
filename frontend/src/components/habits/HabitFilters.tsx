import { useHabitContext, FilterState } from '../../context/HabitContext';
import { HabitCategory, HabitFrequency, HabitPriority, HabitStatus } from '../../types';

const CATEGORIES: (HabitCategory | 'All')[] = ['All', 'Health', 'Study', 'Work', 'Mindfulness', 'Other'];
const FREQUENCIES: (HabitFrequency | 'All')[] = ['All', 'Daily', 'Specific days'];
const PRIORITIES:  (HabitPriority  | 'All')[] = ['All', 'Low', 'Medium', 'High'];
const STATUSES:    (HabitStatus    | 'All')[] = ['All', 'Active', 'Paused', 'Archived'];

export default function HabitFilters() {
  const { filters, setFilters } = useHabitContext();

  function handle<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setFilters({ [key]: value } as Partial<FilterState>);
  }

  return (
    <div className="filter-row">
      <span className="filter-label">Filter by:</span>

      <select
        id="filter-category"
        className="filter-select"
        value={filters.category}
        onChange={e => handle('category', e.target.value as FilterState['category'])}
      >
        {CATEGORIES.map(c => (
          <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
        ))}
      </select>

      <select
        id="filter-frequency"
        className="filter-select"
        value={filters.frequency}
        onChange={e => handle('frequency', e.target.value as FilterState['frequency'])}
      >
        {FREQUENCIES.map(f => (
          <option key={f} value={f}>{f === 'All' ? 'All Frequencies' : f}</option>
        ))}
      </select>

      <select
        id="filter-priority"
        className="filter-select"
        value={filters.priority}
        onChange={e => handle('priority', e.target.value as FilterState['priority'])}
      >
        {PRIORITIES.map(p => (
          <option key={p} value={p}>{p === 'All' ? 'All Priorities' : p}</option>
        ))}
      </select>

      <select
        id="filter-status"
        className="filter-select"
        value={filters.status}
        onChange={e => handle('status', e.target.value as FilterState['status'])}
      >
        {STATUSES.map(s => (
          <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>
        ))}
      </select>
    </div>
  );
}
