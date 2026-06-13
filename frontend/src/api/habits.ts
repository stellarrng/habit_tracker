import api from './axiosInstance';
import { Habit, CreateHabitInput, UpdateHabitInput } from '../types';

export const getHabits = async (): Promise<Habit[]> => {
  const res = await api.get<Habit[]>('/habits');
  return res.data;
};

export const createHabit = async (data: CreateHabitInput): Promise<Habit> => {
  const res = await api.post<Habit>('/habits', data);
  return res.data;
};

export const updateHabit = async (id: string, data: UpdateHabitInput): Promise<Habit> => {
  const res = await api.put<Habit>(`/habits/${id}`, data);
  return res.data;
};

export const deleteHabit = async (id: string): Promise<void> => {
  await api.delete(`/habits/${id}`);
};
