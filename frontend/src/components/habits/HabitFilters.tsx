import { useHabitContext, FilterState } from '../../context/HabitContext';
import { HabitCategory, HabitFrequency, HabitPriority, HabitStatus } from '../../types';
import { SearchIcon } from '../shared/Icons';
import MultiSelectDropdown from '../shared/MultiSelectDropdown';
import styles from './HabitFilters.module.css';

const CATEGORIES: HabitCategory[] = ['Health', 'Study', 'Work', 'Mindfulness', 'Other'];
const FREQUENCIES: HabitFrequency[] = ['Daily', 'Specific days'];
const PRIORITIES:  HabitPriority[] = ['Low', 'Medium', 'High'];
const STATUSES:    HabitStatus[] = ['Active', 'Paused', 'Archived'];

export default function HabitFilters() {
  const { filters, setFilters } = useHabitContext();

  function handle<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setFilters({ [key]: value } as Partial<FilterState>);
  }

  return (
    <div className={styles.filterRow}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginRight: '16px' }}>
        <input
          type="text"
          id="search-habits"
          className={styles.searchInput}
          placeholder="Search habits..."
          value={filters.search}
          onChange={e => handle('search', e.target.value)}
          style={{
            width: '240px',
            paddingLeft: '34px',
            background: 'var(--bg-card)',
          }}
        />
        <span style={{ position: 'absolute', left: 12, display: 'flex', alignItems: 'center', pointerEvents: 'none', color: 'var(--text-muted)' }}>
          <SearchIcon style={{ width: 14, height: 14 }} />
        </span>
      </div>

      <span className={styles.filterLabel}>Filter by:</span>

      <MultiSelectDropdown
        options={CATEGORIES}
        selected={filters.category}
        onChange={(selected) => handle('category', selected as FilterState['category'])}
        placeholder="All Categories"
      />

      <MultiSelectDropdown
        options={FREQUENCIES}
        selected={filters.frequency}
        onChange={(selected) => handle('frequency', selected as FilterState['frequency'])}
        placeholder="All Frequencies"
      />

      <MultiSelectDropdown
        options={PRIORITIES}
        selected={filters.priority}
        onChange={(selected) => handle('priority', selected as FilterState['priority'])}
        placeholder="All Priorities"
      />

      <MultiSelectDropdown
        options={STATUSES}
        selected={filters.status}
        onChange={(selected) => handle('status', selected as FilterState['status'])}
        placeholder="All Statuses"
      />
    </div>
  );
}
