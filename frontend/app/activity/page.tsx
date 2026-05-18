'use client';
import { useState, useEffect } from 'react';
import AppShell from '../components/AppShell';
import { api } from '../../lib/api';
import { t } from '../../lib/i18n';

export default function ActivityPage() {
  const [activity, setActivity] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getActivity().catch(() => []),
      api.getActivitySummary().catch(() => null),
    ]).then(([acts, sum]) => {
      setActivity(Array.isArray(acts) ? acts : []);
      setSummary(sum);
      setLoading(false);
    });
  }, []);

  return (
    <AppShell>
      <div className="page-header">
        <h1 className="page-title">{t('act.title')}</h1>
        <p className="page-subtitle">{t('act.subtitle')}</p>
      </div>

      {summary && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon purple">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
            </div>
            <div>
              <div className="stat-value">{summary.total ?? 0}</div>
              <div className="stat-label">{t('act.total')}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon yellow">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            </div>
            <div>
              <div className="stat-value">{summary.warnings ?? 0}</div>
              <div className="stat-label">{t('act.warnings')}</div>
            </div>
          </div>
          {summary.by_module && Object.entries(summary.by_module).map(([mod, count]: [string, any]) => (
            <div key={mod} className="stat-card">
              <div className="stat-icon green">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <div>
                <div className="stat-value">{count}</div>
                <div className="stat-label" style={{ textTransform: 'capitalize' }}>{mod.replace('_', ' ')}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">{t('act.all')}</h3>
        </div>
        {loading ? (
          <div className="loading-container"><div className="spinner" /></div>
        ) : activity.length === 0 ? (
          <div className="empty-state"><p>{t('act.no_activity')}</p></div>
        ) : (
          <div className="activity-list">
            {activity.map((item, i) => (
              <div key={i} className="activity-item">
                <div className="activity-dot" style={{
                  background: item.status === 'failed' ? 'var(--error)' :
                    item.status === 'success' ? 'var(--success)' :
                    item.status === 'warning' ? 'var(--warning)' : 'var(--accent)'
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span className="activity-text">{item.detail || item.action || 'Event'}</span>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{item.module} / {item.action}</div>
                </div>
                <span className="activity-time">
                  {item.created_at ? new Date(item.created_at).toLocaleString() : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
