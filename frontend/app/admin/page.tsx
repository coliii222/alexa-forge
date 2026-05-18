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
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                </div>
                <div>
                  <div className="stat-value">{summary.total_users ?? 0}</div>
                  <div className="stat-label">Total Users</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon green">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
                <div>
                  <div className="stat-value">{summary.total_api_keys ?? 0}</div>
                  <div className="stat-label">API Keys</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon yellow">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                </div>
                <div>
                  <div className="stat-value">{summary.total_videos ?? 0}</div>
                  <div className="stat-label">Total Videos</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon red">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </div>
                <div>
                  <div className="stat-value">{summary.total_failed ?? 0}</div>
                  <div className="stat-label">Failed</div>
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
                      <th>Role</th>
                      <th>API Keys</th>
                      <th>Videos</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 500 }}>{user.username}</td>
                        <td><span className={`badge ${user.role === 'admin' ? 'badge-info' : 'badge-success'}`}>{user.role || 'user'}</span></td>
                        <td style={{ color: 'var(--text-muted)' }}>{user.stats?.api_keys ?? 0} ({user.stats?.active_api_keys ?? 0} active)</td>
                        <td style={{ color: 'var(--text-muted)' }}>{user.stats?.videos ?? 0} ({user.stats?.completed_videos ?? 0} done)</td>
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
              <div className="activity-item">
                <div className="activity-dot" style={{ background: 'var(--accent)' }} />
                <span className="activity-text">Database Size</span>
                <span className="badge badge-info">{health.db_size_mb ?? '?'} MB</span>
              </div>
              {health.tables && Object.entries(health.tables).map(([table, count]: [string, any]) => (
                <div key={table} className="activity-item">
                  <div className="activity-dot" style={{ background: 'var(--success)' }} />
                  <span className="activity-text">{table}</span>
                  <span className="badge badge-info">{count} rows</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
