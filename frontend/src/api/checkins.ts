import api from './axiosInstance';
import { CheckIn, CreateCheckInInput } from '../types';

export async function getCheckIns(params?: { date?: string; habitId?: string }): Promise<CheckIn[]> {
  const res = await api.get<CheckIn[]>('/checkins', { params });
  return res.data;
}

export async function checkInHabit(input: CreateCheckInInput): Promise<CheckIn> {
  const res = await api.post<CheckIn>('/checkins', input);
  return res.data;
}

// GET /api/checkins?habitId=&date=
export const getCheckInsByDate = async (date: string, habitId?: string): Promise<CheckIn[]> => {
  const params: Record<string, string> = { date };
  if (habitId) params.habitId = habitId;
  const res = await api.get<CheckIn[]>('/checkins', { params });
  return res.data;
};

// POST /api/checkins — creates or updates (upsert) a check-in
export const upsertCheckIn = async (data: CreateCheckInInput): Promise<CheckIn> => {
  const res = await api.post<CheckIn>('/checkins', data);
  return res.data;
};

// DELETE /api/checkins/:id
export const deleteCheckIn = async (id: string): Promise<void> => {
  await api.delete(`/checkins/${id}`);
};
