'use client';
import { useEffect, useState } from 'react';
import AppShell from '../components/AppShell';
import { api } from '../../lib/api';

const PLATFORM_LABELS: Record<string, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram Reels',
  youtube_shorts: 'YouTube Shorts',
};

export default function CalendarPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [connectors, setConnectors] = useState<any[]>([]);
  const [taskId, setTaskId] = useState('');
  const [platform, setPlatform] = useState('tiktok');
  const [scheduledAt, setScheduledAt] = useState('');
  const [caption, setCaption] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState<string | null>(null);

  async function load() {
    const [t, p, c] = await Promise.all([api.getTasks(), api.getScheduled(), api.getConnectors()]);
    setTasks(t.filter((x: any) => x.status === 'completed'));
    setPosts(p);
    setConnectors(c);
  }

  useEffect(() => { load().catch(() => {}); }, []);

  async function createPost() {
    setError(''); setMessage(''); setPreview(null);
    try {
      await api.createScheduled({ task_id: Number(taskId), platform, scheduled_at: scheduledAt, caption });
      setTaskId(''); setScheduledAt(''); setCaption('');
      setMessage('Post scheduled. It will stay safe until live posting is explicitly enabled later.');
      await load();
    } catch (e: any) { setError(e.message || 'Failed'); }
  }

  async function remove(id: number) {
    await api.deleteScheduled(id).catch(() => {});
    await load();
  }

  async function markConnectorReady(platform: string) {
    setLoading(platform); setError(''); setMessage('');
    try {
      await api.saveConnector(platform, { status: 'ready', mode: 'dry_run', config: { note: 'Dry-run connector. No public posting.' } });
      setMessage(`${PLATFORM_LABELS[platform] || platform} connector marked ready in dry-run mode.`);
      await load();
    } catch (e: any) { setError(e.message || 'Failed to save connector'); }
    finally { setLoading(null); }
  }

  async function showPreview(id: number) {
    setLoading(`preview-${id}`); setError(''); setMessage('');
    try { setPreview(await api.previewScheduled(id)); }
    catch (e: any) { setError(e.message || 'Preview failed'); }
    finally { setLoading(null); }
  }

  async function dryRunPost(id: number) {
    setLoading(`post-${id}`); setError(''); setMessage('');
    try {
      const result = await api.postScheduledNow(id, true);
      setPreview(result);
      setMessage(`Dry-run ready for ${PLATFORM_LABELS[result.platform] || result.platform}. No public post sent.`);
    } catch (e: any) { setError(e.message || 'Dry-run failed'); }
    finally { setLoading(null); }
  }

  async function processDue() {
    setLoading('due'); setError(''); setMessage(''); setPreview(null);
    try {
      const result = await api.processDueScheduled(true);
      setPreview(result);
      setMessage(`Dry-run processed ${result.processed?.length || 0} due scheduled posts. No public posts sent.`);
    } catch (e: any) { setError(e.message || 'Process due failed'); }
    finally { setLoading(null); }
  }

  return (
    <AppShell>
      <div className="page-header">
        <h1 className="page-title">Content Calendar</h1>
        <p className="page-subtitle">Schedule generated videos and validate platform-ready payloads in safe dry-run mode.</p>
      </div>

      {error && <div className="card" style={{ marginBottom: 16, borderColor: 'var(--error)' }}><p style={{ color: 'var(--error)' }}>{error}</p></div>}
      {message && <div className="card" style={{ marginBottom: 16, borderColor: 'var(--success)' }}><p style={{ color: 'var(--success)' }}>{message}</p></div>}

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-header"><h3 className="card-title">Connector Readiness</h3></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
          {connectors.map(conn => (
            <div key={conn.platform} style={{ padding: 14, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
              <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{PLATFORM_LABELS[conn.platform] || conn.platform}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>status: {conn.status} • mode: {conn.mode}</div>
              <button className="btn btn-secondary" style={{ marginTop: 10, width: '100%' }} disabled={loading === conn.platform} onClick={() => markConnectorReady(conn.platform)}>
                {conn.status === 'ready' ? 'Refresh dry-run config' : 'Mark dry-run ready'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-header">
          <h3 className="card-title">Schedule Post</h3>
          <button className="btn btn-secondary" onClick={processDue} disabled={loading === 'due'}>{loading === 'due' ? 'Checking...' : 'Dry-run due posts'}</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          <select className="form-input" value={taskId} onChange={e => setTaskId(e.target.value)}>
            <option value="">Select generated video</option>
            {tasks.map(t => <option key={t.id} value={t.id}>#{t.id} · {t.mode} · {t.provider}</option>)}
          </select>
          <select className="form-input" value={platform} onChange={e => setPlatform(e.target.value)}>
            <option value="tiktok">TikTok</option>
            <option value="instagram">Instagram Reels</option>
            <option value="youtube_shorts">YouTube Shorts</option>
          </select>
          <input className="form-input" type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
        </div>
        <textarea className="form-input" rows={3} style={{ marginTop: 10 }} value={caption} onChange={e => setCaption(e.target.value)} placeholder="Post caption..." />
        <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={createPost} disabled={!taskId || !scheduledAt}>Schedule</button>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {posts.map(p => (
          <div key={p.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontWeight: 800 }}>{PLATFORM_LABELS[p.platform] || p.platform} · Task #{p.task_id}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.scheduled_at} · {p.status}</div>
              {p.output_url && <div style={{ marginTop: 4, color: 'var(--text-muted)', fontSize: 11, wordBreak: 'break-all' }}>{p.output_url}</div>}
              {p.caption && <div style={{ marginTop: 6, color: 'var(--text-secondary)', fontSize: 13 }}>{p.caption}</div>}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" onClick={() => showPreview(p.id)} disabled={loading === `preview-${p.id}`}>Preview</button>
              <button className="btn btn-primary" onClick={() => dryRunPost(p.id)} disabled={loading === `post-${p.id}`}>Dry-run</button>
              <button className="btn btn-sm" onClick={() => remove(p.id)}>Delete</button>
            </div>
          </div>
        ))}
        {posts.length === 0 && <div className="empty-state">No scheduled posts yet.</div>}
      </div>

      {preview && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-header"><h3 className="card-title">Dry-run Payload</h3></div>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', padding: 12, borderRadius: 10, background: 'var(--bg-surface)', color: 'var(--text-secondary)', fontSize: 12 }}>
            {JSON.stringify(preview, null, 2)}
          </pre>
        </div>
      )}
    </AppShell>
  );
}
