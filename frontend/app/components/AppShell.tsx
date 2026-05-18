'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { t, getLocale, setLocale } from '../../lib/i18n';
import { api } from '../../lib/api';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.push('/login');
      return;
    }
    const stored = localStorage.getItem('user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
    api.getCredits().then((data) => {
      if (data && typeof data.balance === 'number') setCredits(data.balance);
    }).catch(() => {});
  }, [router]);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const navItems = [
    { label: t('nav.dashboard'), path: '/dashboard', icon: <DashboardIcon /> },
    { label: t('nav.studio'), path: '/studio', icon: <VideoIcon /> },
    { label: t('nav.history'), path: '/history', icon: <HistoryIcon /> },
    { label: t('nav.campaigns'), path: '/campaigns', icon: <CampaignIcon /> },
    { label: t('nav.assets'), path: '/assets', icon: <AssetIcon /> },
    { label: 'Billing', path: '/billing', icon: <ChartIcon /> },
    { label: t('nav.vault'), path: '/vault', icon: <KeyIcon /> },
    { label: t('nav.activity'), path: '/activity', icon: <ActivityIcon /> },
    { label: t('nav.analytics'), path: '/analytics', icon: <ChartIcon /> },
    { label: 'A/B', path: '/ab', icon: <ChartIcon /> },
    { label: 'Calendar', path: '/calendar', icon: <HistoryIcon /> },
  ];

  const adminItems = [
    { label: t('nav.admin'), path: '/admin', icon: <ShieldIcon /> },
    { label: t('nav.settings'), path: '/settings', icon: <SettingsIcon /> },
  ];

  return (
    <div className="app-layout">
      <button className="mobile-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      <div className={`mobile-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <span className="sidebar-title">Alexa Forge</span>
          <button
            onClick={() => setLocale(getLocale() === 'en' ? 'id' : 'en')}
            style={{ marginLeft: 'auto', padding: '4px 8px', fontSize: 11, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 500 }}
            title={getLocale() === 'en' ? 'Switch to Bahasa Indonesia' : 'Switch to English'}
          >
            {getLocale() === 'en' ? 'ID' : 'EN'}
          </button>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-section-label">Main</div>
            {navItems.map((item) => (
              <button
                key={item.path}
                className={`nav-item ${pathname === item.path ? 'active' : ''}`}
                onClick={() => { router.push(item.path); setSidebarOpen(false); }}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
          <div className="nav-section">
            <div className="nav-section-label">System</div>
            {adminItems.map((item) => (
              <button
                key={item.path}
                className={`nav-item ${pathname === item.path ? 'active' : ''}`}
                onClick={() => { router.push(item.path); setSidebarOpen(false); }}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </nav>
        <div className="sidebar-footer">
          {credits !== null && (
            <div style={{
              padding: '8px 12px',
              marginBottom: 8,
              fontSize: 12,
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <span>⚡</span>
              <span>{credits} {t('credits.balance')}</span>
            </div>
          )}
          <div className="user-card" onClick={logout}>
            <div className="user-avatar">
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="user-info">
              <div className="user-name">{user?.username || 'User'}</div>
              <div className="user-role">{t('nav.logout')}</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </div>
        </div>
      </aside>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

// Inline SVG Icons
function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function CampaignIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68 1.65 1.65 0 0 0 9 3.17V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function AssetIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
