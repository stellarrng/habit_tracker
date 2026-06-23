import api from './axiosInstance';
 
export async function resetAllUserData(): Promise<void> {
  await api.delete('/user/data');
}