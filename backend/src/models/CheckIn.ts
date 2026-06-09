import mongoose, { Schema, Document } from 'mongoose';

export type CheckInStatus = 'Not Started' | 'In Progress' | 'Completed';

export interface ICheckIn extends Document {
  userId:         mongoose.Types.ObjectId;
  habitId:        mongoose.Types.ObjectId;
  date:           string;   // "YYYY-MM-DD" stored as string — no timezone issues
  completedCount: number;
  status:         CheckInStatus;
  note:           string;   // optional reminder/note for the day (bonus feature)
}

const CheckInSchema = new Schema<ICheckIn>({
  userId:         { type: Schema.Types.ObjectId, ref: 'User', required: true },
  habitId:        { type: Schema.Types.ObjectId, ref: 'Habit', required: true },
  date:           { type: String, required: true },
  completedCount: { type: Number, required: true, min: 0, default: 0 },
  status:         { type: String, enum: ['Not Started','In Progress','Completed'], default: 'Not Started' },
  note:           { type: String, default: '' },
}, { timestamps: false });

CheckInSchema.index({ habitId: 1, date: 1 }, { unique: true });

export default mongoose.model<ICheckIn>('CheckIn', CheckInSchema);