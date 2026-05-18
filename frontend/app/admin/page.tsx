'use client';
import { useState, useEffect } from 'react';
import AppShell from '../components/AppShell';
import { api } from '../../lib/api';

export default function AdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('users');

  useEffect(() => {
    Promise.all([
      api.getUsers().catch(() => []),
      api.getUsersSummary().catch(() => null),
      api.getHealth().catch(() => null),
    ]).then(([u, s, h]) => {
      setUsers(Array.isArray(u) ? u : []);
      setSummary(s);
      setHealth(h);
      setLoading(false);
    });
  }, []);

  return (
    <AppShell>
      <div className="page-header">
        <h1 className="page-title">Admin</h1>
        <p className="page-subtitle">System administration and user management</p>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>Users</button>
        <button className={`tab ${tab === 'health' ? 'active' : ''}`} onClick={() => setTab('health')}>System Health</button>
      </div>

      {tab === 'users' && (
        <>
          {summary && (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon purple">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                </div>
                <div>
                  <div className="stat-value">{summary.total ?? 0}</div>
                  <div className="stat-label">Total Users</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon green">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
                <div>
                  <div className="stat-value">{summary.active ?? 0}</div>
                  <div className="stat-label">Active Users</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon yellow">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                </div>
                <div>
                  <div className="stat-value">{summary.new_today ?? 0}</div>
                  <div className="stat-label">New Today</div>
                </div>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">All Users</h3>
            </div>
            {loading ? (
              <div className="loading-container"><div className="spinner" /></div>
            ) : users.length === 0 ? (
              <div className="empty-state"><p>No users found</p></div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 500 }}>{user.username}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{user.email || '—'}</td>
                        <td><span className="badge badge-info">{user.role || 'user'}</span></td>
                        <td><span className={`badge ${user.active !== false ? 'badge-success' : 'badge-error'}`}>{user.active !== false ? 'Active' : 'Inactive'}</span></td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'health' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">System Health</h3>
          </div>
          {!health ? (
            <div className="empty-state"><p>Unable to fetch health data</p></div>
          ) : (
            <div className="activity-list">
              <div className="activity-item">
                <div className="activity-dot" style={{ background: health.status === 'healthy' ? 'var(--success)' : 'var(--error)' }} />
                <span className="activity-text">Overall Status</span>
                <span className={`badge ${health.status === 'healthy' ? 'badge-success' : 'badge-error'}`}>{health.status || 'unknown'}</span>
              </div>
              {health.database && (
                <div className="activity-item">
                  <div className="activity-dot" style={{ background: health.database === 'connected' ? 'var(--success)' : 'var(--error)' }} />
                  <span className="activity-text">Database</span>
                  <span className={`badge ${health.database === 'connected' ? 'badge-success' : 'badge-error'}`}>{health.database}</span>
                </div>
              )}
              {health.uptime && (
                <div className="activity-item">
                  <div className="activity-dot" style={{ background: 'var(--accent)' }} />
                  <span className="activity-text">Uptime</span>
                  <span className="badge badge-info">{health.uptime}</span>
                </div>
              )}
              {health.version && (
                <div className="activity-item">
                  <div className="activity-dot" style={{ background: 'var(--accent)' }} />
                  <span className="activity-text">Version</span>
                  <span className="badge badge-info">{health.version}</span>
                </div>
              )}
              {health.memory && (
                <div className="activity-item">
                  <div className="activity-dot" style={{ background: 'var(--warning)' }} />
                  <span className="activity-text">Memory Usage</span>
                  <span className="badge badge-warning">{health.memory}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
