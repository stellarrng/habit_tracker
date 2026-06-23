import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register as registerApi } from '../../api/auth';
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

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    <div className={styles.page}>
      {/* Left panel */}
      <div className={styles.panel}>
        <Logo />
        <div className={styles.panelContent}>
          <h2 className={styles.panelHeadline}>Your journey<br />starts today.</h2>
          <p className={styles.panelSub}>Join Habit Hackers and start building the habits that will define who you become.</p>
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
            <h1 className={styles.formTitle}>Create your account</h1>
            <p className={styles.formSub}>Free forever. No credit card needed.</p>
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
              <label className={styles.label} htmlFor="reg-name">Full name</label>
              <input id="reg-name" type="text" className={styles.input}
                placeholder="Alex Rivera" value={name}
                onChange={e => setName(e.target.value)} required />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="reg-email">Email address</label>
              <input id="reg-email" type="email" className={styles.input}
                placeholder="you@example.com" value={email}
                onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="reg-password">Password</label>
              <input id="reg-password" type="password" className={styles.input}
                placeholder="Min. 8 characters" value={password}
                onChange={e => setPassword(e.target.value)} required minLength={8} />
            </div>
            <button type="submit" id="register-submit" disabled={loading} className={styles.submitBtn}>
              {loading ? (
                <><span className={styles.btnSpinner} />Creating account…</>
              ) : 'Create account'}
            </button>
          </form>

          <p className={styles.footer}>
            Already have an account?{' '}
            <Link to="/login" className={styles.link}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}