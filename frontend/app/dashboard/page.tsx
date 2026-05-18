'use client';
import { useEffect, useState } from 'react';
import AppShell from '../components/AppShell';
import { api } from '../../lib/api';
import { t } from '../../lib/i18n';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    Promise.all([
      api.getAnalyticsOverview().catch(() => null),
      api.getActivity().catch(() => []),
    ]).then(([overview, acts]) => {
      setStats(overview);
      setActivity(Array.isArray(acts) ? acts.slice(0, 8) : []);
      setLoading(false);
    });
  }, []);

  return (
    <AppShell>
      <div className="page-header">
        <h1 className="page-title">{t('dash.title')}</h1>
        <p className="page-subtitle">{t('dash.subtitle')}</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon purple">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
          </div>
          <div>
            <div className="stat-value">{stats?.total_tasks ?? '—'}</div>
            <div className="stat-label">{t('dash.total_tasks')}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <div>
            <div className="stat-value">{stats?.completed ?? '—'}</div>
            <div className="stat-label">{t('dash.completed')}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
          </div>
          <div>
            <div className="stat-value">{stats?.success_rate != null ? `${stats.success_rate}%` : '—'}</div>
            <div className="stat-label">{t('dash.success_rate')}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
          </div>
          <div>
            <div className="stat-value">{stats?.failed ?? '—'}</div>
            <div className="stat-label">{t('dash.failed')}</div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">{t('dash.recent_activity')}</h3>
          </div>
          {loading ? (
            <div className="loading-container"><div className="spinner" /></div>
          ) : activity.length === 0 ? (
            <div className="empty-state"><p>{t('dash.no_activity')}</p></div>
          ) : (
            <div className="activity-list">
              {activity.map((item, i) => (
                <div key={i} className="activity-item">
                  <div className="activity-dot" style={{ background: item.status === 'failed' ? 'var(--error)' : item.status === 'success' ? 'var(--success)' : 'var(--accent)' }} />
                  <span className="activity-text">{item.detail || item.action || 'Activity'}</span>
                  <span className="activity-time">{item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">{t('dash.quick_actions')}</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <a href="/studio" className="btn btn-primary" style={{ textAlign: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
              {t('dash.generate_video')}
            </a>
            <a href="/vault" className="btn btn-secondary" style={{ textAlign: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" /></svg>
              {t('dash.manage_keys')}
            </a>
            <a href="/campaigns" className="btn btn-secondary" style={{ textAlign: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
              {t('dash.view_campaigns')}
            </a>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
