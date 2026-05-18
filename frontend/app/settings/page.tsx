'use client';
import { useState, useEffect } from 'react';
import AppShell from '../components/AppShell';
import { t, getLocale, setLocale, Locale } from '../../lib/i18n';

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [theme, setTheme] = useState('dark');
  const [notifications, setNotifications] = useState(true);
  const [currentLocale, setCurrentLocale] = useState<Locale>('en');

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
    setCurrentLocale(getLocale());
  }, []);

  const handleLocaleChange = (locale: Locale) => {
    setLocale(locale);
  };

  return (
    <AppShell>
      <div className="page-header">
        <h1 className="page-title">{t('settings.title')}</h1>
        <p className="page-subtitle">{t('settings.subtitle')}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Logo Direction Review</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                Pick one visual route for Alexa Forge. These are custom marks, not final locked assets yet.
              </p>
            </div>
          </div>
          <div className="brand-option-grid">
            <LogoOption kind="anvil" title="Anvil Spark" desc="Forge/workshop identity. Strongest fit for creator tooling and production power." />
            <LogoOption kind="aperture" title="Aperture Forge" desc="Creative lens identity. Better if Alexa Forge leans image/video studio first." />
            <LogoOption kind="seal" title="Forge Seal" desc="Premium stamp identity. Best if we want a badge-like SaaS brand mark." />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Profile</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), #ff7a1a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: 'white' }}>
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{user?.username || 'User'}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{user?.email || 'No email set'}</div>
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">{t('auth.username')}</label>
              <input type="text" className="form-input" value={user?.username || ''} disabled />
            </div>
            <div className="form-group">
              <label className="form-label">{t('auth.email')}</label>
              <input type="email" className="form-input" value={user?.email || ''} disabled />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <input type="text" className="form-input" value={user?.role || 'user'} disabled />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Preferences</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{t('settings.language')}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{t('settings.language_desc')}</div>
              </div>
              <select className="form-select" style={{ width: 'auto' }} value={currentLocale} onChange={(e) => handleLocaleChange(e.target.value as Locale)}>
                <option value="en">English</option>
                <option value="id">Bahasa Indonesia</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Theme</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Choose your preferred appearance</div>
              </div>
              <select className="form-select" style={{ width: 'auto' }} value={theme} onChange={(e) => setTheme(e.target.value)}>
                <option value="dark">Dark</option>
                <option value="light" disabled>Light (coming soon)</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Notifications</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Receive notifications for completed tasks</div>
              </div>
              <div className={`toggle ${notifications ? 'active' : ''}`} onClick={() => setNotifications(!notifications)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>API URL</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Backend API endpoint</div>
              </div>
              <code style={{ fontSize: 12, color: 'var(--accent)', background: 'var(--bg-tertiary)', padding: '4px 10px', borderRadius: 'var(--radius-sm)' }}>
                {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}
              </code>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Danger Zone</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--error)' }}>{t('nav.logout')}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Sign out of your account on this device</div>
            </div>
            <button className="btn btn-danger" onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.href = '/login'; }}>
              {t('nav.logout')}
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}


function LogoOption({ kind, title, desc }: { kind: 'anvil' | 'aperture' | 'seal'; title: string; desc: string }) {
  return (
    <div className="brand-option-card">
      <div className={`brand-mark-preview brand-mark-${kind}`}>
        <BrandVariant kind={kind} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>{title}</div>
      <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--text-secondary)', margin: 0 }}>{desc}</p>
    </div>
  );
}

function BrandVariant({ kind }: { kind: 'anvil' | 'aperture' | 'seal' }) {
  if (kind === 'aperture') {
    return (
      <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <circle cx="24" cy="24" r="17" stroke="currentColor" strokeWidth="3" />
        <path d="M24 7l7 12H17L24 7Z" fill="currentColor" opacity="0.95" />
        <path d="M41 24l-12 7V17l12 7Z" fill="currentColor" opacity="0.78" />
        <path d="M24 41l-7-12h14L24 41Z" fill="currentColor" opacity="0.62" />
        <circle cx="24" cy="24" r="5" fill="var(--cyan)" />
      </svg>
    );
  }
  if (kind === 'seal') {
    return (
      <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path d="M24 5 37.5 10.5 43 24 37.5 37.5 24 43 10.5 37.5 5 24 10.5 10.5 24 5Z" stroke="currentColor" strokeWidth="3" />
        <path d="M15 27h18l-3 7H18l-3-7Z" fill="currentColor" />
        <path d="M24 11l1.8 5 5 1.8-5 1.8-1.8 5-1.8-5-5-1.8 5-1.8 1.8-5Z" fill="var(--cyan)" />
        <path d="M17 34h14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M11 18h26l-4.2 10.2A4.5 4.5 0 0 1 28.6 31h-9.2a4.5 4.5 0 0 1-4.2-2.8L11 18Z" fill="currentColor" />
      <path d="M24 5l2.4 6.4L33 14l-6.6 2.6L24 23l-2.4-6.4L15 14l6.6-2.6L24 5Z" fill="var(--cyan)" />
      <path d="M16 38h16M20 31v7M28 31v7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
