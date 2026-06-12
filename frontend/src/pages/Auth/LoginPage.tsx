import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login as loginApi } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { user, token } = await loginApi({ email, password });
      login(user, token);
      navigate('/habits');
    } catch {
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Brand */}
        <div style={styles.brand}>
          <div style={styles.brandName}>HabitFlow</div>
          <div style={styles.brandSub}>Build better habits, every day</div>
        </div>

        <h1 style={styles.title}>Welcome back</h1>
        <p style={styles.subtitle}>Sign in to continue your streak</p>

        {error && (
          <div role="alert" style={{ ...styles.errorBox, display: 'flex', alignItems: 'center' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form} noValidate>
          <div style={styles.field}>
            <label style={styles.label} htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              style={styles.input}
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label} htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              style={styles.input}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            id="login-submit"
            disabled={loading}
            style={{ ...styles.submitBtn, opacity: loading ? .6 : 1 }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p style={styles.footer}>
          No account?{' '}
          <Link to="/register" style={styles.link}>Create one free</Link>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #EEF2FF 0%, #F8F9FA 60%, #E7EBFF 100%)',
    padding: 20,
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  card: {
    background: '#fff',
    borderRadius: 20,
    padding: '40px 36px',
    width: '100%',
    maxWidth: 420,
    boxShadow: '0 12px 40px rgba(59,91,219,.12), 0 2px 8px rgba(0,0,0,.06)',
    border: '1px solid #E9ECEF',
  },
  brand: { textAlign: 'center', marginBottom: 28 },
  brandName: { fontSize: 26, fontWeight: 800, color: '#3B5BDB', letterSpacing: -.5 },
  brandSub:  { fontSize: 13, color: '#9EA6B5', marginTop: 4 },
  title:    { fontSize: 22, fontWeight: 700, marginBottom: 6, color: '#1A1D23' },
  subtitle: { fontSize: 14, color: '#5C6370', marginBottom: 24 },
  errorBox: {
    background: '#FFE3E3', border: '1px solid #FFBEBE',
    borderRadius: 8, padding: '10px 14px',
    fontSize: 13, color: '#C92A2A', fontWeight: 500,
    marginBottom: 18,
  },
  form:  { display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: '#1A1D23' },
  input: {
    padding: '10px 13px',
    border: '1.5px solid #E9ECEF',
    borderRadius: 10,
    fontSize: 14,
    color: '#1A1D23',
    background: '#F8F9FA',
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color .15s',
  },
  submitBtn: {
    background: '#3B5BDB',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '12px',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 6,
    boxShadow: '0 2px 8px rgba(59,91,219,.30)',
    fontFamily: 'inherit',
    transition: 'all .15s',
  },
  footer: { textAlign: 'center', marginTop: 20, fontSize: 13, color: '#5C6370' },
  link:   { color: '#3B5BDB', fontWeight: 600, textDecoration: 'none' },
};
