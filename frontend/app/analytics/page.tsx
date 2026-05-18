'use client';
import { useState, useEffect } from 'react';
import AppShell from '../components/AppShell';
import { api } from '../../lib/api';

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAnalyticsOverview().then(setOverview).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <div className="page-header">
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">Insights and metrics for your video generation pipeline</p>
      </div>

      {loading ? (
        <div className="loading-container"><div className="spinner" /></div>
      ) : !overview ? (
        <div className="card">
          <div className="empty-state"><p>No analytics data available yet</p></div>
        </div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon purple">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
              </div>
              <div>
                <div className="stat-value">{overview.total_generations ?? 0}</div>
                <div className="stat-label">Total Generations</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <div>
                <div className="stat-value">{overview.success_rate ? `${Math.round(overview.success_rate * 100)}%` : '—'}</div>
                <div className="stat-label">Success Rate</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon yellow">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              </div>
              <div>
                <div className="stat-value">{overview.avg_duration ? `${Math.round(overview.avg_duration)}s` : '—'}</div>
                <div className="stat-label">Avg Duration</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon red">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
              </div>
              <div>
                <div className="stat-value">{overview.total_cost ? `$${overview.total_cost.toFixed(2)}` : '—'}</div>
                <div className="stat-label">Total Cost</div>
              </div>
            </div>
          </div>

          <div className="grid-2">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">By Provider</h3>
              </div>
              {overview.by_provider ? (
                <div className="activity-list">
                  {Object.entries(overview.by_provider).map(([provider, count]: [string, any]) => (
                    <div key={provider} className="activity-item">
                      <div className="activity-dot" style={{ background: 'var(--accent)' }} />
                      <span className="activity-text" style={{ textTransform: 'capitalize' }}>{provider}</span>
                      <span className="badge badge-info">{count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state"><p>No provider data</p></div>
              )}
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title">By Status</h3>
              </div>
              {overview.by_status ? (
                <div className="activity-list">
                  {Object.entries(overview.by_status).map(([status, count]: [string, any]) => (
                    <div key={status} className="activity-item">
                      <div className="activity-dot" style={{
                        background: status === 'completed' ? 'var(--success)' :
                          status === 'failed' ? 'var(--error)' : 'var(--warning)'
                      }} />
                      <span className="activity-text" style={{ textTransform: 'capitalize' }}>{status}</span>
                      <span className={`badge ${status === 'completed' ? 'badge-success' : status === 'failed' ? 'badge-error' : 'badge-warning'}`}>{count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state"><p>No status data</p></div>
              )}
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
