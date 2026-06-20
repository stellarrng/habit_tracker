import { useHabitContext, FilterState } from '../../context/HabitContext';
import { HabitCategory, HabitFrequency, HabitPriority, HabitStatus, WeekDay } from '../../types';
import { SearchIcon, CheckIcon } from '../shared/Icons';
import MultiSelectDropdown from '../shared/MultiSelectDropdown';
import styles from './HabitFilters.module.css';

const CATEGORIES: HabitCategory[] = ['Health', 'Study', 'Work', 'Mindfulness', 'Other'];
const FREQUENCIES: HabitFrequency[] = ['Daily', 'Specific days'];
const WEEKDAYS: WeekDay[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const PRIORITIES: HabitPriority[] = ['Low', 'Medium', 'High'];
const STATUSES: HabitStatus[] = ['Active', 'Paused', 'Archived'];

const ChevronRightIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

export default function HabitFilters() {
  const { filters, setFilters } = useHabitContext();

  function handle<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setFilters({ [key]: value } as Partial<FilterState>);
  }

  function toggleWeekday(day: WeekDay) {
    const currentWeekdays = filters.weekdays || [];
    const isSelected = currentWeekdays.includes(day);
    const newWeekdays = isSelected
      ? currentWeekdays.filter(d => d !== day)
      : [...currentWeekdays, day];
    
    const nextFreq = filters.frequency.includes('Specific days')
      ? filters.frequency
      : [...filters.frequency, 'Specific days'];

    setFilters({
      weekdays: newWeekdays,
      frequency: nextFreq as FilterState['frequency']
    });
  }

  return (
    <div className={styles.filterContainer}>
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
          onChange={(selected) => {
            const nextFreq = selected as FilterState['frequency'];
            if (!nextFreq.includes('Specific days')) {
              setFilters({ frequency: nextFreq, weekdays: [] });
            } else {
              setFilters({ frequency: nextFreq });
            }
          }}
          placeholder="All Frequencies"
          renderOptionAddition={(option, isHovered) => {
            if (option === 'Specific days') {
              return (
                <>
                  <span className={styles.submenuIndicator}>
                    <ChevronRightIcon />
                  </span>
                  {isHovered && (
                    <div className={styles.submenuContainer} onClick={(e) => e.stopPropagation()}>
                      {WEEKDAYS.map((day) => {
                        const isSelected = (filters.weekdays || []).includes(day);
                        return (
                          <div
                            key={day}
                            className={styles.submenuItem}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleWeekday(day);
                            }}
                          >
                            <div className={`${styles.submenuCheckbox} ${isSelected ? styles.submenuCheckboxActive : ''}`}>
                              {isSelected && <CheckIcon style={{ width: 12, height: 12 }} />}
                            </div>
                            <span>{day}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            }
            return null;
          }}
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
    </div>
  );
}
