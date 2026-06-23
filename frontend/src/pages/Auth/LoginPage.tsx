import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login as loginApi } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import styles from './AuthPage.module.css';

function Logo() {
  return (
    <div className={styles.logoMark}>
      <img src="/logo.png" alt="Habit Hackers logo" className={styles.logoImg} />
      <span className={styles.logoText}>Habit Hackers</span>
    </div>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    <div className={styles.page}>
      {/* Left panel */}
      <div className={styles.panel}>
        <Logo />
        <div className={styles.panelContent}>
          <h2 className={styles.panelHeadline}>Small habits,<br />big results.</h2>
          <p className={styles.panelSub}>Track your daily habits, build streaks, and watch your consistency turn into real progress.</p>
          <ul className={styles.featureList}>
            <li><span className={styles.featureDot} />Daily habit tracking with streaks</li>
            <li><span className={styles.featureDot} />Goal setting and progress alerts</li>
            <li><span className={styles.featureDot} />Beautiful statistics dashboard</li>
          </ul>
        </div>
        <div className={styles.panelFooter}>Wecamp Batch 11 · 2026</div>
      </div>

      {/* Right panel — form */}
      <div className={styles.formSide}>
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h1 className={styles.formTitle}>Welcome back</h1>
            <p className={styles.formSub}>Sign in to continue your streak</p>
          </div>

          {error && (
            <div role="alert" className={styles.errorBox}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="login-email">Email address</label>
              <input id="login-email" type="email" className={styles.input}
                placeholder="you@example.com" value={email}
                onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="login-password">Password</label>
              <input id="login-password" type="password" className={styles.input}
                placeholder="••••••••" value={password}
                onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            <button type="submit" id="login-submit" disabled={loading} className={styles.submitBtn}>
              {loading ? (
                <><span className={styles.btnSpinner} />Signing in…</>
              ) : 'Sign in'}
            </button>
          </form>

          <p className={styles.footer}>
            No account?{' '}
            <Link to="/register" className={styles.link}>Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}