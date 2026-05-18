'use client';
import { useState } from 'react';
import { useAuth } from '../../lib/hooks';
import { useRouter } from 'next/navigation';
import { t } from '../../lib/i18n';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon forge-mark">
            <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" style={{ width: 26, height: 26 }}>
              <path className="forge-mark-plate" d="M7 10.5h18l-2.7 6.8c-.4 1-1.3 1.7-2.4 1.7h-7.8c-1.1 0-2-.7-2.4-1.7L7 10.5Z" />
              <path className="forge-mark-spark" d="M16 3.5l1.5 4.1 4.1 1.5-4.1 1.5L16 14.7l-1.5-4.1-4.1-1.5 4.1-1.5L16 3.5Z" />
              <path className="forge-mark-base" d="M10 23h12M13 19v4M19 19v4" />
            </svg>
          </div>
          <span className="auth-logo-text">Alexa Forge</span>
        </div>
        <h1 className="auth-title">{t('auth.welcome')}</h1>
        <p className="auth-subtitle">{t('auth.sign_in')}</p>
        {error && <div className="form-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t('auth.username')}</label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t('auth.password')}</label>
            <input
              type="password"
              className="form-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
            {loading ? '...' : t('auth.login')}
          </button>
        </form>
        <div className="auth-footer">
          {t('auth.no_account')} <a href="/register">{t('auth.create')}</a>
        </div>
      </div>
    </div>
  );
}
