import api from './axiosInstance';
import { Habit, CreateHabitInput, UpdateHabitInput } from '../types';

// ─── Mock data seed (used as offline fallback) ────────────────────────────
const MOCK_HABITS: Habit[] = [
  {
    _id: 'mock-1', userId: 'local',
    name: 'Hydration Goal', category: 'Health', frequency: 'Daily',
    specificDays: [], targetPerDay: 8, priority: 'High', status: 'Active',
    goalTargetType: 'Total Completions', goalTargetValue: 100,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: 'mock-2', userId: 'local',
    name: 'Daily Reading', category: 'Study', frequency: 'Daily',
    specificDays: [], targetPerDay: 1, priority: 'Medium', status: 'Active',
    goalTargetType: 'Streak', goalTargetValue: 30,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: 'mock-3', userId: 'local',
    name: 'Morning Yoga', category: 'Health', frequency: 'Specific days',
    specificDays: ['Mon', 'Wed', 'Fri'], targetPerDay: 1, priority: 'Low', status: 'Paused',
    goalTargetType: 'Streak', goalTargetValue: 20,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const LS_KEY = 'ht_habits';

function localRead(): Habit[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Habit[]) : [];
  } catch {
    return [];
  }
}

function localWrite(habits: Habit[]): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(habits)); } catch { /* quota */ }
}

function localSeed(): Habit[] {
  localWrite(MOCK_HABITS);
  return MOCK_HABITS;
}

// ─── GET /api/habits ───────────────────────────────────────────────────────
export async function getHabits(): Promise<Habit[]> {
  try {
    const res = await api.get<Habit[]>('/habits');
    localWrite(res.data); // keep LS in sync
    return res.data;
  } catch {
    const cached = localRead();
    return cached.length > 0 ? cached : localSeed();
  }
}

// ─── POST /api/habits ──────────────────────────────────────────────────────
export async function createHabit(input: CreateHabitInput): Promise<Habit> {
  try {
    const res = await api.post<Habit>('/habits', input);
    // sync to LS
    const all = localRead();
    localWrite([res.data, ...all]);
    return res.data;
  } catch {
    const localHabit: Habit = {
      _id: `local-${Date.now()}`, userId: 'local',
      name: input.name, category: input.category,
      frequency: input.frequency, specificDays: input.specificDays ?? [],
      targetPerDay: input.targetPerDay, priority: input.priority ?? 'Medium',
      status: 'Active',
      goalTargetType: input.goalTargetType,
      goalTargetValue: input.goalTargetValue,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    const all = localRead();
    localWrite([localHabit, ...all]);
    return localHabit;
  }
}

// ─── PUT /api/habits/:id ───────────────────────────────────────────────────
export async function updateHabit(id: string, input: UpdateHabitInput): Promise<Habit> {
  try {
    const res = await api.put<Habit>(`/habits/${id}`, input);
    const all = localRead().map(h => h._id === id ? res.data : h);
    localWrite(all);
    return res.data;
  } catch {
    const all = localRead();
    const idx = all.findIndex(h => h._id === id);
    if (idx === -1) throw new Error('Habit not found in local cache');
    const updated: Habit = { ...all[idx], ...input, updatedAt: new Date().toISOString() };
    all[idx] = updated;
    localWrite(all);
    return updated;
  }
}

// ─── DELETE /api/habits/:id ────────────────────────────────────────────────
export async function deleteHabit(id: string): Promise<void> {
  try {
    await api.delete(`/habits/${id}`);
  } catch {
    /* swallow — we still remove locally */
  }
  const all = localRead().filter(h => h._id !== id);
  localWrite(all);
}
