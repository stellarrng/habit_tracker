import AppLayout from '../../components/layout/AppLayout';
import { useState } from 'react';
import HabitForm from '../../components/habits/HabitForm';

export default function DashboardPage() {
  const [showForm, setShowForm] = useState(false);

  return (
    <AppLayout onNewHabit={() => setShowForm(true)}>
      <div style={{ padding: '32px 28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>Dashboard & Statistics</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Track your progress and insights here. (Coming soon)</p>
      </div>
      {showForm && (
        <HabitForm
          editingHabit={null}
          onClose={() => setShowForm(false)}
        />
      )}
    </AppLayout>
  );
}
