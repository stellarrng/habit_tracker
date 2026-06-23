import api from './axiosInstance';
import { Goal, CreateGoalInput } from '../types';

// GET /api/goals
export const getGoals = async (): Promise<Goal[]> => {
  const res = await api.get<Goal[]>('/goals');
  return res.data;
};

// GET /api/goals/:habitId
export const getGoalByHabit = async (habitId: string): Promise<Goal> => {
  const res = await api.get<Goal>(`/goals/${habitId}`);
  return res.data;
};

// POST /api/goals
export const createGoal = async (data: CreateGoalInput): Promise<Goal> => {
  const res = await api.post<Goal>('/goals', data);
  return res.data;
};

// PUT /api/goals/:id
export const updateGoal = async (id: string, data: Partial<Pick<CreateGoalInput, 'targetType' | 'targetValue'>>): Promise<Goal> => {
  const res = await api.put<Goal>(`/goals/${id}`, data);
  return res.data;
};

// DELETE /api/goals/:id
export const deleteGoal = async (id: string): Promise<void> => {
  await api.delete(`/goals/${id}`);
};