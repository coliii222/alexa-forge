'use client';
import { useState, useEffect } from 'react';
import AppShell from '../components/AppShell';
import { api } from '../../lib/api';
import { t } from '../../lib/i18n';

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAnalyticsOverview().then(setOverview).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <div className="page-header">
        <h1 className="page-title">{t('analytics.title')}</h1>
        <p className="page-subtitle">{t('analytics.subtitle')}</p>
      </div>

      {loading ? (
        <div className="loading-container"><div className="spinner" /></div>
      ) : !overview ? (
        <div className="card">
          <div className="empty-state"><p>{t('analytics.no_data')}</p></div>
        </div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon purple">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
              </div>
              <div>
                <div className="stat-value">{overview.total_tasks ?? 0}</div>
                <div className="stat-label">{t('analytics.total_tasks')}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <div>
                <div className="stat-value">{overview.success_rate != null ? `${overview.success_rate}%` : '—'}</div>
                <div className="stat-label">{t('analytics.success_rate')}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon yellow">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <div>
                <div className="stat-value">{overview.completed ?? 0}</div>
                <div className="stat-label">{t('analytics.completed')}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon red">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </div>
              <div>
                <div className="stat-value">{overview.failed ?? 0}</div>
                <div className="stat-label">{t('analytics.failed')}</div>
              </div>
            </div>
          </div>

          <div className="grid-2">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">{t('analytics.by_provider')}</h3>
              </div>
              {overview.by_provider && overview.by_provider.length > 0 ? (
                <div className="activity-list">
                  {overview.by_provider.map((item: any) => (
                    <div key={item.provider} className="activity-item">
                      <div className="activity-dot" style={{ background: 'var(--accent)' }} />
                      <span className="activity-text" style={{ textTransform: 'capitalize' }}>{item.provider}</span>
                      <span className="badge badge-info">{item.count} {t('analytics.total')} / {item.success} {t('analytics.success')}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state"><p>{t('analytics.no_provider')}</p></div>
              )}
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title">{t('analytics.daily')}</h3>
              </div>
              {overview.daily_7d && overview.daily_7d.length > 0 ? (
                <div className="activity-list">
                  {overview.daily_7d.map((item: any) => (
                    <div key={item.day} className="activity-item">
                      <div className="activity-dot" style={{ background: 'var(--success)' }} />
                      <span className="activity-text">{item.day}</span>
                      <span className="badge badge-info">{item.count} {t('analytics.tasks')}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state"><p>{t('analytics.no_daily')}</p></div>
              )}
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
