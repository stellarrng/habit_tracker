// ─── Enums (kept in sync with backend models) ────────────────────────────────

export type HabitCategory  = 'Health' | 'Study' | 'Work' | 'Mindfulness' | 'Other';
export type HabitFrequency = 'Daily' | 'Specific days';
export type HabitPriority  = 'Low' | 'Medium' | 'High';
export type HabitStatus    = 'Active' | 'Paused' | 'Archived';
export type WeekDay        = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
export type CheckInStatus  = 'Not Started' | 'In Progress' | 'Completed';
export type GoalTargetType = 'Streak' | 'Total Completions';

// ─── Core models (as returned by the API — ObjectIds serialised as strings) ──

export interface User {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface Habit {
  _id: string;
  userId: string;
  name: string;
  category: HabitCategory;
  frequency: HabitFrequency;
  specificDays: WeekDay[];
  targetPerDay: number;
  priority: HabitPriority;
  status: HabitStatus;
  goalTargetType?: GoalTargetType | null;
  goalTargetValue?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CheckIn {
  _id: string;
  userId: string;
  habitId: string;
  date: string;           // "YYYY-MM-DD"
  completedCount: number;
  status: CheckInStatus;
  note: string;
}

export interface Goal {
  _id: string;
  userId: string;
  habitId: string;
  targetType: GoalTargetType;
  targetValue: number;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthResponse {
  token: string;
  user: User;
}

// ─── Input types (forms / API request bodies) ────────────────────────────────

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface CreateHabitInput {
  name: string;
  category: HabitCategory;
  frequency: HabitFrequency;
  specificDays?: WeekDay[];
  targetPerDay: number;
  priority?: HabitPriority;
  goalTargetType?: GoalTargetType | null;
  goalTargetValue?: number | null;
}

export type UpdateHabitInput = Partial<CreateHabitInput> & { status?: HabitStatus };

export interface CreateCheckInInput {
  habitId: string;
  date: string;
  completedCount: number;
  note?: string;
}

export interface UpdateCheckInInput {
  completedCount?: number;
  note?: string;
}

export interface CreateGoalInput {
  habitId: string;
  targetType: GoalTargetType;
  targetValue: number;
}
