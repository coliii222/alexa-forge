'use client';
import { useEffect, useState } from 'react';
import AppShell from '../components/AppShell';
import { api } from '../../lib/api';

export default function ABPage() {
  const [data, setData] = useState<any>({ items: [], winner: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getABAnalytics().then(setData).finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <div className="page-header">
        <h1 className="page-title">A/B Analytics</h1>
        <p className="page-subtitle">Track which variants users select, download, and click.</p>
      </div>

      {data.winner && (
        <div className="card" style={{ marginBottom: 18, borderColor: 'rgba(34,197,94,0.35)' }}>
          <div style={{ fontSize: 12, color: 'var(--success)', fontWeight: 700, marginBottom: 6 }}>Current Winner</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Task #{data.winner.id} · {data.winner.mode}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{data.winner.prompt?.slice(0, 140)}</div>
        </div>
      )}

      {loading ? <div style={{ color: 'var(--text-muted)' }}>Loading...</div> : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ color: 'var(--text-muted)', textAlign: 'left' }}>
                <th style={{ padding: 10 }}>Task</th><th>Mode</th><th>Status</th><th>Views</th><th>Downloads</th><th>Selected</th><th>Clicks</th><th>CTR</th><th>Score</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((it: any) => (
                <tr key={it.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: 10 }}>#{it.id}</td>
                  <td>{it.mode}</td>
                  <td><span className="badge">{it.status}</span></td>
                  <td>{it.views}</td>
                  <td>{it.downloads}</td>
                  <td>{it.selected}</td>
                  <td>{it.clicks}</td>
                  <td>{it.ctr}%</td>
                  <td style={{ fontWeight: 800, color: 'var(--accent)' }}>{it.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.items.length === 0 && <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>No analytics yet. Favorite or download variants from History to create signals.</div>}
        </div>
      )}
    </AppShell>
  );
}
