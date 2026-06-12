import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import connectDB from '../config/db';
import User from '../models/User';
import Habit from '../models/Habit';
import CheckIn from '../models/CheckIn';
import Goal from '../models/Goal';
import type { WeekDay } from '../models/Habit';
import type { CheckInStatus } from '../models/CheckIn';

// Sun=0 … Sat=6, matching Date.getUTCDay()
const UTC_DAY_NAMES: WeekDay[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function pastDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - (n - 1 - i));
    return toDateStr(d);
  });
}

function utcDayName(dateStr: string): WeekDay {
  return UTC_DAY_NAMES[new Date(dateStr).getUTCDay()];
}

async function seed(): Promise<void> {
  await connectDB();

  await Promise.all([
    User.deleteMany({}),
    Habit.deleteMany({}),
    CheckIn.deleteMany({}),
    Goal.deleteMany({}),
  ]);
  console.log('Collections cleared');

  // ── User ──────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('password123', 10);
  const user = await User.create({ name: 'Test User', email: 'test@example.com', passwordHash });
  console.log(`User created: ${user.email}`);

  // ── Habits ────────────────────────────────────────────────────────────────
  const habitsData = [
    {
      name: 'Morning Run',
      category: 'Health',
      frequency: 'Daily',
      specificDays: [] as WeekDay[],
      targetPerDay: 1,
      priority: 'High',
      status: 'Active',
    },
    {
      name: 'Read',
      category: 'Study',
      frequency: 'Daily',
      specificDays: [] as WeekDay[],
      targetPerDay: 1,
      priority: 'Medium',
      status: 'Active',
    },
    {
      name: 'Meditate',
      category: 'Mindfulness',
      frequency: 'Daily',
      specificDays: [] as WeekDay[],
      targetPerDay: 1,
      priority: 'Medium',
      status: 'Active',
    },
    {
      name: 'Push-ups',
      category: 'Health',
      frequency: 'Specific days',
      specificDays: ['Mon', 'Wed', 'Fri'] as WeekDay[],
      targetPerDay: 3,
      priority: 'High',
      status: 'Active',
    },
    {
      name: 'Journal',
      category: 'Mindfulness',
      frequency: 'Specific days',
      specificDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as WeekDay[],
      targetPerDay: 1,
      priority: 'Low',
      status: 'Active',
    },
  ];

  const habits = await Habit.insertMany(habitsData.map(h => ({ ...h, userId: user._id })));
  console.log(`${habits.length} habits created`);

  // ── Check-ins (past 14 days) ───────────────────────────────────────────────
  const dates = pastDays(14);
  const checkIns: object[] = [];

  for (const habit of habits) {
    const applicable =
      habit.frequency === 'Daily'
        ? dates
        : dates.filter(d => (habit.specificDays as WeekDay[]).includes(utcDayName(d)));

    for (const date of applicable) {
      const rand = Math.random();
      let status: CheckInStatus;
      let completedCount: number;

      if (rand < 0.75) {
        status = 'Completed';
        completedCount = habit.targetPerDay;
      } else if (rand < 0.9) {
        status = 'In Progress';
        completedCount = Math.max(1, habit.targetPerDay - 1);
      } else {
        status = 'Not Started';
        completedCount = 0;
      }

      checkIns.push({ userId: user._id, habitId: habit._id, date, completedCount, status, note: '' });
    }
  }

  await CheckIn.insertMany(checkIns);
  console.log(`${checkIns.length} check-ins created`);

  // ── Goals (one per habit) ─────────────────────────────────────────────────
  const goalsData = [
    { habitId: habits[0]._id, targetType: 'Streak',            targetValue: 7  },
    { habitId: habits[1]._id, targetType: 'Total Completions', targetValue: 20 },
    { habitId: habits[2]._id, targetType: 'Streak',            targetValue: 14 },
    { habitId: habits[3]._id, targetType: 'Total Completions', targetValue: 10 },
    { habitId: habits[4]._id, targetType: 'Streak',            targetValue: 5  },
  ];

  await Goal.insertMany(goalsData.map(g => ({ ...g, userId: user._id })));
  console.log(`${goalsData.length} goals created`);

  console.log('\nSeed complete!');
  console.log('Login: test@example.com / password123');

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
