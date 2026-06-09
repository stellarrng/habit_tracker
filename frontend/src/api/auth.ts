import api from './axiosInstance';
import { AuthResponse, LoginInput, RegisterInput } from '../types';

export const register = async (data: RegisterInput): Promise<AuthResponse> => {
  const res = await api.post<AuthResponse>('/auth/register', data);
  return res.data;
};

export const login = async (data: LoginInput): Promise<AuthResponse> => {
  const res = await api.post<AuthResponse>('/auth/login', data);
  return res.data;
};

export const getMe = async (): Promise<AuthResponse['user']> => {
  const res = await api.get<AuthResponse['user']>('/auth/me');
  return res.data;
};
