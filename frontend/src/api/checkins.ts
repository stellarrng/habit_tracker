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

export async function deleteCheckIn(id: string): Promise<{ message: string }> {
  const res = await api.delete<{ message: string }>(`/checkins/${id}`);
  return res.data;
}
