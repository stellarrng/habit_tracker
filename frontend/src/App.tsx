import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { HabitProvider } from './context/HabitContext';
import { CheckInProvider } from './context/CheckInContext';
import { GoalProvider } from './context/GoalContext';
import { UserProvider } from './context/UserContext';
import { SettingsProvider } from './context/SettingsContext';
import ProtectedRoute from './components/shared/ProtectedRoute';

import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import HabitsPage from './pages/Habits/HabitsPage';
import GoalsPage from './pages/Goals/GoalsPage';
import TodayPage from './pages/Today/TodayPage';
import HabitDetailPage from './pages/HabitDetail/HabitDetailPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <UserProvider>
        <HabitProvider>
          <CheckInProvider>
          <GoalProvider>
          <SettingsProvider>
            <Routes>
              {/* Public */}
              <Route path="/login"    element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Protected */}
              <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              {/* <Route path="/habits"    element={<ProtectedRoute><HabitsPage /></ProtectedRoute>} /> */}
              <Route path="/habits"    element={<HabitsPage />} />
              <Route path="/habits/:id" element={<HabitDetailPage />} />
              <Route path="/goals"     element={<ProtectedRoute><GoalsPage /></ProtectedRoute>} />
              <Route path="/today"     element={<ProtectedRoute><TodayPage /></ProtectedRoute>} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/habits" replace />} />
            </Routes>
          </SettingsProvider>
          </GoalProvider>
          </CheckInProvider>
        </HabitProvider>
        </UserProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
