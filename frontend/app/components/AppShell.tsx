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
    { label: 'Billing', path: '/billing', icon: <CreditIcon /> },
    { label: t('nav.vault'), path: '/vault', icon: <KeyIcon /> },
    { label: t('nav.activity'), path: '/activity', icon: <ActivityIcon /> },
    { label: t('nav.analytics'), path: '/analytics', icon: <AnalyticsIcon /> },
    { label: 'A/B', path: '/ab', icon: <ExperimentIcon /> },
    { label: 'Calendar', path: '/calendar', icon: <CalendarIcon /> },
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
          <ForgeMark className="sidebar-logo forge-mark" />
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

// Inline SVG Icons — custom 24px outline set, one semantic mark per destination
function IconShell({ children }: { children: React.ReactNode }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
}

function ForgeMark({ className = '' }: { className?: string }) {
  return (
    <div className={className} aria-label="Alexa Forge mark">
      <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path className="forge-mark-plate" d="M7 10.5h18l-2.7 6.8c-.4 1-1.3 1.7-2.4 1.7h-7.8c-1.1 0-2-.7-2.4-1.7L7 10.5Z" />
        <path className="forge-mark-spark" d="M16 3.5l1.5 4.1 4.1 1.5-4.1 1.5L16 14.7l-1.5-4.1-4.1-1.5 4.1-1.5L16 3.5Z" />
        <path className="forge-mark-base" d="M10 23h12M13 19v4M19 19v4" />
      </svg>
    </div>
  );
}

function DashboardIcon() {
  return <IconShell><path d="M4 13.5 12 5l8 8.5" /><path d="M6.5 12v7.5h11V12" /><path d="M10 19.5V15h4v4.5" /></IconShell>;
}

function VideoIcon() {
  return <IconShell><rect x="4" y="5" width="13" height="14" rx="2" /><path d="m17 10 4-2.5v9L17 14" /><path d="M8 9h5M8 13h3" /></IconShell>;
}

function CampaignIcon() {
  return <IconShell><path d="M4 15V9l10-4v14L4 15Z" /><path d="M14 8h3.5a2.5 2.5 0 0 1 0 5H14" /><path d="M6 15l1.5 5h3L9 16" /></IconShell>;
}

function KeyIcon() {
  return <IconShell><circle cx="8" cy="15" r="4" /><path d="m11 12 8-8" /><path d="m16 7 2 2" /><path d="m14 9 2 2" /></IconShell>;
}

function ActivityIcon() {
  return <IconShell><path d="M4 12h3l2.2-6 5.1 12 2.2-6H20" /><path d="M4 19h16" /></IconShell>;
}

function CreditIcon() {
  return <IconShell><path d="M5 8.5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z" /><path d="M7 8.5V6.8A2.8 2.8 0 0 1 9.8 4h4.4A2.8 2.8 0 0 1 17 6.8v1.7" /><path d="M7 14h5" /><path d="M17 14h.01" /></IconShell>;
}

function AnalyticsIcon() {
  return <IconShell><path d="M4 19V5" /><path d="M4 19h16" /><path d="m7 15 3.5-4.5 3.2 2.2L19 6" /><path d="M7 15h3.5v4" /><path d="M13.7 12.7V19" /><path d="M19 6v13" /></IconShell>;
}

function ExperimentIcon() {
  return <IconShell><path d="M8 3h8" /><path d="M10 3v5.5l-4.4 7.8A3.1 3.1 0 0 0 8.3 21h7.4a3.1 3.1 0 0 0 2.7-4.7L14 8.5V3" /><path d="M8 15h8" /><path d="M10 18h4" /></IconShell>;
}

function CalendarIcon() {
  return <IconShell><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M8 3v4" /><path d="M16 3v4" /><path d="M4 10h16" /><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" /></IconShell>;
}

function ChartIcon() {
  return <AnalyticsIcon />;
}

function ShieldIcon() {
  return <IconShell><path d="M12 22s7-3.6 7-9.2V5.5L12 3 5 5.5v7.3C5 18.4 12 22 12 22Z" /><path d="m9 12 2 2 4-4" /></IconShell>;
}

function SettingsIcon() {
  return <IconShell><circle cx="12" cy="12" r="3" /><path d="M12 2.5v3M12 18.5v3M4.7 4.7l2.1 2.1M17.2 17.2l2.1 2.1M2.5 12h3M18.5 12h3M4.7 19.3l2.1-2.1M17.2 6.8l2.1-2.1" /></IconShell>;
}

function AssetIcon() {
  return <IconShell><rect x="4" y="5" width="16" height="14" rx="2" /><path d="m4 15 4-4 4 4 3-3 5 5" /><circle cx="15" cy="9" r="1.2" /></IconShell>;
}

function HistoryIcon() {
  return <IconShell><path d="M5 8a8 8 0 1 1 .8 9" /><path d="M5 8V3" /><path d="M5 8h5" /><path d="M12 8v5l3 2" /></IconShell>;
}
