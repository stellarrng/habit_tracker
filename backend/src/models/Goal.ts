import mongoose, { Schema, Document } from 'mongoose';

export type GoalTargetType = 'Streak' | 'Total Completions';

export interface IGoal extends Document {
  userId:      mongoose.Types.ObjectId;
  habitId:     mongoose.Types.ObjectId;
  targetType:  GoalTargetType;
  targetValue: number;
}

const GoalSchema = new Schema<IGoal>({
  userId:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
  habitId:     { type: Schema.Types.ObjectId, ref: 'Habit', required: true, unique: true },
  targetType:  { type: String, enum: ['Streak','Total Completions'], required: true },
  targetValue: { type: Number, required: true, min: 1 },
});

export default mongoose.model<IGoal>('Goal', GoalSchema);