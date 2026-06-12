import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register as registerApi } from '../api/auth';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Please enter your name.'); return; }
    setError('');
    setLoading(true);
    try {
      const { user, token } = await registerApi({ name, email, password });
      login(user, token);
      navigate('/habits');
    } catch {
      setError('Registration failed. That email may already be in use.');
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
          <div style={styles.brandSub}>Start building better habits today</div>
        </div>

        <h1 style={styles.title}>Create your account</h1>
        <p style={styles.subtitle}>Free forever. No credit card needed.</p>

        {error && (
          <div role="alert" style={{ ...styles.errorBox, display: 'flex', alignItems: 'center' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form} noValidate>
          <div style={styles.field}>
            <label style={styles.label} htmlFor="reg-name">Full name</label>
            <input
              id="reg-name" type="text" style={styles.input}
              placeholder="Alex Rivera"
              value={name} onChange={e => setName(e.target.value)} required
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label} htmlFor="reg-email">Email address</label>
            <input
              id="reg-email" type="email" style={styles.input}
              placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)} required
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label} htmlFor="reg-password">Password</label>
            <input
              id="reg-password" type="password" style={styles.input}
              placeholder="Min. 8 characters"
              value={password} onChange={e => setPassword(e.target.value)}
              required minLength={8}
            />
          </div>

          <button
            type="submit" id="register-submit" disabled={loading}
            style={{ ...styles.submitBtn, opacity: loading ? .6 : 1 }}
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p style={styles.footer}>
          Already have an account?{' '}
          <Link to="/login" style={styles.link}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg, #EEF2FF 0%, #F8F9FA 60%, #E7EBFF 100%)',
    padding: 20, fontFamily: "'Inter', system-ui, sans-serif",
  },
  card: {
    background: '#fff', borderRadius: 20, padding: '40px 36px',
    width: '100%', maxWidth: 420,
    boxShadow: '0 12px 40px rgba(59,91,219,.12), 0 2px 8px rgba(0,0,0,.06)',
    border: '1px solid #E9ECEF',
  },
  brand: { textAlign: 'center', marginBottom: 28 },
  brandName: { fontSize: 26, fontWeight: 800, color: '#3B5BDB', letterSpacing: -.5 },
  brandSub:  { fontSize: 13, color: '#9EA6B5', marginTop: 4 },
  title:    { fontSize: 22, fontWeight: 700, marginBottom: 6, color: '#1A1D23' },
  subtitle: { fontSize: 14, color: '#5C6370', marginBottom: 24 },
  errorBox: {
    background: '#FFE3E3', border: '1px solid #FFBEBE', borderRadius: 8,
    padding: '10px 14px', fontSize: 13, color: '#C92A2A', fontWeight: 500, marginBottom: 18,
  },
  form:  { display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: '#1A1D23' },
  input: {
    padding: '10px 13px', border: '1.5px solid #E9ECEF', borderRadius: 10,
    fontSize: 14, color: '#1A1D23', background: '#F8F9FA', outline: 'none',
    fontFamily: 'inherit',
  },
  submitBtn: {
    background: '#3B5BDB', color: '#fff', border: 'none', borderRadius: 10,
    padding: '12px', fontSize: 15, fontWeight: 600, cursor: 'pointer',
    marginTop: 6, boxShadow: '0 2px 8px rgba(59,91,219,.30)', fontFamily: 'inherit',
  },
  footer: { textAlign: 'center', marginTop: 20, fontSize: 13, color: '#5C6370' },
  link:   { color: '#3B5BDB', fontWeight: 600, textDecoration: 'none' },
};
