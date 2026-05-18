'use client';
import { useState, useEffect } from 'react';
import AppShell from '../components/AppShell';
import { api } from '../../lib/api';
import { t } from '../../lib/i18n';

type Task = { id: number; mode: string; provider: string; status: string; prompt: string; image_url?: string; output_url?: string; created_at: string; finished_at?: string };

const STATUS_COLORS: Record<string, string> = {
  completed: 'var(--success)', running: 'var(--accent)', queued: '#f59e0b', failed: 'var(--error)',
};
const MODE_LABELS: Record<string, string> = {
  motion_transfer: 'Motion Transfer', product_promo: 'Product Promo', batch_variant: 'Batch Variants',
  template_scene: 'Template Scene', audio_sync: 'Audio Sync', style_transfer: 'Style Transfer', freeform: 'Freeform',
};

export default function HistoryPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getTasks().then(data => { setTasks(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? tasks : tasks.filter(s => s.status === filter);
  const counts = { all: tasks.length, completed: tasks.filter(t => t.status === 'completed').length, failed: tasks.filter(t => t.status === 'failed').length, running: tasks.filter(t => ['queued','running'].includes(t.status)).length };

  const formatDate = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const truncate = (s: string, n = 80) => s.length > n ? s.slice(0, n) + '…' : s;

  return (
    <AppShell>
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">{t('history.title')}</h1>
            <p className="page-subtitle">{t('history.subtitle')}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6" style={{ flexWrap: 'wrap' }}>
          {(['all','completed','failed','running'] as const).map(f => (
            <button key={f} className={`tab-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}>
              {t(`history.${f}`)} ({counts[f]})
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: 40, marginBottom: 16 }}>🎬</div>
            <p>{t('history.no_history')}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {filtered.map(task => (
              <div key={task.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Thumbnail */}
                <div style={{ height: 160, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  {task.output_url ? (
                    task.output_url.match(/\.(mp4|webm|mov)$/i) ? (
                      <video src={task.output_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <img src={task.output_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )
                  ) : (
                    <div style={{ fontSize: 40, opacity: 0.3 }}>
                      {task.mode === 'product_promo' ? '🛍' : task.mode === 'motion_transfer' ? '💃' : '🎬'}
                    </div>
                  )}
                  {/* Status badge */}
                  <div style={{
                    position: 'absolute', top: 10, right: 10,
                    background: STATUS_COLORS[task.status] || 'var(--border)',
                    color: 'white', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20,
                  }}>
                    {task.status.toUpperCase()}
                  </div>
                </div>

                {/* Info */}
                <div style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span className="badge">{MODE_LABELS[task.mode] || task.mode}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{task.provider}</span>
                  </div>
                  {task.prompt && (
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.5 }}>
                      {truncate(task.prompt)}
                    </p>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(task.created_at)}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {task.output_url && (
                        <a href={task.output_url} download className="btn btn-sm btn-primary">
                          {t('history.download')}
                        </a>
                      )}
                      <button className="btn btn-sm" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                        onClick={() => window.location.href = `/studio?mode=${task.mode}`}>
                        {t('history.regenerate')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}