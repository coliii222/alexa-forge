'use client';
import { useState, useEffect } from 'react';
import AppShell from '../components/AppShell';

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [theme, setTheme] = useState('dark');
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
  }, []);

  return (
    <AppShell>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account and preferences</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Profile</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), #9d8cff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: 'white' }}>
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{user?.username || 'User'}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{user?.email || 'No email set'}</div>
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Username</label>
              <input type="text" className="form-input" value={user?.username || ''} disabled />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
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
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--error)' }}>Sign Out</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Sign out of your account on this device</div>
            </div>
            <button className="btn btn-danger" onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.href = '/login'; }}>
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
