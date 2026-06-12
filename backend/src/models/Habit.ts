import mongoose, { Schema, Document } from 'mongoose';

export type HabitCategory = 'Health' | 'Study' | 'Work' | 'Mindfulness' | 'Other';
export type HabitFrequency = 'Daily' | 'Specific days';
export type HabitPriority  = 'Low' | 'Medium' | 'High';
export type HabitStatus    = 'Active' | 'Paused' | 'Archived';
export type WeekDay        = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export interface IHabit extends Document {
  userId:       mongoose.Types.ObjectId;
  name:         string;
  category:     HabitCategory;
  frequency:    HabitFrequency;
  specificDays: WeekDay[];       // only used when frequency = 'Specific days'
  targetPerDay: number;
  priority:     HabitPriority;
  status:       HabitStatus;
  goalTargetType?: string;
  goalTargetValue?: number;
  createdAt:    Date;
}

const HabitSchema = new Schema<IHabit>({
  userId:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name:         { type: String, required: true, trim: true },
  category:     { type: String, enum: ['Health','Study','Work','Mindfulness','Other'], required: true },
  frequency:    { type: String, enum: ['Daily','Specific days'], required: true },
  specificDays: { type: [String], enum: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], default: [] },
  targetPerDay: { type: Number, required: true, min: 1 },
  priority:     { type: String, enum: ['Low','Medium','High'], default: 'Medium' },
  status:       { type: String, enum: ['Active','Paused','Archived'], default: 'Active' },
  goalTargetType:  { type: String, enum: ['Streak', 'Total Completions'] },
  goalTargetValue: { type: Number, min: 1 },
}, { timestamps: true });

export default mongoose.model<IHabit>('Habit', HabitSchema);